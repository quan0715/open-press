// MDX source resolver — Layer 1 of the Press pipeline.
//
// Takes a normalized `mdxSource()` descriptor and produces:
//   1. A public `ResolvedSource` consumed by `useSource()` in user code.
//   2. A private `RenderRegistry` consumed by Layer 5 to render specific
//      block-id subsets into React nodes.
//
// Both halves come from the same MDX compile so block IDs stay consistent.

import fs from "node:fs/promises";
import path from "node:path";
import React from "react";
import { documentRelativePath, resolveDocumentRelativePath } from "../../runtime/path-utils.mjs";
import { compileMdx } from "../mdx-compile.mjs";
import { createHeadingState, headingAttributesForBlock, sectionTitleOutlineItems } from "./heading-numbering.mjs";

const MDX_EXT = ".mdx";

/**
 * Resolve all sources registered in `press/<slug>/press.tsx`.
 *
 * @param {object} opts
 * @param {Record<string, object>} opts.sources         The raw `sources` export.
 * @param {string}                 opts.documentRoot    Absolute path to document/.
 * @param {Record<string, Function>} opts.globalComponents Pre-resolved global components.
 * @returns {Promise<{ resolved: Record<string, object>, renderData: Map<string, object> }>}
 */
export async function resolveAllSources({ sources, documentRoot, globalComponents }) {
  validateSourcesShape(sources);

  const resolved = {};
  const renderData = new Map();

  for (const [sourceId, descriptor] of Object.entries(sources)) {
    validateSourceKey(sourceId);
    const { resolved: source, renderData: rd } = await resolveSource({
      sourceId,
      descriptor,
      documentRoot,
      globalComponents,
    });
    resolved[sourceId] = source;
    renderData.set(sourceId, rd);
  }

  return { resolved, renderData };
}

async function resolveSource({ sourceId, descriptor, documentRoot, globalComponents }) {
  if (!descriptor || typeof descriptor !== "object") {
    throw new Error(`Source "${sourceId}" descriptor must be an object.`);
  }
  if (descriptor.type !== "mdx") {
    throw new Error(`Source "${sourceId}" type must be "mdx" in v0.6. Got "${descriptor.type}".`);
  }

  const sections = await collectSections({ descriptor, documentRoot, sourceId });

  const tree = [];
  const outline = [];
  const chains = {};
  const files = [];
  const sectionRenderData = new Map();

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const section = sections[sectionIndex];
    const chainId = `${sourceId}:${section.slug}`;
    const blocks = [];
    const fileRenderData = [];
    const outlineItems = [];
    const chapterNumber = sectionIndex + 1;
    const chapterLabel = String(chapterNumber).padStart(2, "0");
    let resolvedSectionTitle = section.title ?? section.slug;
    const headingState = createHeadingState();

    for (const file of section.files) {
      const source = await fs.readFile(file.absolutePath, "utf8");
      const compiled = await compileMdx({
        source,
        filePath: file.absolutePath,
        components: globalComponents,
        chapterSlug: section.slug,
      });

      const fileBlockIds = [];
      const fileBlockAttributes = {};
      for (const block of compiled.blocks) {
        const headingAttributes = headingAttributesForBlock({
          block,
          sourceId,
          section,
          outlineItems,
          chapterNumber,
          chapterLabel,
          headingState,
        });
        if (headingAttributes) {
          fileBlockAttributes[block.id] = headingAttributes.attributes;
          if (headingAttributes.sectionTitle) resolvedSectionTitle = headingAttributes.sectionTitle;
        }

        const record = {
          id: block.id,
          kind: block.kind,
          name: block.name,
          text: block.text,
          layout: block.layout,
          pagination: block.pagination,
          tableId: block.tableId,
          rowIndex: block.rowIndex,
          listId: block.listId,
          listTag: block.listTag,
          itemIndex: block.itemIndex,
          chainId,
          sectionSlug: section.slug,
          path: documentRelative(file.absolutePath, documentRoot),
          source: {
            file: path.basename(file.absolutePath),
            line: block.source?.line,
            column: block.source?.column,
            endLine: block.source?.endLine,
            endColumn: block.source?.endColumn,
          },
        };
        blocks.push(record);
        fileBlockIds.push(block.id);
      }

      files.push({
        path: documentRelative(file.absolutePath, documentRoot),
        absolutePath: file.absolutePath,
        sectionSlug: section.slug,
      });

      fileRenderData.push({
        filePath: file.absolutePath,
        source,
        blockIds: fileBlockIds,
        blockAttributes: fileBlockAttributes,
      });
    }

    chains[chainId] = blocks;
    tree.push({
      id: section.slug,
      slug: section.slug,
      title: resolvedSectionTitle,
      meta: section.meta ?? {},
    });
    outline.push(...(outlineItems.length > 0 ? outlineItems : sectionTitleOutlineItems({
      sourceId,
      section,
      chapterLabel,
      title: resolvedSectionTitle,
      blocks,
    })));

    sectionRenderData.set(section.slug, {
      slug: section.slug,
      chainId,
      contents: fileRenderData,
    });
  }

  const tocChainId = `toc:${sourceId}`;
  const tocBlocks = outline.map((item) => ({
    id: item.tocId,
    kind: "toc-entry",
    name: "toc-entry",
    chainId: tocChainId,
    sectionSlug: item.sectionSlug,
    targetBlockId: item.blockId,
    path: "index.tsx",
    source: {
      file: "index.tsx",
    },
    title: item.title,
    href: item.href,
    level: item.depth <= 0 ? 2 : 3,
    label: item.label,
  }));
  const h2TocChainId = `${tocChainId}:h2`;
  const h2TocBlocks = tocBlocks.filter((block) => block.level <= 2);
  chains[tocChainId] = tocBlocks;
  chains[h2TocChainId] = h2TocBlocks;

  return {
    resolved: {
      id: sourceId,
      type: "mdx",
      tree,
      outline,
      chains,
      files,
    },
    renderData: {
      sourceId,
      sections: sectionRenderData,
      tocChains: new Map([[tocChainId, tocBlocks], [h2TocChainId, h2TocBlocks]]),
      globalComponents,
    },
  };
}

async function collectSections({ descriptor, documentRoot, sourceId }) {
  if (descriptor.preset === "section-folders") {
    const root = resolveDocumentRelativePath(documentRoot, descriptor.root ?? "chapters", `Source "${sourceId}" section-folders root`);
    return collectSectionFolders(root);
  }
  if (descriptor.preset === "section-files") {
    const root = resolveDocumentRelativePath(documentRoot, descriptor.root ?? "content", `Source "${sourceId}" section-files root`);
    return collectSectionFiles(root);
  }
  if (descriptor.preset === "file-list") {
    return collectFileList(descriptor.files, documentRoot, sourceId);
  }
  throw new Error(`Source "${sourceId}" has unknown preset "${descriptor.preset}".`);
}

async function collectSectionFolders(root) {
  const entries = await readDir(root);
  const dirs = entries.filter((e) => e.isDirectory()).sort(compareOrderPrefix);
  const sections = [];
  for (const dir of dirs) {
    const dirPath = path.join(root, dir.name);
    const contentDir = path.join(dirPath, "content");
    const mdxFiles = await listMdxFiles(contentDir);
    if (mdxFiles.length === 0) continue;
    sections.push({
      slug: stripOrderPrefix(dir.name),
      title: deriveTitleFromDirName(dir.name),
      files: mdxFiles.map((name) => ({ absolutePath: path.join(contentDir, name) })),
    });
  }
  return sections;
}

async function collectSectionFiles(root) {
  const files = await listMdxFiles(root);
  return files.map((name) => ({
    slug: stripOrderPrefix(stripExtension(name)),
    title: deriveTitleFromDirName(stripExtension(name)),
    files: [{ absolutePath: path.join(root, name) }],
  }));
}

async function collectFileList(filePaths, documentRoot, sourceId) {
  const sections = [];
  const slugs = new Set();
  for (const rel of filePaths) {
    if (typeof rel !== "string" || !rel.trim()) {
      throw new Error(`Source "${sourceId}" file-list contains an empty or invalid entry.`);
    }
    const norm = rel.replace(/^[./]+/, "");
    if (rel.includes("..")) {
      throw new Error(`Source "${sourceId}" file-list path "${rel}" contains "..", rejected.`);
    }
    if (!rel.endsWith(MDX_EXT)) {
      throw new Error(`Source "${sourceId}" file-list path "${rel}" must end with .mdx.`);
    }
    const absolute = path.resolve(documentRoot, rel);
    const relCheck = path.relative(documentRoot, absolute);
    if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) {
      throw new Error(`Source "${sourceId}" file-list path "${rel}" escapes the document root.`);
    }
    const slug = stripOrderPrefix(stripExtension(path.basename(rel)));
    if (slugs.has(slug)) {
      throw new Error(`Source "${sourceId}" file-list produces duplicate section slug "${slug}".`);
    }
    slugs.add(slug);
    sections.push({
      slug,
      title: deriveTitleFromDirName(stripExtension(path.basename(rel))),
      files: [{ absolutePath: absolute }],
    });
  }
  return sections;
}

// ---------------------------------------------------------------------------
// Layer 5 helper — render specific blocks for a chain
// ---------------------------------------------------------------------------

/**
 * For a chain, given the block IDs to include, return a list of React nodes
 * to inject into MdxArea(s).
 *
 * @returns {Promise<Array<{ Content: React.FC, blockIds: string[] }>>}
 *   One entry per source file participating in the chain. Caller can wrap
 *   each Content in a fragment or distribute across MdxAreas.
 */
export async function compileChainBlocks({ renderData, chainId, blockIds, toc = null }) {
  const ids = new Set(blockIds);
  if (ids.size === 0) return [];
  const tocBlocks = renderData?.tocChains?.get(chainId);
  if (tocBlocks) {
    return compileTocBlocks({ tocBlocks, chainId, blockIds, toc });
  }
  const section = locateSection(renderData, chainId);
  const out = [];
  for (const fileData of section.contents) {
    const fileIds = fileData.blockIds.filter((id) => ids.has(id));
    if (fileIds.length === 0) continue;
    const compiled = await compileMdx({
      source: fileData.source,
      filePath: fileData.filePath,
      components: renderData.globalComponents,
      chapterSlug: section.slug,
      includeBlockIds: fileIds,
      blockAttributes: fileData.blockAttributes,
    });
    out.push({ Content: compiled.Content, blockIds: fileIds });
  }
  return out;
}

function compileTocBlocks({ tocBlocks, chainId, blockIds, toc }) {
  const ids = new Set(blockIds);
  const pageNumberByBlockId = new Map();
  for (const entry of toc?.[chainId] ?? []) {
    pageNumberByBlockId.set(entry.blockId, entry.pageNumber);
  }
  const selected = tocBlocks.filter((block) => ids.has(block.id));
  return selected.map((block) => ({
    Content: function TocEntry() {
      const pageNumber = pageNumberByBlockId.get(block.id);
      const pageLabel = Number.isFinite(pageNumber) ? String(pageNumber).padStart(2, "0") : "00";
      const className = tocEntryClass(block.level);
      return React.createElement(
        "li",
        {
          className,
          "data-openpress-block-id": block.id,
          "data-openpress-object-id": createBlockObjectEntityId(block.id),
          "data-openpress-toc-entry": block.sectionSlug,
        },
        React.createElement(
          "a",
          {
            className: TOC_LINK_CLASS,
            href: block.href,
            "data-openpress-anchor": block.href.replace(/^#/, ""),
            "data-openpress-target-page-index": Number.isFinite(pageNumber) ? String(pageNumber - 1) : undefined,
          },
          React.createElement("span", { className: TOC_INDEX_CLASS, "data-toc-index": block.label }, block.label),
          React.createElement("span", { className: TOC_TITLE_CLASS }, block.title),
          React.createElement("span", { className: TOC_PAGE_CLASS }, pageLabel),
        ),
      );
    },
    blockIds: [block.id],
  }));
}

const TOC_ENTRY_BASE_CLASS = "border-b-0";
const TOC_ENTRY_LEVEL_2_CLASS = [
  "toc-level-2",
  TOC_ENTRY_BASE_CLASS,
  "[&>a]:mt-[2mm] first:[&>a]:mt-0",
  "[&>a]:border-t [&>a]:border-[rgba(169,180,194,0.42)] first:[&>a]:border-t-0",
  "[&>a]:pb-[1.5mm] [&>a]:pt-[2.4mm]",
  "[&_.toc-title]:text-[12pt] [&_.toc-title]:font-medium [&_.toc-title]:text-[var(--openpress-color-ink)]",
  "[&_.toc-title]:after:content-none",
  "[&_.toc-page]:text-[9.8pt] [&_.toc-page]:text-[var(--openpress-color-ink)]",
].join(" ");
const TOC_ENTRY_LEVEL_3_CLASS = [
  "toc-level-3",
  TOC_ENTRY_BASE_CLASS,
  "[&>a]:py-[1mm] [&>a]:pl-[7mm]",
  "[&>a]:text-[10pt] [&>a]:text-[var(--openpress-color-muted)]",
  "[&>a]:[grid-template-columns:9mm_minmax(0,1fr)_12mm]",
  "[&_.toc-index]:text-[9pt]",
  "[&_.toc-page]:text-[9.5pt]",
].join(" ");
const TOC_LINK_CLASS = [
  "grid items-baseline gap-x-[3mm] py-[1.6mm]",
  "[grid-template-columns:9mm_minmax(0,1fr)_12mm]",
  "[font-family:var(--openpress-font-serif)] font-normal leading-[1.38]",
  "text-[var(--openpress-color-ink)] no-underline",
].join(" ");
const TOC_INDEX_CLASS = [
  "toc-index inline-block text-left",
  "[font-family:var(--openpress-font-mono)] text-[9.5pt] font-normal tracking-normal",
  "text-[var(--openpress-color-muted)] [font-variant-numeric:tabular-nums]",
].join(" ");
const TOC_TITLE_CLASS = [
  "toc-title flex items-baseline gap-[3mm]",
  "[font-family:var(--openpress-font-serif)] text-[var(--openpress-color-ink)]",
  "after:min-w-[10mm] after:flex-1 after:translate-y-[-0.22em]",
  "after:border-b after:border-dotted after:border-[rgba(72,101,129,0.32)] after:content-['']",
].join(" ");
const TOC_PAGE_CLASS = [
  "toc-page min-w-[10mm] justify-self-end text-right",
  "[font-family:var(--openpress-font-mono)] text-[9.8pt] font-normal",
  "text-[var(--openpress-color-muted)] [font-variant-numeric:tabular-nums]",
].join(" ");

function tocEntryClass(level) {
  return level === 3 ? TOC_ENTRY_LEVEL_3_CLASS : TOC_ENTRY_LEVEL_2_CLASS;
}

function locateSection(renderData, chainId) {
  if (!renderData) {
    throw new Error(`No render data for chainId "${chainId}".`);
  }
  for (const section of renderData.sections.values()) {
    if (section.chainId === chainId) return section;
  }
  throw new Error(`No section found for chainId "${chainId}" in source "${renderData.sourceId}".`);
}

function createObjectEntityId(kind, ...parts) {
  return [kind, ...parts.map((part) => encodeURIComponent(String(part)))].join(":");
}

function createBlockObjectEntityId(blockId) {
  return createObjectEntityId("mdx-block", blockId);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const SOURCE_KEY_RE = /^[a-z][a-z0-9-]*$/;

function validateSourcesShape(sources) {
  if (sources == null) return;
  if (typeof sources !== "object" || Array.isArray(sources)) {
    throw new Error("`export const sources` must be an object literal of sourceId -> descriptor.");
  }
}

function validateSourceKey(sourceId) {
  if (!SOURCE_KEY_RE.test(sourceId)) {
    throw new Error(
      `Source key "${sourceId}" is invalid. Source keys must match /^[a-z][a-z0-9-]*$/ ` +
        `(lowercase letter, then lowercase letters, digits, or hyphens). ` +
        `Colons are reserved for chain ID separators.`,
    );
  }
}

// ---------------------------------------------------------------------------
// IO helpers
// ---------------------------------------------------------------------------

async function readDir(dir) {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function listMdxFiles(dir) {
  const entries = await readDir(dir);
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(MDX_EXT))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));
}

function compareOrderPrefix(a, b) {
  const left = orderKey(a.name);
  const right = orderKey(b.name);
  if (left.order !== right.order) return left.order - right.order;
  return left.rest.localeCompare(right.rest);
}

function orderKey(name) {
  const match = name.match(/^(\d+)[-_]?(.*)$/);
  if (!match) return { order: Number.POSITIVE_INFINITY, rest: name };
  return { order: Number.parseInt(match[1], 10), rest: match[2] || name };
}

function stripOrderPrefix(name) {
  return name.replace(/^\d+[-_]?/, "");
}

function stripExtension(name) {
  return name.replace(/\.[^.]+$/, "");
}

function deriveTitleFromDirName(name) {
  return stripOrderPrefix(name)
    .split(/[-_]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

const documentRelative = documentRelativePath;
