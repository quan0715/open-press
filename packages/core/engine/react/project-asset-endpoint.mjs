import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../runtime/config.mjs";
import { collectSourceTextFiles } from "../runtime/source-text-tools.mjs";
import { insertCommentMarker } from "./comment-marker.mjs";

const MAX_PROJECT_ASSET_BODY_BYTES = 64 * 1024;

export async function handleProjectAssetRequest(req, res, {
  root = ".",
  timestamp = undefined,
} = {}) {
  if (req.method !== "POST") {
    writeJson(res, 405, { ok: false, message: "OpenPress project asset endpoint requires POST." });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const config = await loadConfig(root);
    const action = stringValue(body?.action);
    const kind = stringValue(body?.kind);
    const name = stringValue(body?.name);

    if (kind !== "media" && kind !== "component") {
      throw new Error("Project asset kind must be `media` or `component`.");
    }
    if (!name) throw new Error("Project asset action requires a name.");

    if (action === "rename") {
      const result = await renameProjectAsset({
        config,
        kind,
        name,
        nextName: body?.nextName,
      });
      writeJson(res, 200, { ok: true, ...result });
      return;
    }

    if (action === "delete") {
      const result = await deleteProjectAsset({ config, kind, name });
      const status = result.needsReferenceCleanup ? 409 : 200;
      writeJson(res, status, { ok: !result.needsReferenceCleanup, ...result });
      return;
    }

    if (action === "comment") {
      const result = await createProjectAssetComment({
        config,
        kind,
        name,
        note: body?.note,
        commentTarget: body?.commentTarget,
        currentSource: body?.currentSource,
        timestamp,
      });
      writeJson(res, 200, { ok: true, ...result });
      return;
    }

    throw new Error("Project asset action must be `rename`, `delete`, or `comment`.");
  } catch (error) {
    writeJson(res, 400, {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function renameProjectAsset({ config, kind, name, nextName }) {
  const normalizedCurrentName = normalizeAssetName(kind, name);
  const normalizedNextName = normalizeAssetName(kind, stringValue(nextName), normalizedCurrentName);
  if (!normalizedNextName || normalizedNextName === normalizedCurrentName) {
    throw new Error("Rename requires a different valid name.");
  }

  const currentPath = resolveAssetPath(config, kind, normalizedCurrentName);
  const nextPath = resolveAssetPath(config, kind, normalizedNextName);
  await assertPathExists(currentPath, `${kind} asset not found: ${normalizedCurrentName}`);
  if (await fileExists(nextPath)) throw new Error(`${kind} asset already exists: ${normalizedNextName}`);

  await fs.rename(currentPath, nextPath);
  const referenceResult = await replaceProjectAssetReferences({
    config,
    kind,
    from: normalizedCurrentName,
    to: normalizedNextName,
  });

  return {
    action: "rename",
    kind,
    name: normalizedCurrentName,
    nextName: normalizedNextName,
    referenceCount: referenceResult.referenceCount,
    fileCount: referenceResult.fileCount,
  };
}

async function deleteProjectAsset({ config, kind, name }) {
  const normalizedName = normalizeAssetName(kind, name);
  const references = await findProjectAssetReferences({ config, kind, name: normalizedName });
  if (references.length > 0) {
    return {
      action: "delete",
      kind,
      name: normalizedName,
      needsReferenceCleanup: true,
      referenceCount: references.length,
      references: references.slice(0, 12),
      message: `Cannot delete ${kind} asset while ${references.length} reference(s) still exist.`,
    };
  }

  const targetPath = resolveAssetPath(config, kind, normalizedName);
  await assertPathExists(targetPath, `${kind} asset not found: ${normalizedName}`);
  await fs.rm(targetPath, { recursive: true, force: true });

  return {
    action: "delete",
    kind,
    name: normalizedName,
    needsReferenceCleanup: false,
    referenceCount: 0,
  };
}

async function createProjectAssetComment({
  config,
  kind,
  name,
  note,
  commentTarget,
  currentSource,
  timestamp,
}) {
  const normalizedName = normalizeAssetName(kind, name);
  const noteText = stringValue(note);
  if (!noteText) throw new Error("Project asset comment requires a note.");

  const target = await resolveCommentTarget({
    config,
    kind,
    name: normalizedName,
    commentTarget: stringValue(commentTarget),
    currentSource,
  });

  const result = await insertCommentMarker({
    root: config.root,
    path: target.path,
    source: { line: target.line, column: 1 },
    note: `${assetLabel(kind, normalizedName)}：${noteText}`,
    hint: `openpress-project-asset kind=${kind} action=comment target=${target.reason} asset=${normalizedName}`,
    timestamp,
  });

  return {
    action: "comment",
    kind,
    name: normalizedName,
    comment: {
      id: result.id,
      timestamp: result.timestamp,
      path: result.path,
      line: result.line,
    },
  };
}

async function resolveCommentTarget({ config, kind, name, commentTarget, currentSource }) {
  if (commentTarget === "current-page") {
    const currentPath = stringValue(currentSource?.path);
    if (currentPath) {
      return {
        path: currentPath,
        line: normalizePositiveInteger(currentSource?.line) ?? 1,
        reason: "current-page",
      };
    }
  }

  const references = await findProjectAssetReferences({ config, kind, name });
  const preferred = references.find((reference) => {
    if (kind === "component") return reference.preview.includes("data-openpress-component");
    return reference.path.includes("/content/") || reference.path.endsWith(".mdx");
  }) ?? references[0];
  if (!preferred) {
    throw new Error(`No editable reference found for ${kind} asset: ${name}`);
  }
  return {
    path: preferred.path,
    line: preferred.line,
    reason: "asset-reference",
  };
}

async function replaceProjectAssetReferences({ config, kind, from, to }) {
  const replacements = replacementPairs(kind, from, to);
  const files = await collectSourceTextFiles(config, { scope: "all" });
  let referenceCount = 0;
  let fileCount = 0;

  for (const file of files) {
    let text = file.text;
    let changed = false;
    for (const [fromText, toText] of replacements) {
      if (!fromText || fromText === toText || !text.includes(fromText)) continue;
      const count = text.split(fromText).length - 1;
      text = text.split(fromText).join(toText);
      referenceCount += count;
      changed = true;
    }
    if (!changed) continue;
    fileCount += 1;
    await fs.writeFile(file.absolutePath, text, "utf8");
  }

  return { referenceCount, fileCount };
}

async function findProjectAssetReferences({ config, kind, name }) {
  const tokens = referenceTokens(kind, name);
  const files = await collectSourceTextFiles(config, { scope: "all" });
  const references = [];

  for (const file of files) {
    const lines = file.text.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (!tokens.some((token) => token && line.includes(token))) return;
      references.push({
        path: file.relativePath,
        line: index + 1,
        preview: line.trim().slice(0, 180),
      });
    });
  }

  return references;
}

function resolveAssetPath(config, kind, name) {
  const root = kind === "media" ? config.paths.mediaDir : config.paths.componentsDir;
  const target = path.resolve(root, name);
  const resolvedRoot = path.resolve(root);
  if (!target.startsWith(`${resolvedRoot}${path.sep}`) && target !== resolvedRoot) {
    throw new Error(`Project asset path escapes ${kind} directory: ${name}`);
  }
  return target;
}

function normalizeAssetName(kind, value, currentName = "") {
  if (kind === "media") return sanitizeMediaFileName(value, currentName);
  return sanitizeComponentName(value);
}

function sanitizeMediaFileName(value, currentName = "") {
  const rawName = stringValue(value);
  if (!rawName) return "";
  const currentExt = path.extname(currentName);
  const suppliedExt = path.extname(rawName);
  const baseName = path.basename(suppliedExt ? rawName : `${rawName}${currentExt}`).trim();
  if (!baseName) return "";
  const ext = path.extname(baseName);
  const stem = path.basename(baseName, ext)
    .replace(/[\\/:*?"<>|#%{}^~[\]`]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!stem || !ext || !isAllowedMediaFile(`${stem}${ext}`)) return "";
  return `${stem}${ext.toLowerCase()}`;
}

function sanitizeComponentName(value) {
  const raw = stringValue(value).replaceAll("\\", "/").split("/").pop() ?? "";
  const normalized = raw
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(normalized)) return "";
  return normalized;
}

function isAllowedMediaFile(fileName) {
  return /\.(png|jpe?g|gif|svg|webp)$/i.test(fileName);
}

function replacementPairs(kind, from, to) {
  if (kind === "media") {
    return uniquePairs([
      [from, to],
      [encodeURIComponent(from), encodeURIComponent(to)],
      [`@media/${from}`, `@media/${to}`],
    ]);
  }
  return uniquePairs([
    [from, to],
    [`@component/${from}`, `@component/${to}`],
  ]);
}

function referenceTokens(kind, name) {
  if (kind === "media") {
    return uniqueValues([
      name,
      encodeURIComponent(name),
      `@media/${name}`,
    ]);
  }
  return uniqueValues([
    name,
    `@component/${name}`,
    `data-openpress-component="${name}"`,
    `data-openpress-component='${name}'`,
  ]);
}

function uniquePairs(pairs) {
  const seen = new Set();
  return pairs.filter(([from, to]) => {
    const key = `${from}\0${to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function assetLabel(kind, name) {
  return kind === "media" ? `Media ${name}` : `Component ${name}`;
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

async function assertPathExists(filePath, message) {
  if (!(await fileExists(filePath))) throw new Error(message);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += String(chunk);
    if (Buffer.byteLength(body, "utf8") > MAX_PROJECT_ASSET_BODY_BYTES) {
      throw new Error("Project asset request body is too large.");
    }
  }
  try {
    return JSON.parse(body || "{}");
  } catch {
    throw new Error("Project asset request body must be valid JSON.");
  }
}

function writeJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(`${JSON.stringify(body, null, 2)}\n`);
}
