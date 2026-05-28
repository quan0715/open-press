import fs from "node:fs/promises";
import path from "node:path";
import { documentRelativePath } from "../runtime/path-utils.mjs";

// Style discovery — only used to find per-section CSS files for the
// section-folders preset. MDX content discovery lives in `sources/mdx-resolver`.
// This module exists because section-scoped CSS (`[data-section-id]`) needs
// to know which section slugs exist before the source descriptor pass.

const COMPONENT_EXT = ".tsx";

export async function discoverSectionStyles(root = ".", config = {}) {
  const workspaceRoot = path.resolve(root);
  const documentRoot = config.paths?.documentRoot ?? path.join(workspaceRoot, "press");
  const componentsRoot = config.paths?.componentsDir ?? path.join(documentRoot, "components");
  const sectionsRoot = config.paths?.chaptersDir ?? config.paths?.sourceDir ?? path.join(documentRoot, "chapters");
  const globalComponents = await discoverComponents(componentsRoot, documentRoot, "global");
  const sections = await discoverSections(documentRoot, sectionsRoot);

  return {
    root: workspaceRoot,
    documentRoot,
    globalComponents,
    sections,
    // Back-compat: `chapters` alias for callers that still expect the old shape.
    chapters: sections,
  };
}

async function discoverSections(documentRoot, sectionsDir) {
  const entries = await readDirectoryEntries(sectionsDir);
  const sectionDirs = entries.filter((entry) => entry.isDirectory()).sort(compareSectionDirectories);

  const sections = [];
  for (const entry of sectionDirs) {
    const sectionPath = path.join(sectionsDir, entry.name);
    const contentFiles = await discoverContentFiles(path.join(sectionPath, "content"), documentRoot);
    const styleFiles = await discoverStyleFiles(path.join(sectionPath, "styles"), documentRoot);

    sections.push({
      directoryName: entry.name,
      slug: sectionSlugFromDirectory(entry.name),
      absolutePath: sectionPath,
      documentPath: documentRelativePath(sectionPath, documentRoot),
      contentFiles,
      styleFiles,
    });
  }

  return sections;
}

async function discoverComponents(componentsDir, documentRoot, scope) {
  const entries = await readDirectoryEntries(componentsDir);
  const components = [];

  for (const entry of entries) {
    if (entry.isFile() && path.extname(entry.name) === COMPONENT_EXT) {
      const absolutePath = path.join(componentsDir, entry.name);
      components.push(componentRecord(path.basename(entry.name, COMPONENT_EXT), absolutePath, documentRoot, scope));
      continue;
    }

    if (entry.isDirectory()) {
      const indexPath = path.join(componentsDir, entry.name, `index${COMPONENT_EXT}`);
      if (await fileExists(indexPath)) {
        components.push(componentRecord(entry.name, indexPath, documentRoot, scope));
      }
    }
  }

  return components.sort((a, b) => a.name.localeCompare(b.name) || a.documentPath.localeCompare(b.documentPath));
}

async function discoverContentFiles(contentDir, documentRoot) {
  return discoverFilesByExtension(contentDir, documentRoot, ".mdx");
}

async function discoverStyleFiles(stylesDir, documentRoot) {
  return discoverFilesByExtension(stylesDir, documentRoot, ".css");
}

async function discoverFilesByExtension(directory, documentRoot, extension) {
  const entries = await readDirectoryEntries(directory);
  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name) === extension)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => pathRecord(path.join(directory, entry.name), documentRoot));
}

function componentRecord(name, absolutePath, documentRoot, scope) {
  return {
    name,
    scope,
    ...pathRecord(absolutePath, documentRoot),
  };
}

function pathRecord(absolutePath, documentRoot) {
  return {
    absolutePath,
    documentPath: documentRelativePath(absolutePath, documentRoot),
  };
}

function compareSectionDirectories(a, b) {
  const left = sectionSortKey(a.name);
  const right = sectionSortKey(b.name);
  if (left.order !== right.order) return left.order - right.order;
  return left.name.localeCompare(right.name);
}

function sectionSortKey(directoryName) {
  const match = directoryName.match(/^(\d+)[-_]?(.*)$/);
  if (!match) {
    return { order: Number.POSITIVE_INFINITY, name: directoryName };
  }
  return { order: Number.parseInt(match[1], 10), name: match[2] || directoryName };
}

function sectionSlugFromDirectory(directoryName) {
  return directoryName.replace(/^\d+[-_]?/, "");
}

async function readDirectoryEntries(directory) {
  try {
    return await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}
