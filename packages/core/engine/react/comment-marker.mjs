import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../runtime/config.mjs";
import { collectSourceTextFiles } from "../runtime/source-text-tools.mjs";

// Any `.mdx` or `.tsx` file under `document/` is a legal comment target.
// The Press Tree allows arbitrary source layouts — `section-folders`,
// `section-files`, `file-list`, custom `root` paths, etc. — so we no
// longer hardcode `document/chapters/<slug>/content/*.mdx`. The boundary
// is "inside the workspace's authored `document/` directory" and "looks
// like an editable React/MDX source" by extension.
const EDITABLE_COMMENT_SOURCE_PATTERNS = [
  /^document\/.+\.mdx$/,
  /^document\/.+\.tsx$/,
];
const COMMENT_MARKER_RE = /(?:\{\/\*|\/\*)\s*@openpress-comment\b(?<attrs>[^*]*)\*\/\}?/g;
const COMMENT_LINE_RE = /^\s*(?:\{\/\*|\/\*)\s*@openpress-comment\b[^*]*\*\/\}?\s*$/;

export async function insertCommentMarker({
  root = ".",
  path: sourcePath,
  source,
  note,
  hint,
  id = createCommentId(),
  timestamp = new Date().toISOString(),
} = {}) {
  const workspaceRoot = path.resolve(root);
  const relativePath = normalizeEditableSourcePath(sourcePath);
  assertEditableCommentPath(relativePath);
  const absolutePath = path.resolve(workspaceRoot, relativePath);
  if (!absolutePath.startsWith(`${workspaceRoot}${path.sep}`)) {
    throw new Error(`OpenPress comment target path escapes workspace: ${sourcePath}`);
  }

  const noteText = normalizedNote(note);
  const line = normalizeLineNumber(source?.line);
  const text = await fs.readFile(absolutePath, "utf8");
  const marker = createCommentMarker({
    id,
    timestamp,
    note: noteText,
    hint,
    syntax: commentMarkerSyntaxForInsert(text, line, relativePath),
  });
  const nextText = insertLineBefore(text, line, marker);
  await fs.writeFile(absolutePath, nextText, "utf8");

  return {
    id,
    timestamp,
    marker,
    path: relativePath,
    absolutePath,
    line,
  };
}

export function createCommentMarker({ id = createCommentId(), timestamp = new Date().toISOString(), note, hint, syntax = "jsx" } = {}) {
  const payload = { note: normalizedNote(note), ...(typeof hint === "string" && hint.trim() ? { hint: hint.trim() } : {}) };
  const body = `@openpress-comment id="${escapeMarkerAttribute(id)}" ts="${escapeMarkerAttribute(timestamp)}" text="${encodeCommentPayload(payload)}"`;
  return syntax === "block" ? `/* ${body} */` : `{/* ${body} */}`;
}

export function decodeCommentMarkerText(marker) {
  const match = String(marker ?? "").match(/\btext="([^"]+)"/);
  if (!match) return null;
  return JSON.parse(Buffer.from(match[1], "base64url").toString("utf8"));
}

export async function listCommentMarkers({ root = "." } = {}) {
  const config = await loadConfig(root);
  const files = await collectSourceTextFiles(config, { scope: "all" });
  const comments = [];

  for (const file of files) {
    if (!isEditableCommentPath(file.path ?? file.relativePath)) continue;
    comments.push(...extractCommentMarkers(file));
  }

  comments.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line || a.id.localeCompare(b.id));
  return comments;
}

export async function clearCommentMarkers({ root = ".", id = null, all = false } = {}) {
  if (!all && !(typeof id === "string" && id.trim())) {
    throw new Error("OpenPress comment clear requires an `id` or `all: true`.");
  }

  const config = await loadConfig(root);
  const files = await collectSourceTextFiles(config, { scope: "all" });
  const removed = [];

  for (const file of files) {
    if (!isEditableCommentPath(file.path ?? file.relativePath)) continue;
    const next = removeCommentMarkerLines(file.text, { id, all });
    if (next.removed.length === 0) continue;
    await fs.writeFile(file.absolutePath, next.text, "utf8");
    for (const marker of next.removed) {
      removed.push({
        ...marker,
        path: file.path ?? file.relativePath,
        absolutePath: file.absolutePath,
      });
    }
  }

  return {
    removedCount: removed.length,
    comments: removed,
  };
}

export async function updateCommentMarker({
  root = ".",
  id,
  note,
  hint,
  timestamp = new Date().toISOString(),
} = {}) {
  if (!(typeof id === "string" && id.trim())) {
    throw new Error("OpenPress comment update requires an `id`.");
  }

  const config = await loadConfig(root);
  const files = await collectSourceTextFiles(config, { scope: "all" });
  const noteText = normalizedNote(note);

  for (const file of files) {
    if (!isEditableCommentPath(file.path ?? file.relativePath)) continue;
    const next = replaceCommentMarkerLine(file.text, { id, note: noteText, hint, timestamp });
    if (!next.comment) continue;
    await fs.writeFile(file.absolutePath, next.text, "utf8");
    return {
      ...next.comment,
      path: file.path ?? file.relativePath,
      absolutePath: file.absolutePath,
    };
  }

  throw new Error(`OpenPress comment marker not found: ${id}`);
}

export function assertEditableCommentPath(relativePath) {
  if (!isEditableCommentPath(relativePath)) {
    throw new Error(`OpenPress comment target is not an editable OpenPress document source: ${relativePath}`);
  }
}

// Strict check against workspace-relative paths. Callers walking the
// workspace (`applyCommentMarker` via `collectSourceTextFiles`) already
// receive paths with the `document/` prefix and must not have system
// paths silently mapped into the editable set.
export function isEditableCommentPath(relativePath) {
  if (typeof relativePath !== "string" || !relativePath) return false;
  const trimmed = relativePath.trim().replaceAll("\\", "/").replace(/^\.\//, "");
  return EDITABLE_COMMENT_SOURCE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function normalizeEditableSourcePath(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("OpenPress comment target requires a source path.");
  }
  const normalized = value.trim().replaceAll("\\", "/").replace(/^\.\//, "");
  if (path.posix.isAbsolute(normalized) || normalized.includes("\0") || normalized === "." || normalized.startsWith("../")) {
    throw new Error(`OpenPress comment target path is invalid: ${value}`);
  }
  const posix = path.posix.normalize(normalized);
  // The Press Tree source resolver emits paths relative to `document/`
  // (e.g. "chapters/01-start/content/01-start.mdx"). The comment marker
  // works in workspace-relative paths (with the `document/` prefix). If
  // the incoming path is documentRoot-relative, prepend `document/`.
  if (!posix.startsWith("document/") && looksDocumentRelative(posix)) {
    return `document/${posix}`;
  }
  return posix;
}

// Identify paths the Press Tree source resolver emits — those are relative
// to `document/`. Match `.mdx` / `.tsx` files that don't already have the
// `document/` prefix and don't look like system / engine paths. The check
// is intentionally tight so we never silently rewrite engine internals
// (e.g. `src/openpress/...`) into "editable" workspace paths.
const SYSTEM_PATH_PREFIXES = [
  "document/",
  "src/",
  "engine/",
  "dist/",
  "dist-react/",
  "node_modules/",
  "tests/",
  "public/",
  "packages/",
  ".openpress/",
  ".deploy/",
  ".changeset/",
  ".github/",
];

function looksDocumentRelative(posixPath) {
  if (!/\.(mdx|tsx)$/.test(posixPath)) return false;
  if (SYSTEM_PATH_PREFIXES.some((prefix) => posixPath.startsWith(prefix))) return false;
  return true;
}

function normalizeLineNumber(value) {
  const line = Number(value);
  if (!Number.isInteger(line) || line < 1) {
    throw new Error("OpenPress comment target requires a 1-based source line.");
  }
  return line;
}

function normalizedNote(value) {
  const note = typeof value === "string" ? value.trim() : "";
  if (!note) throw new Error("OpenPress comment note must not be empty.");
  return note;
}

function insertLineBefore(text, line, marker) {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const hasTrailingNewline = /\r?\n$/.test(text);
  const lines = text.split(/\r?\n/);
  if (hasTrailingNewline) lines.pop();
  const index = Math.min(Math.max(line - 1, 0), lines.length);
  lines.splice(index, 0, marker);
  return `${lines.join(newline)}${hasTrailingNewline ? newline : ""}`;
}

function encodeCommentPayload(payload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function extractCommentMarkers(file) {
  const comments = [];
  const text = String(file.text ?? "");
  const lineStarts = lineStartOffsets(text);
  for (const match of text.matchAll(COMMENT_MARKER_RE)) {
    const marker = match[0];
    const attrs = parseMarkerAttributes(match.groups?.attrs ?? "");
    const payload = decodeCommentMarkerText(marker) ?? {};
    const line = lineNumberForOffset(lineStarts, match.index ?? 0);
    comments.push({
      id: attrs.id ?? "",
      timestamp: attrs.ts,
      path: file.path ?? file.relativePath,
      absolutePath: file.absolutePath,
      line,
      marker,
      note: typeof payload.note === "string" ? payload.note : "",
      hint: typeof payload.hint === "string" ? payload.hint : undefined,
    });
  }
  return comments;
}

function removeCommentMarkerLines(text, { id, all }) {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const hasTrailingNewline = /\r?\n$/.test(text);
  const lines = text.split(/\r?\n/);
  if (hasTrailingNewline) lines.pop();
  const kept = [];
  const removed = [];

  for (const [index, line] of lines.entries()) {
    if (!COMMENT_LINE_RE.test(line)) {
      kept.push(line);
      continue;
    }
    const attrs = parseMarkerAttributes(line);
    if (all || attrs.id === id) {
      removed.push({ id: attrs.id ?? "", timestamp: attrs.ts, line: index + 1, marker: line.trim() });
      continue;
    }
    kept.push(line);
  }

  return {
    text: `${kept.join(newline)}${hasTrailingNewline ? newline : ""}`,
    removed,
  };
}

function replaceCommentMarkerLine(text, { id, note, hint, timestamp }) {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const hasTrailingNewline = /\r?\n$/.test(text);
  const lines = text.split(/\r?\n/);
  if (hasTrailingNewline) lines.pop();

  for (const [index, line] of lines.entries()) {
    if (!COMMENT_LINE_RE.test(line)) continue;
    const attrs = parseMarkerAttributes(line);
    if (attrs.id !== id) continue;
    const marker = createCommentMarker({ id, timestamp, note, hint, syntax: commentMarkerSyntaxForLine(line) });
    lines[index] = `${line.match(/^\s*/)?.[0] ?? ""}${marker}`;
    return {
      text: `${lines.join(newline)}${hasTrailingNewline ? newline : ""}`,
      comment: {
        id,
        timestamp,
        line: index + 1,
        marker,
        note,
        hint: typeof hint === "string" && hint.trim() ? hint.trim() : undefined,
      },
    };
  }

  return { text, comment: null };
}

function parseMarkerAttributes(value) {
  const attrs = {};
  for (const match of String(value ?? "").matchAll(/\b([A-Za-z_:][-A-Za-z0-9_:.]*)="([^"]*)"/g)) {
    attrs[match[1]] = unescapeMarkerAttribute(match[2]);
  }
  return attrs;
}

function commentMarkerSyntaxForInsert(text, line, relativePath) {
  if (!String(relativePath).endsWith(".tsx")) return "jsx";
  const lines = String(text ?? "").split(/\r?\n/);
  const index = Math.min(Math.max(line - 1, 0), lines.length);
  const priorContent = lines.slice(0, index).some((entry) => entry.trim().length > 0);
  if (!priorContent) return "block";
  const targetLine = lines[index] ?? "";
  if (/^\s*(import\b|export\b|function\b|const\b|let\b|var\b|type\b|interface\b|return\b)/.test(targetLine)) {
    return "block";
  }
  return "jsx";
}

function commentMarkerSyntaxForLine(line) {
  return /^\s*\/\*/.test(line) ? "block" : "jsx";
}

function lineStartOffsets(text) {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") starts.push(index + 1);
  }
  return starts;
}

function lineNumberForOffset(starts, offset) {
  let line = 1;
  for (const [index, start] of starts.entries()) {
    if (start > offset) break;
    line = index + 1;
  }
  return line;
}

function createCommentId() {
  return `c-${crypto.randomBytes(4).toString("hex")}`;
}

function escapeMarkerAttribute(value) {
  return String(value ?? "").replace(/["&<>]/g, (char) => ({
    "\"": "&quot;",
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
  }[char]));
}

function unescapeMarkerAttribute(value) {
  return String(value ?? "")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
