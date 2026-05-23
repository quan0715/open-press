import fs from "node:fs/promises";
import path from "node:path";

const COMPONENT_EXT = ".tsx";

export async function discoverReactWorkspace(root = ".", config = {}) {
  const workspaceRoot = path.resolve(root);
  const documentRoot = config.paths?.documentRoot ?? path.join(workspaceRoot, "document");
  const componentsRoot = config.paths?.componentsDir ?? path.join(documentRoot, "components");
  const chaptersRoot = config.paths?.chaptersDir ?? config.paths?.sourceDir ?? path.join(documentRoot, "chapters");
  const globalComponents = await discoverComponents(componentsRoot, documentRoot, "global");
  const chapters = await discoverChapters(documentRoot, chaptersRoot);

  return {
    root: workspaceRoot,
    documentRoot,
    globalComponents,
    chapters,
  };
}

async function discoverChapters(documentRoot, chaptersDir) {
  const entries = await readDirectoryEntries(chaptersDir);
  const chapterDirs = entries.filter((entry) => entry.isDirectory()).sort(compareChapterDirectories);

  const chapters = [];
  for (const entry of chapterDirs) {
    const chapterPath = path.join(chaptersDir, entry.name);
    const contentFiles = await discoverContentFiles(path.join(chapterPath, "content"), documentRoot);
    const styleFiles = await discoverStyleFiles(path.join(chapterPath, "styles"), documentRoot);

    chapters.push({
      directoryName: entry.name,
      slug: chapterSlugFromDirectory(entry.name),
      absolutePath: chapterPath,
      documentPath: documentRelativePath(chapterPath, documentRoot),
      contentFiles,
      styleFiles,
    });
  }

  return chapters;
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

function documentRelativePath(absolutePath, documentRoot) {
  return path.relative(documentRoot, absolutePath).split(path.sep).join("/");
}

function compareChapterDirectories(a, b) {
  const left = chapterSortKey(a.name);
  const right = chapterSortKey(b.name);
  if (left.order !== right.order) return left.order - right.order;
  return left.name.localeCompare(right.name);
}

function chapterSortKey(directoryName) {
  const match = directoryName.match(/^(\d+)[-_]?(.*)$/);
  if (!match) {
    return { order: Number.POSITIVE_INFINITY, name: directoryName };
  }
  return { order: Number.parseInt(match[1], 10), name: match[2] || directoryName };
}

function chapterSlugFromDirectory(directoryName) {
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
