import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";

const SHELL_KINDS = new Set(["cover", "toc", "back-cover"]);

export async function migrateLegacyWorkspaceToReact(root, config, { dryRun = false, force = false } = {}) {
  const migration = await planLegacyWorkspaceMigration(root, config, { force });
  if (!dryRun) {
    await applyMigrationPlan(migration, { force });
  }
  return {
    kind: "migrate-to-react",
    dryRun,
    sourceFiles: migration.sourceFiles.length,
    files: migration.actions.map(({ absolutePath, action }) => ({
      path: rootRelative(root, absolutePath),
      action,
    })),
  };
}

async function planLegacyWorkspaceMigration(root, config, { force = false } = {}) {
  const sourceFiles = await collectLegacyContentFiles(config.paths.sourceDir);
  const parsedFiles = await Promise.all(sourceFiles.map(async (filePath) => {
    const text = await fs.readFile(filePath, "utf8");
    const [meta, body] = parseFrontmatter(text);
    const fileName = path.basename(filePath);
    return {
      filePath,
      fileName,
      meta,
      body,
      kind: normalizedKind(meta.kind),
      slug: slugValue(meta.slug) ?? slugFromFileName(fileName),
      title: stringValue(meta.title),
      chapter: numberValue(meta.chapter),
    };
  }));

  const documentRoot = path.join(path.resolve(root), "document");
  const chaptersRoot = path.join(documentRoot, "chapters");
  const shell = Object.fromEntries(SHELL_KINDS.values().map((kind) => [kind, null]));
  const chapterStates = new Map();
  let chapterCounter = 0;

  for (const file of parsedFiles) {
    if (SHELL_KINDS.has(file.kind)) {
      shell[file.kind] ??= file;
      continue;
    }

    const chapter = file.chapter ?? (chapterCounter + 1);
    if (file.kind !== "chapter-opener") {
      chapterCounter = Math.max(chapterCounter, chapter);
    }
    const slug = file.slug || `chapter-${chapter}`;
    const key = `${chapter}:${slug}`;
    const current = chapterStates.get(key) ?? {
      chapter,
      slug,
      title: file.title ?? titleFromSlug(slug),
      opener: null,
      contentFiles: [],
    };
    current.title = file.title ?? current.title;
    if (file.kind === "chapter-opener") current.opener = file;
    else current.contentFiles.push(file);
    chapterStates.set(key, current);
  }

  const actions = [];
  const add = (absolutePath, content, action = "write") => actions.push({ absolutePath, content, action });
  const addCopy = (source, absolutePath) => {
    if (samePath(source, absolutePath)) return;
    actions.push({ source, absolutePath, action: "copy" });
  };
  const addDir = (absolutePath) => actions.push({ absolutePath, action: "mkdir" });

  addDir(documentRoot);
  add(path.join(documentRoot, "index.tsx"), renderDocumentIndex(config, shell));
  addCopy(config.paths.designDoc, path.join(documentRoot, "design.md"));
  addCopy(config.paths.themeDir, path.join(documentRoot, "theme"));
  addCopy(config.paths.mediaDir, path.join(documentRoot, "media"));
  addCopy(config.paths.componentsDir, path.join(documentRoot, "components"));

  const chapters = Array.from(chapterStates.values()).sort((a, b) => {
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.slug.localeCompare(b.slug);
  });

  for (const chapterState of chapters) {
    const chapterDir = path.join(chaptersRoot, chapterDirectoryName(chapterState.chapter, chapterState.slug));
    const contentDir = path.join(chapterDir, "content");
    addDir(contentDir);
    if (chapterState.opener) {
      add(path.join(chapterDir, "chapter.tsx"), renderChapterFile(chapterState));
    }
    chapterState.contentFiles.forEach((file, index) => {
      const contentName = `${String(index + 1).padStart(2, "0")}-${file.slug || chapterState.slug}.mdx`;
      add(path.join(contentDir, contentName), normalizeMdxBody(file.body));
    });
  }

  await assertWritable(actions, { force });
  return { sourceFiles: parsedFiles, actions };
}

async function applyMigrationPlan(migration, { force = false } = {}) {
  for (const item of migration.actions) {
    if (item.action === "mkdir") {
      await fs.mkdir(item.absolutePath, { recursive: true });
    } else if (item.action === "write") {
      await fs.mkdir(path.dirname(item.absolutePath), { recursive: true });
      if (!force) await assertMissing(item.absolutePath);
      await fs.writeFile(item.absolutePath, item.content, "utf8");
    } else if (item.action === "copy") {
      await copyPathIfExists(item.source, item.absolutePath, { force });
    }
  }
}

async function collectLegacyContentFiles(sourceDir) {
  let entries;
  try {
    entries = await fs.readdir(sourceDir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && !entry.name.startsWith("_"))
    .map((entry) => path.join(sourceDir, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
}

function renderDocumentIndex(config, shell) {
  const configLines = [
    `  title: ${jsString(config.title)},`,
    config.subtitle ? `  subtitle: ${jsString(config.subtitle)},` : null,
    config.organization ? `  organization: ${jsString(config.organization)},` : null,
    config.workspaceLabel ? `  workspaceLabel: ${jsString(config.workspaceLabel)},` : null,
    `  sourceDir: "chapters",`,
    `  mediaDir: "media",`,
    `  themeDir: "theme",`,
    `  designDoc: "design.md",`,
    `  componentsDir: "components",`,
    `  publicDir: ${jsString(config.publicDir)},`,
    `  outputDir: ${jsString(config.outputDir)},`,
    `  pdf: { filename: ${jsString(config.pdf.filename)} },`,
    `  deploy: {`,
    `    adapter: ${jsString(config.deploy.adapter)},`,
    `    source: ${jsString(config.deploy.source)},`,
    `    projectName: ${config.deploy.projectName == null ? "null" : jsString(config.deploy.projectName)},`,
    `    commitDirty: ${config.deploy.commitDirty ? "true" : "false"},`,
    `    requiresConfirmation: ${config.deploy.requiresConfirmation ? "true" : "false"},`,
    `  },`,
  ].filter(Boolean).join("\n");

  return [
    'import type { QDocManifest } from "@qdoc/core";',
    "",
    "export const config: QDocManifest = {",
    configLines,
    "};",
    "",
    renderShellExport("cover", shell.cover, "cover", "QDoc"),
    "",
    renderTocExport(shell.toc),
    "",
    renderShellExport("backCover", shell["back-cover"], "back-cover", "End"),
    "",
  ].join("\n");
}

function renderShellExport(exportName, file, pageKind, fallbackTitle) {
  const title = file?.title ?? fallbackTitle;
  const bodyText = summaryText(file?.body);
  const className = pageKind === "back-cover" ? "reader-page back-cover no-footer" : "reader-page cover no-footer";
  const mainClass = pageKind === "back-cover" ? "back-cover-main" : "cover-main";
  const titleClass = pageKind === "back-cover" ? "back-cover-statement" : "cover-title";
  const summaryClass = pageKind === "back-cover" ? "back-cover-summary" : "cover-summary";

  return `export const ${exportName} = (
  <section className="${className}" data-page-kind="${pageKind}" data-page-footer="false">
    <div className="${mainClass}">
      <h1 className="${titleClass}">${jsxText(title)}</h1>
      ${bodyText ? `<p className="${summaryClass}">${jsxText(bodyText)}</p>` : ""}
    </div>
  </section>
);`;
}

function renderTocExport(file) {
  const title = file?.title ?? "Contents";
  return `export const toc = (
  <section className="reader-page toc no-footer" data-page-kind="toc" data-page-footer="false">
    <div className="page-frame">
      <header className="page-header" aria-hidden="true"></header>
      <main className="page-body">
        <h2 id="toc-title" className="toc-heading">${jsxText(title)}</h2>
      </main>
    </div>
  </section>
);`;
}

function renderChapterFile(chapterState) {
  const title = chapterState.opener?.title ?? chapterState.title;
  const label = `Chapter ${chapterState.chapter}`;
  const summary = summaryText(chapterState.opener?.body);
  return [
    "export const meta = {",
    `  slug: ${jsString(chapterState.slug)},`,
    `  title: ${jsString(title)},`,
    `  chapter: ${chapterState.chapter},`,
    "};",
    "",
    "export const opener = (",
    `  <section className="reader-page chapter-opener no-footer" data-page-kind="chapter-opener" data-page-footer="false" data-page-title="${jsxAttr(title)}">`,
    '    <div className="page-frame">',
    '      <header className="page-header" aria-hidden="true"></header>',
    '      <main className="page-body">',
    `        <p className="chapter-opener-kicker">${jsxText(label)}</p>`,
    `        <h2 className="chapter-opener-title">${jsxText(title)}</h2>`,
    summary ? `        <p className="chapter-opener-summary">${jsxText(summary)}</p>` : null,
    "      </main>",
    "    </div>",
    "  </section>",
    ");",
    "",
  ].filter(Boolean).join("\n");
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return [{}, text];
  return [yaml.load(match[1]) ?? {}, text.slice(match[0].length)];
}

function normalizeMdxBody(body) {
  const normalized = String(body ?? "").replace(/^\s+/, "").replace(/\s+$/, "");
  return `${normalized}\n`;
}

function normalizedKind(value) {
  if (typeof value !== "string" || !value.trim()) return "chapter";
  return value.trim();
}

function stringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function slugValue(value) {
  return typeof value === "string" && value.trim() ? safeSlug(value.trim()) : null;
}

function numberValue(value) {
  return Number.isFinite(value) ? Number(value) : null;
}

function slugFromFileName(fileName) {
  return safeSlug(fileName.replace(/\.md$/i, "").replace(/^\d+[-_]?/, "").replace(/-opener$/, ""));
}

function safeSlug(value) {
  const slug = value
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug || "chapter";
}

function titleFromSlug(slug) {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function chapterDirectoryName(chapter, slug) {
  return `${String(chapter).padStart(2, "0")}-${safeSlug(slug)}`;
}

function summaryText(markdown = "") {
  const text = String(markdown)
    .replace(/<[^>]+>/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function jsString(value) {
  return JSON.stringify(String(value ?? ""));
}

function jsxText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("{", "&#123;")
    .replaceAll("}", "&#125;");
}

function jsxAttr(value) {
  return jsxText(value).replaceAll('"', "&quot;");
}

async function assertWritable(actions, { force = false } = {}) {
  if (force) return;
  const writeTargets = actions.filter((item) => item.action === "write" || item.action === "copy");
  for (const item of writeTargets) {
    await assertMissing(item.absolutePath);
  }
}

async function assertMissing(filePath) {
  try {
    await fs.access(filePath);
    throw new Error(`Refusing to overwrite existing path: ${filePath}. Re-run with --force if this is intentional.`);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
}

async function copyPathIfExists(source, destination, { force = false } = {}) {
  let stat;
  try {
    stat = await fs.stat(source);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  await fs.mkdir(path.dirname(destination), { recursive: true });
  if (force) await fs.rm(destination, { recursive: true, force: true });
  else await assertMissing(destination);
  await fs.cp(source, destination, { recursive: stat.isDirectory(), force: true });
}

function rootRelative(root, absolutePath) {
  return path.relative(root, absolutePath).replaceAll("\\", "/");
}

function samePath(left, right) {
  return path.resolve(left) === path.resolve(right);
}
