// Layer 6 orchestrator.
//
// Wires Layer 1 (entry load) -> source resolution -> Layer 2/3/4 iteration
// -> Layer 5 final render -> document.json + asset sync.

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import React from "react";
import { documentRelativePath, pageToBlock } from "../output/page-block.mjs";
import { syncPublicAssets } from "../output/public-assets.mjs";
import { collectSourceTextFiles } from "../runtime/source-text-tools.mjs";
import { pageGeometryToTheme } from "../runtime/page-geometry.mjs";
import { normalizePageGeometry } from "../runtime/page-geometry.mjs";
import { createCaptionNumberingState, numberCaptionsInHtml } from "./caption-numbering.mjs";
import { buildSectionScopedCss } from "./section-css.mjs";
import { CORE_ENTRY, createReactSsrServer, loadReactDocumentEntry } from "./document-entry.mjs";
import { buildReactMeasurementCss } from "./measurement-css.mjs";
import { buildObjectEntities } from "./object-entities.mjs";
import { resolvePageFoliosInHtml } from "./page-folio.mjs";
import { allocateChains } from "./pipeline/allocate.mjs";
import { measureFrames } from "./pipeline/frame-measurement.mjs";
import { renderFinalPress } from "./pipeline/final-render.mjs";
import { expandPressTree } from "./pipeline/press-tree.mjs";
import { resolveAllSources } from "./sources/mdx-resolver.mjs";
import { discoverComponentsInRoots, discoverSectionStyles } from "./style-discovery.mjs";

const MAX_ITERATIONS = 20;
const PRESS_TYPES = new Set(["pages", "slides"]);

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
        `OpenPress document entry ${entry.entryPath} must default-export a React component that renders one or more <Press> elements.`,
      );
    }
    validateDiscoveredPressFolders(entry);
    // Resolve PressContext + Frame markers from the engine's loaded core module.
    // Use the absolute file path so the user's `import "@open-press/core"`
    // (resolved via vite alias) and our load hit the same module cache entry.
    const coreModule = await server.ssrLoadModule(CORE_ENTRY);
    const PressContext = coreModule.PressContext;
    if (!PressContext) {
      throw new Error("Engine could not resolve PressContext from @open-press/core.");
    }

    // Discover workspace for component scope and chapter-scoped style files.
    // Pass every Press's resolved section-folders root so per-Press chapter
    // folders (e.g. press/userstory/chapters/) are all picked up — the
    // workspace can host more than one chapter root.
    const sectionRoots = collectSectionRoots(entry.presses, entry.config.paths.documentRoot);
    const workspace = await discoverSectionStyles(workspaceRoot, entry.config, { sectionRoots });
    const workspaceThemeRoots = collectWorkspaceThemeRoots(entry.presses, entry.config);
    const workspaceComponentRoots = collectWorkspaceComponentRoots(entry.presses, entry.config);
    const workspaceMediaRoots = collectWorkspaceMediaRoots(entry.presses, entry.config);
    const coreAuthorComponents = {};
    for (const name of ["MediaFigure", "ImageFigure"]) {
      if (typeof coreModule[name] === "function") coreAuthorComponents[name] = coreModule[name];
    }
    const globalComponents = {
      ...coreAuthorComponents,
      ...(await loadComponentModules(server, workspace.globalComponents ?? [])),
    };

    // Build measurement CSS once at the workspace level — shared by every
    // Press inside the Workspace.
    const measurementCss = await buildReactMeasurementCss(workspaceRoot, entry.config, workspace, {
      themeRoots: workspaceThemeRoots,
      componentRoots: workspaceComponentRoots,
    });

    // Write chapter-scoped CSS once (workspace shared). Every per-press
    // readerDocument references the same file via "/openpress/chapter-scoped.css".
    const chapterCss = await buildSectionScopedCss(workspace);
    const sharedStyles = [];
    await fs.mkdir(entry.config.paths.publicDir, { recursive: true });
    if (chapterCss.trim()) {
      await fs.writeFile(path.join(entry.config.paths.publicDir, "chapter-scoped.css"), chapterCss, "utf8");
      sharedStyles.push({
        kind: "chapter-scoped-css",
        href: "/openpress/chapter-scoped.css",
        path: "chapter-scoped.css",
      });
    }

    // Iterate every Press declared inside <Workspace>. Single-doc
    // workspaces just have length-1 here; the code path is uniform.
    const pressResults = [];
    for (const press of entry.presses) {
      const result = await exportSinglePress({
        press,
        entry,
        workspaceRoot,
        server,
        coreModule,
        PressContext,
        workspace,
        globalComponents,
        measurementCss,
        sharedStyles,
      });
      pressResults.push(result);
    }

    // Build workspace.json — one entry per Press. The reader fetches
    // this first to decide between gallery (length > 1) and direct
    // load (length 1).
    const workspaceManifest = {
      version: 1,
      name: typeof entry.workspaceProps?.name === "string" && entry.workspaceProps.name.trim()
        ? entry.workspaceProps.name.trim()
        : null,
      presses: pressResults.map((r) => ({
        slug: r.slug,
        title: r.readerDocument.meta.title,
        type: r.pressType,
        page: r.readerDocument.theme ?? null,
        pageCount: r.pageCount,
        documentUrl: r.documentUrl,
      })),
    };
    const workspacePath = path.join(entry.config.paths.publicDir, "workspace.json");
    await fs.writeFile(workspacePath, JSON.stringify(workspaceManifest, null, 2), "utf8");

    // Static search corpus — raw text of every content source file in the
    // workspace, shipped as JSON so the deployed reader can search without
    // a backend. Lives next to workspace.json so the public route can
    // GET /openpress/search-corpus.json once and grep in memory. Workspace-
    // scoped (not per-press) because most workspaces have a single Press
    // and corpus size for typical content is small (<1MB raw); per-press
    // scoping can come later if multi-Press search noise becomes a problem.
    const corpusFiles = await collectSourceTextFiles(entry.config, { scope: "content" });
    const corpus = {
      kind: "search-corpus",
      version: 1,
      files: corpusFiles.map((file) => ({
        scope: file.scope,
        file: file.name,
        path: file.relativePath,
        text: file.text,
      })),
    };
    const corpusPath = path.join(entry.config.paths.publicDir, "search-corpus.json");
    await fs.writeFile(corpusPath, JSON.stringify(corpus), "utf8");

    if (syncAssets) {
      await syncPublicAssets(workspaceRoot, entry.config.paths.publicDir, entry.config, {
        themeRoots: workspaceThemeRoots,
        componentRoots: workspaceComponentRoots,
        mediaRoots: workspaceMediaRoots,
      });
    }

    const primary = pressResults[0];
    return {
      documentPath: primary?.documentPath,
      pageCount: primary?.pageCount ?? 0,
      document: primary?.readerDocument,
      presses: pressResults,
    };
  } finally {
    await server.close();
  }
}

// Render one Press from the Workspace into its own document.json.
// Called once per <Press> child; single-doc workspaces just call this
// once with the only Press. Returns the per-press summary the
// workspace manifest is built from.
async function exportSinglePress({
  press,
  entry,
  workspaceRoot,
  server,
  coreModule,
  PressContext,
  workspace,
  globalComponents,
  measurementCss,
  sharedStyles,
}) {
  const slug = typeof press.metadata?.slug === "string" && press.metadata.slug.trim()
    ? press.metadata.slug.trim()
    : "";
  const pressType = normalizePressType(press.metadata?.type);

  // Effective config for this press: workspace config with per-press
  // metadata overlaid. Press JSX page prop wins over the workspace page.
  const effectiveConfig = applyPressOverridesToConfig(entry.config, press.metadata);
  const documentRoot = effectiveConfig.paths.documentRoot;
  const pressComponentRoots = componentRootsForPress(press, effectiveConfig);
  const pressComponents = await loadComponentModules(
    server,
    await discoverComponentsInRoots(pressComponentRoots, documentRoot, "press"),
  );
  const resolvedComponents = {
    ...globalComponents,
    ...pressComponents,
  };
  const mediaRoots = mediaRootsForPress(press, effectiveConfig);

  // Resolve sources for this press. The contract reads them from
  // <Press sources={[...]}>.
  const sourcesRecord = press.sources ?? {};
  const { resolved: sources, renderData: renderRegistry } = await resolveAllSources({
    sources: sourcesRecord,
    documentRoot,
    globalComponents: resolvedComponents,
  });

  // Component the render pipeline drives. Press elements are captured by
  // inspection, then wrapped in a thin function component.
  const PressComponent = () => press.element;

  // Iterative allocation loop (identical to v0.x — paginates until the
  // hints stabilise).
  let hints = null;
  let allocation = null;
  let lastFrames = null;
  let warnings = [];
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const { html, frames } = expandPressTree({
      Press: PressComponent,
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
      css: measurementCss,
      baseHref: pathToFileURL(`${documentRoot}${path.sep}`).href,
      mediaDir: mediaRoots,
      captionNumbering: effectiveConfig.captionNumbering,
    });
    const alloc = allocateChains({
      frames,
      mdxAreas: measurement.mdxAreas,
      blockHeights: measurement.blockHeights,
      sources,
    });
    if (process.env.OPENPRESS_DEBUG_ALLOC) {
      const sample = measurement.mdxAreas
        .slice(0, 5)
        .map((a) => `${a.frameKey}#${a.indexInFrame} cap=${a.capacity.toFixed(0)} raw=${(a.rawHeight ?? 0).toFixed(0)}`);
      const blocks = measurement.blockHeights
        .slice(0, 8)
        .map((b) => `${b.id} h=${b.height.toFixed(0)}`);
      process.stderr.write(`[allocator press=${slug || "(missing-slug)"} iter ${iteration}]\n`);
      process.stderr.write(`  mdxAreas[0..4]: ${sample.join(" | ")}\n`);
      process.stderr.write(`  blocks[0..7]:   ${blocks.join(" | ")}\n`);
      process.stderr.write(`  hints:          ${JSON.stringify(alloc.hints.totalPagesPerChain)}\n`);
      if (alloc.warnings.length > 0) {
        process.stderr.write(`  warnings:       ${JSON.stringify(alloc.warnings)}\n`);
      }
    }
    if (hintsEqual(hints, alloc.hints)) {
      allocation = alloc.allocation;
      warnings = alloc.warnings;
      break;
    }
    hints = alloc.hints;
  }
  if (allocation == null) {
    throw new Error(
      `Allocation did not converge after ${MAX_ITERATIONS} iterations (press="${slug || "(missing-slug)"}"). ` +
        `This usually means a chain keeps growing without fitting; check MdxArea capacities and block heights.`,
    );
  }

  const toc = buildTocContext({ sources, frames: lastFrames ?? [], allocation });

  const final = await renderFinalPress({
    Press: PressComponent,
    PressContext,
    sources,
    hints,
    toc,
    allocation,
    renderRegistry,
  });

  // Build the reader's document.json. Same shape as v0.x; the only
  // change is metadata.title comes from the per-press Press JSX prop.
  const blockMap = {};
  const captionState = createCaptionNumberingState();
  const totalFrames = final.frames.length;
  const pressSourcePath = sourcePathForPress({ entry, slug });
  const blocks = final.frames.map((frame, index) => {
    const source = {
      file: path.basename(pressSourcePath),
      path: pressSourcePath,
      kind: frame.role ?? "manuscript.content",
      slug: frame.frameKey,
      sectionIndex: index + 1,
    };
    const numberedHtml = numberCaptionsInHtml(frame.html, effectiveConfig.captionNumbering, captionState);
    const html = resolvePageFoliosInHtml(numberedHtml, { pageIndex: index, totalPages: totalFrames });
    for (const id of collectFrameBlockIds(frame.blockIds, html)) {
      blockMap[id] = { id, pageIndex: index, pageNumber: index + 1, frameKey: frame.frameKey };
    }
    const block = pageToBlock(index, html, source, effectiveConfig, {
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

  const objectEntities = buildObjectEntities({
    frames: final.frames.map((frame, index) => ({ ...frame, pageIndex: index })),
    blocks,
    blockMap,
  });

  const readerDocument = {
    meta: {
      title: trimmedString(effectiveConfig.title) ?? "Untitled Document",
      type: pressType,
      subtitle: trimmedString(effectiveConfig.subtitle) ?? "",
      organization: trimmedString(effectiveConfig.organization) ?? "",
      workspaceLabel: trimmedString(effectiveConfig.workspaceLabel) ?? "",
      version: "openpress-press-tree-v1",
    },
    theme: pageGeometryToTheme(effectiveConfig.page),
    source: {
      type: "openpress-press-tree-mdx",
      contentDir: documentRelativePath(effectiveConfig, effectiveConfig.sourceDir),
      editable: true,
      editMode: "source-mdx",
      styles: sharedStyles,
      blockMap,
      objectEntities,
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

  if (!slug) {
    throw new Error("<Press slug> is required. Folder-convention workspaces write to /openpress/<slug>/document.json.");
  }
  const pressOutputDir = path.join(effectiveConfig.paths.publicDir, slug);
  await fs.mkdir(pressOutputDir, { recursive: true });
  const documentPath = path.join(pressOutputDir, "document.json");
  await fs.writeFile(documentPath, JSON.stringify(readerDocument, null, 2), "utf8");

  return {
    slug,
    pressType,
    documentPath,
    documentUrl: `/openpress/${slug}/document.json`,
    readerDocument,
    pageCount: blocks.length,
  };
}

function normalizePressType(value) {
  if (value === undefined || value === null || value === "") return "pages";
  if (PRESS_TYPES.has(value)) return value;
  throw new Error(
    `Unsupported Press type "${value}". Supported types: ${[...PRESS_TYPES].join(", ")}.`,
  );
}

// Apply per-Press JSX prop overrides onto the workspace-level config.
// Returns a new config object — the original is untouched so other
// presses in the same workspace get a clean base.
function applyPressOverridesToConfig(workspaceConfig, pressMetadata) {
  if (!pressMetadata) return workspaceConfig;
  const out = { ...workspaceConfig };
  if (pressMetadata.title) out.title = pressMetadata.title;
  if (pressMetadata.page !== undefined) {
    out.page = normalizePageGeometry(pressMetadata.page);
  }
  if (pressMetadata.captionNumbering !== undefined) {
    out.captionNumbering = { ...workspaceConfig.captionNumbering, ...pressMetadata.captionNumbering };
  }
  return out;
}

function collectWorkspaceComponentRoots(presses, config) {
  return uniquePaths(presses.flatMap((press) => componentRootsForPress(press, config)));
}

function collectWorkspaceThemeRoots(presses, config) {
  return uniquePaths(presses.flatMap((press) => themeRootsForPress(press, config)));
}

function collectWorkspaceMediaRoots(presses, config) {
  return uniquePaths(presses.flatMap((press) => mediaRootsForPress(press, config)));
}

function themeRootsForPress(press, config) {
  const documentRoot = config.paths.documentRoot;
  const folder = pressFolderName(press);
  const roots = [];
  if (folder) roots.push(path.join(documentRoot, folder, "theme"));
  roots.push(...declaredRoots(press.metadata?.theme, config, folder, "theme"));
  return uniquePaths(roots);
}

function componentRootsForPress(press, config) {
  const documentRoot = config.paths.documentRoot;
  const folder = pressFolderName(press);
  const roots = [
    config.paths.componentsDir,
  ];
  if (folder) roots.push(path.join(documentRoot, folder, "components"));
  roots.push(...declaredRoots(press.metadata?.componentsDir, config, folder, "componentsDir"));
  return uniquePaths(roots);
}

function mediaRootsForPress(press, config) {
  const documentRoot = config.paths.documentRoot;
  const folder = pressFolderName(press);
  const roots = [
    config.paths.mediaDir,
  ];
  if (folder) roots.push(path.join(documentRoot, folder, "media"));
  roots.push(...declaredRoots(press.metadata?.mediaDir, config, folder, "mediaDir"));
  return uniquePaths(roots);
}

function declaredRoots(value, config, folder, propName) {
  return pathList(value).map((entry) => resolvePressPath(entry, config, folder, propName));
}

function resolvePressPath(value, config, folder, propName) {
  const raw = String(value).trim();
  if (!raw) return null;
  const documentRoot = config.paths.documentRoot;
  const pressRoot = folder ? path.join(documentRoot, folder) : documentRoot;
  const base = raw === "." || raw.startsWith("./") || raw.startsWith("../") ? pressRoot : documentRoot;
  const absolutePath = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(base, raw);
  const relative = path.relative(documentRoot, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`<Press ${propName}> path must stay inside press/: ${raw}`);
  }
  return absolutePath;
}

function pathList(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string");
  return [];
}

function pressFolderName(press) {
  const slug = typeof press.metadata?.slug === "string" ? press.metadata.slug.trim() : "";
  if (!slug || slug.includes("/") || slug.includes("\\") || slug === "." || slug === "..") return "";
  return slug;
}

function validateDiscoveredPressFolders(entry) {
  const folders = Array.isArray(entry.pressFolders) ? entry.pressFolders : [];
  if (folders.length === 0) return;
  if (entry.presses.length !== folders.length) {
    throw new Error(
      `OpenPress found ${folders.length} press folder(s) but ${entry.presses.length} <Press> element(s). ` +
        `Each press/<name>/press.tsx must render exactly one <Press>.`,
    );
  }
  for (const [index, folder] of folders.entries()) {
    const slug = typeof entry.presses[index]?.metadata?.slug === "string"
      ? entry.presses[index].metadata.slug.trim()
      : "";
    if (!slug) {
      throw new Error(`press/${folder}/press.tsx must declare <Press slug="${folder}">.`);
    }
    if (slug !== folder) {
      throw new Error(`press/${folder}/press.tsx declares slug="${slug}", but folder-convention slugs must match the folder name.`);
    }
  }
}

function uniquePaths(paths) {
  const out = [];
  const seen = new Set();
  for (const candidate of paths ?? []) {
    if (!candidate) continue;
    const normalized = path.resolve(candidate);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
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

function collectFrameBlockIds(allocatedIds, html) {
  const ids = new Set(allocatedIds ?? []);
  const pattern = /\sdata-openpress-block-id="([^"]+)"/g;
  let match;
  while ((match = pattern.exec(String(html ?? "")))) {
    if (match[1]) ids.add(match[1]);
  }
  return ids;
}

function sourcePathForPress({ slug }) {
  return `press/${slug}/press.tsx`;
}

function buildTocContext({ sources, frames, allocation }) {
  const toc = {};
  for (const source of Object.values(sources)) {
    for (const [tocChainId, tocBlocks] of Object.entries(source.chains).filter(([chainId]) => chainId.startsWith(`toc:${source.id}`))) {
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
        pageNumber: firstAllocatedPageNumberForBlock(frames, allocation, block.targetBlockId)
          ?? firstAllocatedPageNumber(frames, allocation, `${source.id}:${block.sectionSlug}`),
      }));
    }
  }
  return toc;
}

function firstAllocatedPageNumberForBlock(frames, allocation, blockId) {
  if (!blockId) return undefined;
  for (let index = 0; index < frames.length; index += 1) {
    const frameAllocation = allocation?.[frames[index].frameKey] ?? {};
    for (const areaArr of Object.values(frameAllocation)) {
      if (areaArr?.some((area) => Array.isArray(area) && area.includes(blockId))) return index + 1;
    }
  }
  return undefined;
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

// Walk every Press's mdxSource descriptors and collect the absolute
// path each section-folders root resolves to. discoverSectionStyles
// iterates these to find section-scoped CSS across a multi-Press
// workspace where chapters live under per-Press subfolders.
function collectSectionRoots(presses, documentRoot) {
  const roots = new Set();
  for (const press of presses ?? []) {
    const sources = press?.sources;
    if (!sources || typeof sources !== "object") continue;
    for (const descriptor of Object.values(sources)) {
      if (descriptor?.type !== "mdx") continue;
      if (descriptor?.preset !== "section-folders") continue;
      const rel = typeof descriptor.root === "string" && descriptor.root.trim()
        ? descriptor.root.trim()
        : "chapters";
      roots.add(path.resolve(documentRoot, rel));
    }
  }
  return [...roots];
}
