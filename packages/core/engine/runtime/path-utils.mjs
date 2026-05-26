import path from "node:path";

export function rootRelativePath(config, absolutePath) {
  return path.relative(config.root, absolutePath).replaceAll("\\", "/");
}

export function documentRelativePath(absolutePath, documentRoot) {
  return path.relative(documentRoot, absolutePath).split(path.sep).join("/");
}

export function resolveDocumentRelativePath(documentRoot, rel, label) {
  if (typeof rel !== "string" || !rel.trim()) throw new Error(`${label} must be a non-empty document-relative path.`);
  if (rel.includes("..")) throw new Error(`${label} contains "..", rejected.`);
  const absolutePath = path.resolve(documentRoot, rel);
  const relCheck = path.relative(documentRoot, absolutePath);
  if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) {
    throw new Error(`${label} escapes the document root.`);
  }
  return absolutePath;
}
