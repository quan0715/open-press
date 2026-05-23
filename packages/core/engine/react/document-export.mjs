// Layer 6 orchestrator.
//
// Wires Layer 1 (entry load) -> source resolution -> Layer 2/3/4 iteration
// -> Layer 5 final render -> document.json + asset sync.

import fs from "node:fs/promises";
import path from "node:path";
import { documentRelativePath, pageToBlock } from "../output/page-block.mjs";
import { syncPublicAssets } from "../output/public-assets.mjs";
import { buildSectionScopedCss } from "./section-css.mjs";
import { CORE_ENTRY, createReactSsrServer, loadReactDocumentEntry } from "./document-entry.mjs";
import { buildReactMeasurementCss } from "./measurement-css.mjs";
import { allocateChains } from "./pipeline/allocate.mjs";
import { measureFrames } from "./pipeline/frame-measurement.mjs";
import { renderFinalPress } from "./pipeline/final-render.mjs";
import { expandPressTree } from "./pipeline/press-tree.mjs";
import { resolveAllSources } from "./sources/mdx-resolver.mjs";
import { discoverSectionStyles } from "./style-discovery.mjs";

const MAX_ITERATIONS = 20;

export async function exportReactDocument(root = ".", { syncAssets = true } = {}) {
  const workspaceRoot = path.resolve(root);
  // Quick existence check without opening an SSR server.
  const fastCheck = await loadReactDocumentEntry(workspaceRoot);
  if (!fastCheck) return null;

  const server = await createReactSsrServer(workspaceRoot);
  try {
    // Reload the entry through THIS server so the module identity matches
    // what the rest of the pipeline (PressContext, hooks) sees.
    const entry = await loadReactDocumentEntry(workspaceRoot, { server });
    if (!entry) return null;
    if (!entry.Press) {
      throw new Error(
        `OpenPress document entry ${entry.entryPath} must default-export a Press component (function) to export. ` +
          `Legacy named exports (cover/toc/backCover) are not supported in v0.6 — see the Press Tree spec.`,
      );
    }
    // Resolve PressContext + Frame markers from the engine's loaded core module.
    // Use the absolute file path so the user's `import "@open-press/core"`
    // (resolved via vite alias) and our load hit the same module cache entry.
    const coreModule = await server.ssrLoadModule(CORE_ENTRY);
    const PressContext = coreModule.PressContext;
    if (!PressContext) {
      throw new Error("Engine could not resolve PressContext from @open-press/core.");
    }

    // Discover workspace for component scope and chapter-scoped style files.
    const workspace = await discoverSectionStyles(workspaceRoot, entry.config);
    const globalComponents = await loadComponentModules(server, workspace.globalComponents ?? []);

    // Resolve sources.
    const documentRoot = entry.config.paths.documentRoot;
    const { resolved: sources, renderData: renderRegistry } = await resolveAllSources({
      sources: entry.sources,
      documentRoot,
      globalComponents,
    });

    // Build measurement CSS.
    const css = await buildReactMeasurementCss(workspaceRoot, entry.config, workspace);

    // Iterative allocation loop.
    let hints = null;
    let allocation = null;
    let lastFrames = null;
    let warnings = [];
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const { html, frames } = expandPressTree({
        Press: entry.Press,
        PressContext,
        sources,
        hints,
      });
      lastFrames = frames;
      validateAllChainsKnown(frames, sources);
      const measurement = await measureFrames({
        pressHtml: html,
        sources,
        renderRegistry,
        css,
      });
      const alloc = allocateChains({
        frames,
        mdxAreas: measurement.mdxAreas,
        blockHeights: measurement.blockHeights,
        sources,
      });
      if (hintsEqual(hints, alloc.hints)) {
        allocation = alloc.allocation;
        warnings = alloc.warnings;
        break;
      }
      hints = alloc.hints;
    }
    if (allocation == null) {
      throw new Error(
        `Allocation did not converge after ${MAX_ITERATIONS} iterations. ` +
          `This usually means a chain keeps growing without fitting; check MdxArea capacities and block heights.`,
      );
    }

    const toc = buildTocContext({ sources, frames: lastFrames ?? [], allocation });

    // Final render.
    const final = await renderFinalPress({
      Press: entry.Press,
      PressContext,
      sources,
      hints,
      toc,
      allocation,
      renderRegistry,
    });

    // Write chapter-scoped CSS (under section-scoped rules but filename
    // unchanged for now).
    const chapterCss = await buildSectionScopedCss(workspace);
    const styles = [];
    await fs.mkdir(entry.config.paths.publicDir, { recursive: true });
    if (chapterCss.trim()) {
      await fs.writeFile(path.join(entry.config.paths.publicDir, "chapter-scoped.css"), chapterCss, "utf8");
      styles.push({
        kind: "chapter-scoped-css",
        href: "/openpress/chapter-scoped.css",
        path: "chapter-scoped.css",
      });
    }

    // Build document.json. The reader filters blocks by kind === "htmlPage",
    // so wrap each frame through `pageToBlock` to inherit that contract.
    const blockMap = {};
    const blocks = final.frames.map((frame, index) => {
      for (const id of frame.blockIds) {
        blockMap[id] = { id, pageIndex: index, pageNumber: index + 1 };
      }
      const source = {
        file: "index.tsx",
        path: "document/index.tsx",
        kind: frame.role ?? "manuscript.content",
        slug: frame.frameKey,
        sectionIndex: index + 1,
      };
      const block = pageToBlock(index, frame.html, source, entry.config, {
        idPrefix: "openpress-page",
        anchorPrefix: "page",
        titleFallback: "Page",
      });
      return {
        ...block,
        frameKey: frame.frameKey,
        role: frame.role ?? null,
        chrome: frame.chrome ?? true,
        blockIds: frame.blockIds,
      };
    });

    // Enrich blockMap with source records from resolved chains so comment
    // tooling can resolve block IDs back to MDX positions.
    const sourceBlockIndex = buildSourceBlockIndex(sources);
    for (const id of Object.keys(blockMap)) {
      const sourceRecord = sourceBlockIndex.get(id);
      if (sourceRecord) {
        blockMap[id] = {
          ...blockMap[id],
          kind: sourceRecord.kind,
          name: sourceRecord.name,
          path: sourceRecord.path,
          source: sourceRecord.source,
          chainId: sourceRecord.chainId,
          sectionSlug: sourceRecord.sectionSlug,
        };
      }
    }

    const readerDocument = {
      meta: {
        title: trimmedString(entry.config.title) ?? "Untitled Document",
        subtitle: trimmedString(entry.config.subtitle) ?? "",
        organization: trimmedString(entry.config.organization) ?? "",
        workspaceLabel: trimmedString(entry.config.workspaceLabel) ?? trimmedString(entry.config.title) ?? "Untitled Document",
        version: "openpress-press-tree-v1",
      },
      source: {
        type: "openpress-press-tree-mdx",
        contentDir: documentRelativePath(entry.config, entry.config.sourceDir),
        editable: true,
        editMode: "source-mdx",
        styles,
        blockMap,
        frames: final.frames.map((frame, index) => ({
          frameKey: frame.frameKey,
          role: frame.role ?? null,
          pageIndex: index,
          mdxAreas: frame.mdxAreas.map((area) => ({
            chainId: area.chainId,
            indexInFrame: area.indexInFrame,
            blockIds: area.blockIds,
          })),
        })),
        chains: Object.keys(sources).flatMap((id) => Object.keys(sources[id].chains)),
        warnings,
      },
      blocks,
    };

    const documentPath = path.join(entry.config.paths.publicDir, "document.json");
    await fs.writeFile(documentPath, JSON.stringify(readerDocument, null, 2), "utf8");

    if (syncAssets) {
      await syncPublicAssets(workspaceRoot, entry.config.paths.publicDir, entry.config);
    }

    return { documentPath, pageCount: blocks.length, document: readerDocument };
  } finally {
    await server.close();
  }
}

async function loadComponentModules(server, components) {
  const out = {};
  for (const component of components) {
    const mod = await server.ssrLoadModule(component.absolutePath);
    if (typeof mod.default !== "function") {
      throw new Error(
        `OpenPress component module ${component.documentPath} must default-export a React component.`,
      );
    }
    out[component.name] = mod.default;
  }
  return out;
}

function validateAllChainsKnown(frames, sources) {
  const known = new Set();
  for (const source of Object.values(sources)) {
    for (const chainId of Object.keys(source.chains)) known.add(chainId);
  }
  for (const frame of frames) {
    for (const area of frame.mdxAreas) {
      if (!known.has(area.chainId)) {
        const list = [...known].sort().slice(0, 10).join(", ");
        throw new Error(
          `Unknown chainId "${area.chainId}" referenced by frame "${frame.frameKey}". ` +
            `Known chains: ${list || "(none)"}${known.size > 10 ? ", ..." : ""}.`,
        );
      }
    }
  }
}

function hintsEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const aMap = a.totalPagesPerChain ?? {};
  const bMap = b.totalPagesPerChain ?? {};
  const keys = new Set([...Object.keys(aMap), ...Object.keys(bMap)]);
  for (const key of keys) {
    if (aMap[key] !== bMap[key]) return false;
  }
  return true;
}

function buildSourceBlockIndex(sources) {
  const index = new Map();
  for (const source of Object.values(sources)) {
    for (const [chainId, blocks] of Object.entries(source.chains)) {
      for (const block of blocks) {
        index.set(block.id, { ...block, chainId });
      }
    }
  }
  return index;
}

function buildTocContext({ sources, frames, allocation }) {
  const toc = {};
  for (const source of Object.values(sources)) {
    const tocChainId = `toc:${source.id}`;
    const tocBlocks = source.chains[tocChainId] ?? [];
    if (tocBlocks.length === 0) continue;
    toc[tocChainId] = tocBlocks.map((block) => ({
      id: `${source.id}:${block.sectionSlug}`,
      blockId: block.id,
      sourceId: source.id,
      sectionSlug: block.sectionSlug,
      title: block.title,
      href: block.href,
      level: block.level,
      label: block.label,
      pageNumber: firstAllocatedPageNumber(frames, allocation, `${source.id}:${block.sectionSlug}`),
    }));
  }
  return toc;
}

function firstAllocatedPageNumber(frames, allocation, chainId) {
  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    const allocated = allocation?.[frame.frameKey]?.[chainId];
    if (allocated?.some((area) => Array.isArray(area) && area.length > 0)) return index + 1;
  }
  for (let index = 0; index < frames.length; index += 1) {
    if (frames[index].mdxAreas.some((area) => area.chainId === chainId)) return index + 1;
  }
  return undefined;
}

function trimmedString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
