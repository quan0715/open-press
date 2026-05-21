import fs from "node:fs/promises";
import path from "node:path";
import { loadReactDocumentEntry } from "./react/document-entry.mjs";

export const REACT_MDX_CONTENT_EXTENSIONS = new Set([".mdx"]);

export async function resolveActiveSourceWorkspace(config) {
  const reactEntry = await loadReactDocumentEntry(config.root);
  if (!reactEntry) {
    throw new Error(
      "React/MDX document entry not found. Expected document/index.tsx; run `node engine/cli.mjs migrate-to-react .` before using workspace source tools.",
    );
  }

  return {
    kind: "react-mdx",
    checkedName: "react-source",
    config: reactEntry.config,
    entryPath: reactEntry.entryPath,
    sourceDir: reactEntry.config.paths.sourceDir,
    contentExtensions: REACT_MDX_CONTENT_EXTENSIONS,
    contentLabel: "React MDX chapter source",
    missingCode: "react-source.missing",
    emptyCode: "react-source.empty",
    missingMessage: `React chapter source directory does not exist yet; create ${reactEntry.config.sourceDir}/ before running export.`,
    emptyMessage: "React chapter source directory has no `*.mdx` files; the document will export with zero chapter pages.",
  };
}

export async function collectActiveContentFiles(sourceWorkspace, { skipUnderscoreFiles = false } = {}) {
  const files = [];
  await walkFiles(sourceWorkspace.sourceDir, async (absolutePath) => {
    if (!sourceWorkspace.contentExtensions.has(path.extname(absolutePath))) return;
    const name = path.basename(absolutePath);
    if (skipUnderscoreFiles && name.startsWith("_")) return;
    files.push({
      absolutePath,
      name,
      relativePath: rootRelativePath(sourceWorkspace.config, absolutePath),
      sourceRelativePath: path.relative(sourceWorkspace.sourceDir, absolutePath).replaceAll("\\", "/"),
      text: await fs.readFile(absolutePath, "utf8"),
    });
  });
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return files;
}

export async function sourceDirectoryExists(sourceWorkspace) {
  try {
    const stat = await fs.stat(sourceWorkspace.sourceDir);
    return stat.isDirectory();
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

export function rootRelativePath(config, absolutePath) {
  return path.relative(config.root, absolutePath).replaceAll("\\", "/");
}

async function walkFiles(directory, visit) {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) await walkFiles(absolutePath, visit);
    else if (entry.isFile()) await visit(absolutePath);
  }
}
