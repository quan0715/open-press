import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { loadQDocConfig } from "../config.mjs";
import { collectSourceTextFiles } from "../source-text-tools.mjs";

const EDITABLE_QDOC_SOURCE_PATTERNS = [
  /^document\/index\.tsx$/,
  /^document\/chapters\/[^/]+\/content\/[^/]+\.mdx$/,
  /^document\/chapters\/[^/]+\/chapter\.tsx$/,
  /^document\/chapters\/[^/]+\/components\/.+\.tsx$/,
  /^document\/components\/.+\.tsx$/,
];
const QDOC_COMMENT_MARKER_RE = /\{\/\*\s*@qdoc-comment\b(?<attrs>[^*]*)\*\/\}/g;
const QDOC_COMMENT_LINE_RE = /^\s*\{\/\*\s*@qdoc-comment\b[^*]*\*\/\}\s*$/;

export async function insertQDocCommentMarker({
  root = ".",
  path: sourcePath,
  source,
  note,
  hint,
  id = createQDocCommentId(),
  timestamp = new Date().toISOString(),
} = {}) {
  const workspaceRoot = path.resolve(root);
  const relativePath = normalizeEditableSourcePath(sourcePath);
  assertEditableQDocCommentPath(relativePath);
  const absolutePath = path.resolve(workspaceRoot, relativePath);
  if (!absolutePath.startsWith(`${workspaceRoot}${path.sep}`)) {
    throw new Error(`QDoc comment target path escapes workspace: ${sourcePath}`);
  }

  const noteText = normalizedNote(note);
  const marker = createQDocCommentMarker({ id, timestamp, note: noteText, hint });
  const line = normalizeLineNumber(source?.line);
  const text = await fs.readFile(absolutePath, "utf8");
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

export function createQDocCommentMarker({ id = createQDocCommentId(), timestamp = new Date().toISOString(), note, hint } = {}) {
  const payload = { note: normalizedNote(note), ...(typeof hint === "string" && hint.trim() ? { hint: hint.trim() } : {}) };
  return `{/* @qdoc-comment id="${escapeMarkerAttribute(id)}" ts="${escapeMarkerAttribute(timestamp)}" text="${encodeQDocCommentPayload(payload)}" */}`;
}

export function decodeQDocCommentMarkerText(marker) {
  const match = String(marker ?? "").match(/\btext="([^"]+)"/);
  if (!match) return null;
  return JSON.parse(Buffer.from(match[1], "base64url").toString("utf8"));
}

export async function listQDocCommentMarkers({ root = "." } = {}) {
  const config = await loadQDocConfig(root);
  const files = await collectSourceTextFiles(config, { scope: "all" });
  const comments = [];

  for (const file of files) {
    if (!isEditableQDocCommentPath(file.path ?? file.relativePath)) continue;
    comments.push(...extractQDocCommentMarkers(file));
  }

  comments.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line || a.id.localeCompare(b.id));
  return comments;
}

export async function clearQDocCommentMarkers({ root = ".", id = null, all = false } = {}) {
  if (!all && !(typeof id === "string" && id.trim())) {
    throw new Error("QDoc comment clear requires an `id` or `all: true`.");
  }

  const config = await loadQDocConfig(root);
  const files = await collectSourceTextFiles(config, { scope: "all" });
  const removed = [];

  for (const file of files) {
    if (!isEditableQDocCommentPath(file.path ?? file.relativePath)) continue;
    const next = removeQDocCommentMarkerLines(file.text, { id, all });
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

export function assertEditableQDocCommentPath(relativePath) {
  if (!isEditableQDocCommentPath(relativePath)) {
    throw new Error(`QDoc comment target is not an editable QDoc document source: ${relativePath}`);
  }
}

export function isEditableQDocCommentPath(relativePath) {
  return EDITABLE_QDOC_SOURCE_PATTERNS.some((pattern) => pattern.test(relativePath));
}

function normalizeEditableSourcePath(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("QDoc comment target requires a source path.");
  }
  const normalized = value.trim().replaceAll("\\", "/").replace(/^\.\//, "");
  if (path.posix.isAbsolute(normalized) || normalized.includes("\0") || normalized === "." || normalized.startsWith("../")) {
    throw new Error(`QDoc comment target path is invalid: ${value}`);
  }
  return path.posix.normalize(normalized);
}

function normalizeLineNumber(value) {
  const line = Number(value);
  if (!Number.isInteger(line) || line < 1) {
    throw new Error("QDoc comment target requires a 1-based source line.");
  }
  return line;
}

function normalizedNote(value) {
  const note = typeof value === "string" ? value.trim() : "";
  if (!note) throw new Error("QDoc comment note must not be empty.");
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

function encodeQDocCommentPayload(payload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function extractQDocCommentMarkers(file) {
  const comments = [];
  const text = String(file.text ?? "");
  const lineStarts = lineStartOffsets(text);
  for (const match of text.matchAll(QDOC_COMMENT_MARKER_RE)) {
    const marker = match[0];
    const attrs = parseMarkerAttributes(match.groups?.attrs ?? "");
    const payload = decodeQDocCommentMarkerText(marker) ?? {};
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

function removeQDocCommentMarkerLines(text, { id, all }) {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const hasTrailingNewline = /\r?\n$/.test(text);
  const lines = text.split(/\r?\n/);
  if (hasTrailingNewline) lines.pop();
  const kept = [];
  const removed = [];

  for (const [index, line] of lines.entries()) {
    if (!QDOC_COMMENT_LINE_RE.test(line)) {
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

function parseMarkerAttributes(value) {
  const attrs = {};
  for (const match of String(value ?? "").matchAll(/\b([A-Za-z_:][-A-Za-z0-9_:.]*)="([^"]*)"/g)) {
    attrs[match[1]] = unescapeMarkerAttribute(match[2]);
  }
  return attrs;
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

function createQDocCommentId() {
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
