import fs from "node:fs/promises";
import path from "node:path";
import { loadReactDocumentEntry } from "../react/document-entry.mjs";

export const REACT_MDX_CONTENT_EXTENSIONS = new Set([".mdx"]);

export async function resolveActiveSourceWorkspace(config) {
  const reactEntry = await loadReactDocumentEntry(config.root);
  if (!reactEntry) {
    throw new Error(
      "React/MDX document entry not found. Expected document/index.tsx with a Press default export before using workspace source tools.",
    );
  }
  const contentRoots = contentRootsFromSources(reactEntry.sources, reactEntry.config);
  const sourceDir = firstDirectoryRoot(contentRoots) ?? reactEntry.config.paths.documentRoot;

  return {
    kind: "react-mdx",
    checkedName: "react-source",
    config: reactEntry.config,
    entryPath: reactEntry.entryPath,
    sourceDir,
    contentRoots,
    contentExtensions: REACT_MDX_CONTENT_EXTENSIONS,
    contentLabel: "React MDX chapter source",
    missingCode: "react-source.missing",
    emptyCode: "react-source.empty",
    missingMessage: "Registered React MDX sources do not exist yet; create the files or roots declared in document/index.tsx `sources` before running export.",
    emptyMessage: "Registered React MDX sources contain no `*.mdx` files; the document will export with zero source blocks.",
  };
}

export async function collectActiveContentFiles(sourceWorkspace, { skipUnderscoreFiles = false } = {}) {
  const files = [];
  const seen = new Set();
  for (const root of sourceWorkspace.contentRoots ?? [{ kind: "dir", absolutePath: sourceWorkspace.sourceDir }]) {
    const visit = async (absolutePath) => {
      if (seen.has(absolutePath)) return;
      if (!sourceWorkspace.contentExtensions.has(path.extname(absolutePath))) return;
      const name = path.basename(absolutePath);
      if (skipUnderscoreFiles && name.startsWith("_")) return;
      seen.add(absolutePath);
      files.push({
        absolutePath,
        name,
        relativePath: rootRelativePath(sourceWorkspace.config, absolutePath),
        sourceRelativePath: path.relative(root.basePath ?? path.dirname(absolutePath), absolutePath).replaceAll("\\", "/"),
        text: await fs.readFile(absolutePath, "utf8"),
      });
    };
    if (root.kind === "file") {
      try {
        const stat = await fs.stat(root.absolutePath);
        if (stat.isFile()) await visit(root.absolutePath);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
      continue;
    }
    await walkFiles(root.absolutePath, visit);
  }
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return files;
}

export async function sourceDirectoryExists(sourceWorkspace) {
  const roots = sourceWorkspace.contentRoots ?? [{ kind: "dir", absolutePath: sourceWorkspace.sourceDir }];
  for (const root of roots) {
    try {
      const stat = await fs.stat(root.absolutePath);
      if (root.kind === "file" ? stat.isFile() : stat.isDirectory()) return true;
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
  }
  return false;
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

function contentRootsFromSources(sources, config) {
  const entries = Object.entries(sources ?? {});
  if (entries.length === 0) {
    return [{
      kind: "dir",
      absolutePath: config.paths.sourceDir,
      basePath: config.paths.sourceDir,
      sourceId: "default",
      preset: "section-folders",
    }];
  }

  const roots = [];
  for (const [sourceId, descriptor] of entries) {
    if (!descriptor || descriptor.type !== "mdx") continue;
    if (descriptor.preset === "section-folders") {
      roots.push(directoryRoot(config, descriptor.root ?? "chapters", sourceId, descriptor.preset));
      continue;
    }
    if (descriptor.preset === "section-files") {
      roots.push(directoryRoot(config, descriptor.root ?? "content", sourceId, descriptor.preset));
      continue;
    }
    if (descriptor.preset === "file-list") {
      for (const file of descriptor.files ?? []) {
        roots.push(fileRoot(config, file, sourceId, descriptor.preset));
      }
      continue;
    }
  }
  return dedupeRoots(roots);
}

function directoryRoot(config, rel, sourceId, preset) {
  const absolutePath = resolveDocumentRelativePath(config.paths.documentRoot, rel, `Source "${sourceId}" ${preset} root`);
  return {
    kind: "dir",
    absolutePath,
    basePath: absolutePath,
    sourceId,
    preset,
  };
}

function fileRoot(config, rel, sourceId, preset) {
  if (typeof rel !== "string" || !rel.trim()) {
    throw new Error(`Source "${sourceId}" file-list contains an empty or invalid entry.`);
  }
  if (!rel.endsWith(".mdx")) {
    throw new Error(`Source "${sourceId}" file-list path "${rel}" must end with .mdx.`);
  }
  const absolutePath = resolveDocumentRelativePath(config.paths.documentRoot, rel, `Source "${sourceId}" file-list path "${rel}"`);
  return {
    kind: "file",
    absolutePath,
    basePath: path.dirname(absolutePath),
    sourceId,
    preset,
  };
}

function resolveDocumentRelativePath(documentRoot, rel, label) {
  if (typeof rel !== "string" || !rel.trim()) throw new Error(`${label} must be a non-empty document-relative path.`);
  if (rel.includes("..")) throw new Error(`${label} contains "..", rejected.`);
  const absolutePath = path.resolve(documentRoot, rel);
  const relCheck = path.relative(documentRoot, absolutePath);
  if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) {
    throw new Error(`${label} escapes the document root.`);
  }
  return absolutePath;
}

function dedupeRoots(roots) {
  const seen = new Set();
  const out = [];
  for (const root of roots) {
    const key = `${root.kind}:${root.absolutePath}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(root);
  }
  return out;
}

function firstDirectoryRoot(roots) {
  return roots.find((root) => root.kind === "dir")?.absolutePath ?? null;
}
