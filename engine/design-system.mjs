import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { loadQDocConfig } from "./config.mjs";
import { normalizeFigureTableNumbering, renderMarkdown } from "./markdown-renderer.mjs";
import { documentRelativePath, pageToBlock } from "./page-block.mjs";
import {
  injectStaticToc,
  PAGE_RE,
  renderBackCover,
  renderCover,
  renderToc,
  splitChapterSections,
} from "./page-renderer.mjs";

const KIND_ORDER = { cover: 0, toc: 1, chapter: 2, "back-cover": 3 };

export async function loadDesignSystem(root, config) {
  config ??= await loadQDocConfig(root);
  const files = await scanDesignSystemFiles(config);
  const previewDocument = await loadDesignPreviewDocument(files, config);

  return {
    sourceDir: documentRelativePath(config, config.designSystemDir),
    status: files.length > 0 ? "ready" : "missing",
    files: files.map((entry) => ({
      name: entry.name,
      title: entry.title,
      path: entry.relativePath,
      exists: true,
      body: entry.body,
    })),
    previewDocument,
  };
}

export async function writeDesignSystemPublicJson(root, publicQdoc, config) {
  config ??= await loadQDocConfig(root);
  const designSystem = await loadDesignSystem(root, config);
  await fs.mkdir(publicQdoc, { recursive: true });
  await fs.writeFile(
    path.join(publicQdoc, "design-system.json"),
    `${JSON.stringify(designSystem, null, 2)}\n`,
    "utf8",
  );
}

async function scanDesignSystemFiles(config) {
  const dir = config.paths.designSystemDir;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".md")) continue;
    if (entry.name.startsWith("_")) continue;
    const absolutePath = path.join(dir, entry.name);
    const body = await fs.readFile(absolutePath, "utf8");
    const [meta] = parseFrontmatter(body);
    const kind = String(meta.kind ?? "chapter");
    const chapterValue = Number(meta.chapter);
    const chapter = Number.isFinite(chapterValue) && chapterValue > 0 ? chapterValue : null;
    const slug = meta.slug ? String(meta.slug) : null;
    const title = String(meta.title ?? deriveTitleFromFilename(entry.name));
    files.push({
      name: entry.name,
      relativePath: documentRelativePath(config, config.designSystemDir, entry.name),
      absolutePath,
      body,
      meta,
      kind,
      chapter,
      slug,
      title,
    });
  }

  files.sort(compareDesignFiles);
  return files;
}

function compareDesignFiles(a, b) {
  const ka = KIND_ORDER[a.kind] ?? KIND_ORDER.chapter;
  const kb = KIND_ORDER[b.kind] ?? KIND_ORDER.chapter;
  if (ka !== kb) return ka - kb;
  const ca = a.chapter ?? Number.POSITIVE_INFINITY;
  const cb = b.chapter ?? Number.POSITIVE_INFINITY;
  if (ca !== cb) return ca - cb;
  return a.name.localeCompare(b.name);
}

function deriveTitleFromFilename(filename) {
  const base = filename.replace(/\.md$/, "");
  return base
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return [{}, text];
  return [yaml.load(match[1]) ?? {}, text.slice(match[0].length)];
}

async function loadDesignPreviewDocument(files, config) {
  if (files.length === 0) return undefined;

  const idCounter = { value: 0 };
  const renderedPages = [];
  const sourceEntries = [];
  let tocInserted = false;

  for (const file of files) {
    const [meta, body] = parseFrontmatter(file.body);
    const { kind, chapter, slug } = file;
    let rendered;

    if (kind === "cover") {
      rendered = renderCover(meta, await renderMarkdown(body, config.paths.documentRoot));
    } else if (kind === "toc") {
      rendered = renderToc({ title: meta.title });
    } else if (kind === "back-cover") {
      rendered = renderBackCover(meta, await renderMarkdown(body, config.paths.documentRoot));
    } else {
      // chapter or unknown kind: split by h2 and let the theme decide
      // numbering / styling via data-page-kind upstream.
      rendered = splitChapterSections(
        await renderMarkdown(body, config.paths.documentRoot),
        chapter ?? 0,
        idCounter,
      );
    }

    const sections = rendered.match(PAGE_RE) ?? [];
    if (!tocInserted && kind === "cover") {
      renderedPages.push(...sections, renderToc());
      sections.forEach((_section, index) => {
        sourceEntries.push(sourceEntry(file, kind, chapter, slug, index + 1));
      });
      sourceEntries.push({
        file: "_toc.generated",
        path: documentRelativePath(config, config.designSystemDir, "_toc.generated"),
        kind: "toc",
        sectionIndex: 1,
      });
      tocInserted = true;
      continue;
    }

    renderedPages.push(...sections);
    sections.forEach((_section, index) => {
      sourceEntries.push(sourceEntry(file, kind, chapter, slug, index + 1));
    });
  }

  if (renderedPages.length === 0) return undefined;
  if (!tocInserted) {
    renderedPages.unshift(renderToc());
    sourceEntries.unshift({
      file: "_toc.generated",
      path: documentRelativePath(config, config.designSystemDir, "_toc.generated"),
      kind: "toc",
      sectionIndex: 1,
    });
  }

  const normalized = normalizeFigureTableNumbering(renderedPages.join("\n\n"));
  const normalizedPages = injectStaticToc(normalized.match(PAGE_RE) ?? []);
  if (normalizedPages.length !== sourceEntries.length) {
    throw new Error(`Design preview page count mismatch: ${normalizedPages.length} pages, ${sourceEntries.length} source entries`);
  }

  return {
    meta: {
      title: "QDoc Design System Document",
      subtitle: "User preview and agent design source generated from design-system files",
      organization: "QDoc",
      version: "qdoc-design-preview-v1",
    },
    source: {
      type: "qdoc-design-preview-html-pages",
      contentDir: documentRelativePath(config, config.designSystemDir),
      editable: true,
      editMode: "source-markdown",
    },
    blocks: normalizedPages.map((pageHtml, index) => pageToBlock(index, pageHtml, sourceEntries[index], config, {
      idPrefix: "qdoc-design-page",
      anchorPrefix: "design-page",
      titleFallback: "Design Page",
    })),
  };
}

function sourceEntry(file, kind, chapter, slug, sectionIndex) {
  return {
    file: file.name,
    path: file.relativePath,
    kind,
    chapter: Number.isFinite(chapter) && chapter > 0 ? chapter : undefined,
    slug,
    sectionIndex,
  };
}
