import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { loadQDocConfig } from "./config.mjs";
import { normalizeFigureTableNumbering, renderMarkdown } from "./markdown-renderer.mjs";
import {
  injectStaticToc,
  PAGE_RE,
  renderChapterOpener,
  renderBackCover,
  renderCover,
  renderToc,
  splitChapterSections,
} from "./page-renderer.mjs";
import { documentRelativePath, pageToBlock } from "./page-block.mjs";
import { syncQdocPublicAssets } from "./public-assets.mjs";

const SELF_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SELF_DIR, "..");

const KNOWN_KINDS = new Set(["cover", "toc", "chapter", "chapter-opener", "back-cover"]);

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return [{}, text];
  return [yaml.load(match[1]) ?? {}, text.slice(match[0].length)];
}

async function discoverContentEntries(config) {
  const sourceDir = config.paths.sourceDir;
  let entries;
  try {
    entries = await fs.readdir(sourceDir);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const files = entries
    .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
    .sort((a, b) => a.localeCompare(b));

  const discovered = [];
  let chapterCounter = 0;
  for (const fileName of files) {
    const filePath = path.join(sourceDir, fileName);
    const [meta] = parseFrontmatter(await fs.readFile(filePath, "utf8"));
    const kind = typeof meta.kind === "string" && meta.kind.trim()
      ? meta.kind.trim()
      : "chapter";
    const slug = typeof meta.slug === "string" && meta.slug.trim()
      ? meta.slug.trim()
      : fileName.replace(/^\d+-/, "").replace(/\.md$/, "");
    let chapter;
    if (kind === "chapter") {
      chapterCounter += 1;
      chapter = typeof meta.chapter === "number" ? meta.chapter : chapterCounter;
    } else if (kind === "chapter-opener" && typeof meta.chapter === "number") {
      chapter = meta.chapter;
    }
    discovered.push({ file: fileName, kind, chapter, slug, title: meta.title });
  }
  return discovered;
}

async function renderContentPages(root, config) {
  config ??= await loadQDocConfig(root);
  const entries = await discoverContentEntries(config);
  const idCounter = { value: 0 };
  const renderedPages = [];
  const sourceEntries = [];

  for (const entry of entries) {
    const filePath = path.join(config.paths.sourceDir, entry.file);
    const [meta, body] = parseFrontmatter(await fs.readFile(filePath, "utf8"));
    let rendered;

    if (entry.kind === "cover") {
      rendered = renderCover(meta, await renderMarkdown(body, config.paths.documentRoot));
    } else if (entry.kind === "toc") {
      rendered = renderToc({ title: meta.title });
    } else if (entry.kind === "back-cover") {
      rendered = renderBackCover(meta, await renderMarkdown(body, config.paths.documentRoot));
    } else if (entry.kind === "chapter-opener") {
      rendered = renderChapterOpener(
        meta,
        await renderMarkdown(body, config.paths.documentRoot),
        entry,
      );
    } else if (entry.kind === "chapter") {
      rendered = splitChapterSections(
        await renderMarkdown(body, config.paths.documentRoot),
        entry.chapter,
        idCounter,
      );
    } else {
      // Unknown kind: treat as chapter-shaped body without auto-injected
      // chapter number. Theme/CSS may apply different styling via the
      // section's `data-page-kind` attribute set further upstream.
      rendered = splitChapterSections(
        await renderMarkdown(body, config.paths.documentRoot),
        entry.chapter ?? 0,
        idCounter,
      );
    }

    const sections = rendered.match(PAGE_RE) ?? [];
    renderedPages.push(...sections);
    sections.forEach((_section, index) => {
      sourceEntries.push({
        file: entry.file,
        path: documentRelativePath(config, config.sourceDir, entry.file),
        kind: entry.kind,
        chapter: entry.chapter,
        slug: entry.slug,
        sectionIndex: index + 1,
      });
    });
  }

  const normalized = normalizeFigureTableNumbering(renderedPages.join("\n\n"));
  const normalizedPages = injectStaticToc(normalized.match(PAGE_RE) ?? []);
  if (normalizedPages.length !== sourceEntries.length) {
    throw new Error(`Exported page count mismatch: ${normalizedPages.length} pages, ${sourceEntries.length} source entries`);
  }
  return { pages: normalizedPages, sourceEntries, sectionCount: idCounter.value };
}

export async function exportQDocDocument(root = ROOT) {
  const config = await loadQDocConfig(root);
  const { pages, sourceEntries } = await renderContentPages(root, config);
  const metadata = collectDocumentMetadata(config);
  const blocks = pages.map((pageHtml, index) => pageToBlock(index, pageHtml, sourceEntries[index], config));
  const qdocDocument = {
    meta: {
      title: metadata.title,
      subtitle: metadata.subtitle,
      organization: metadata.organization,
      workspaceLabel: metadata.workspaceLabel,
      version: "qdoc-content-export-v1",
    },
    source: {
      type: "qdoc-html-pages",
      contentDir: documentRelativePath(config, config.sourceDir),
      editable: true,
      editMode: "source-markdown",
    },
    blocks,
  };

  const publicQdoc = config.paths.publicDir;
  await fs.mkdir(publicQdoc, { recursive: true });
  const documentPath = path.join(publicQdoc, "document.json");
  await fs.writeFile(documentPath, JSON.stringify(qdocDocument, null, 2), "utf8");
  await syncQdocPublicAssets(root, publicQdoc, config);
  return { documentPath, pageCount: blocks.length };
}

function collectDocumentMetadata(config) {
  const title = trimmedString(config.title) ?? "Untitled Document";
  const subtitle = trimmedString(config.subtitle) ?? "";
  const organization = trimmedString(config.organization) ?? "";
  const workspaceLabel = trimmedString(config.workspaceLabel) ?? title;
  return { title, subtitle, organization, workspaceLabel };
}

function trimmedString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
