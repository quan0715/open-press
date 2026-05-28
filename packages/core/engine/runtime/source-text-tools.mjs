import fs from "node:fs/promises";
import path from "node:path";
import { walkFiles } from "./file-walk.mjs";
import { resolveActiveSourceWorkspace } from "./source-workspace.mjs";

const MARKDOWN_EXTENSIONS = new Set([".md"]);
const ALL_SOURCE_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".md", ".mdx", ".mjs", ".ts", ".tsx"]);
const REACT_IMPLEMENTATION_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".mjs", ".ts", ".tsx"]);

export async function searchSourceText({ config, query, scope = "content", caseSensitive = false }) {
  const files = await collectSourceTextFiles(config, { scope });
  const rawMatches = [];
  for (const file of files) {
    rawMatches.push(...findLiteralMatches(file.text, query, { caseSensitive }).map((match) => ({
      ...match,
      scope: file.scope,
      file: file.name,
      path: file.relativePath,
    })));
  }
  const matches = rawMatches.map((match, index) => ({
    ...match,
    id: `match-${String(index + 1).padStart(4, "0")}`,
  }));

  return {
    kind: "search",
    query,
    scope,
    caseSensitive,
    matchCount: matches.length,
    files: summarizeFiles(matches),
    matches,
  };
}

export async function replaceSourceText({
  config,
  from,
  to,
  scope = "content",
  caseSensitive = false,
  includeCode = false,
  apply = false,
}) {
  const files = await collectSourceTextFiles(config, { scope });
  const changes = [];
  let matchCount = 0;

  for (const file of files) {
    const result = replaceLiteralMatches(file.text, from, to, { caseSensitive, includeCode });
    if (result.replacements.length === 0) continue;
    matchCount += result.replacements.length;
    changes.push({
      scope: file.scope,
      file: file.name,
      path: file.relativePath,
      absolutePath: file.absolutePath,
      replacements: result.replacements.map((replacement, index) => ({
        ...replacement,
        id: `replace-${String(matchCount - result.replacements.length + index + 1).padStart(4, "0")}`,
      })),
    });
    if (apply) {
      await fs.writeFile(file.absolutePath, result.text, "utf8");
    }
  }

  return {
    kind: "replace",
    from,
    to,
    scope,
    caseSensitive,
    includeCode,
    applied: apply,
    matchCount,
    fileCount: changes.length,
    changes,
  };
}

export async function applySourceBlockTextEdit({
  config,
  path: sourcePath,
  source,
  text,
  kind,
  name,
  blockId,
  cellIndex,
  sourceMode = false,
}) {
  const requestedPath = stringValue(sourcePath);
  if (!requestedPath) throw new Error("Source edit requires a source path.");
  const files = await collectSourceTextFiles(config, { scope: "content" });
  const file = files.find((candidate) => sourceTextPathMatches(candidate.relativePath, requestedPath));
  if (!file) throw new Error(`Editable source file not found: ${requestedPath}`);

  const result = sourceMode
    ? applySourceBlockSourceEditToText(file.text, { source, text, blockId })
    : applySourceBlockTextEditToText(file.text, {
        source,
        text,
        kind,
        name,
        blockId,
        cellIndex,
      });
  await fs.writeFile(file.absolutePath, result.text, "utf8");

  return {
    ...result.edit,
    path: file.relativePath,
    requestedPath,
    file: file.name,
  };
}

export async function readSourceBlockText({ config, path: sourcePath, source }) {
  const requestedPath = stringValue(sourcePath);
  if (!requestedPath) throw new Error("Source read requires a source path.");
  const files = await collectSourceTextFiles(config, { scope: "content" });
  const file = files.find((candidate) => sourceTextPathMatches(candidate.relativePath, requestedPath));
  if (!file) throw new Error(`Editable source file not found: ${requestedPath}`);
  return {
    path: file.relativePath,
    requestedPath,
    file: file.name,
    text: readSourceBlockTextFromText(file.text, { source }),
  };
}

export function readSourceBlockTextFromText(documentText, { source } = {}) {
  const sourceRange = normalizeSourceRange(source);
  const lines = splitTextLines(documentText);
  const startIndex = sourceRange.line - 1;
  const endIndex = sourceRange.endLine - 1;
  if (!lines[startIndex]) throw new Error(`Source read line ${sourceRange.line} is outside the source file.`);
  if (!lines[endIndex]) throw new Error(`Source read end line ${sourceRange.endLine} is outside the source file.`);
  return lines.slice(startIndex, endIndex + 1).map((line) => line.line).join("\n");
}

export function applySourceBlockSourceEditToText(documentText, {
  source,
  text,
  blockId,
} = {}) {
  const sourceRange = normalizeSourceRange(source);
  const replacementText = normalizeRawSourceText(text);
  const lines = splitTextLines(documentText);
  const startIndex = sourceRange.line - 1;
  const endIndex = sourceRange.endLine - 1;
  if (!lines[startIndex]) throw new Error(`Source edit line ${sourceRange.line} is outside the source file.`);
  if (!lines[endIndex]) throw new Error(`Source edit end line ${sourceRange.endLine} is outside the source file.`);

  const selectedLines = lines.slice(startIndex, endIndex + 1);
  const replacementLines = replacementText.split("\n");
  const ending = selectedLines[selectedLines.length - 1].ending;
  const nextLines = [
    ...lines.slice(0, startIndex),
    ...replacementLines.map((line, index) => ({
      line,
      ending: index === replacementLines.length - 1 ? ending : "\n",
    })),
    ...lines.slice(endIndex + 1),
  ];

  return {
    text: joinTextLines(nextLines),
    edit: {
      blockId,
      line: sourceRange.line,
      column: sourceRange.column,
      endLine: sourceRange.endLine,
      endColumn: sourceRange.endColumn,
      before: selectedLines.map((line) => line.line).join("\n"),
      after: replacementText,
      text: replacementText,
    },
  };
}

export function applySourceBlockTextEditToText(documentText, {
  source,
  text,
  kind,
  name,
  blockId,
  cellIndex,
} = {}) {
  if (kind === "table-cell") {
    return applySourceBlockTableCellEditToText(documentText, {
      source,
      text,
      blockId,
      cellIndex,
    });
  }
  if (kind === "component-caption") {
    return applySourceBlockComponentCaptionEditToText(documentText, {
      source,
      text,
      blockId,
      name,
    });
  }
  if (kind === "element" && name === "pre") {
    return applySourceBlockCodeEditToText(documentText, {
      source,
      text,
      blockId,
    });
  }
  if (kind === "element" && (name === "caption" || name === "figcaption")) {
    return applySourceBlockCaptionEditToText(documentText, {
      source,
      text,
      blockId,
      name,
    });
  }

  assertEditableSourceBlock({ kind, name, blockId });
  const sourceRange = normalizeSourceRange(source);
  const replacementText = normalizeEditedText(text);
  const lines = splitTextLines(documentText);
  const startIndex = sourceRange.line - 1;
  const endIndex = sourceRange.endLine - 1;

  if (!lines[startIndex]) {
    throw new Error(`Source edit line ${sourceRange.line} is outside the source file.`);
  }
  if (!lines[endIndex]) {
    throw new Error(`Source edit end line ${sourceRange.endLine} is outside the source file.`);
  }

  const selectedLines = lines.slice(startIndex, endIndex + 1);
  const firstLine = selectedLines[0].line;
  if (!isEditableMarkdownLine(firstLine, { kind, name })) {
    throw new Error("Only rendered text blocks can be edited from the document surface.");
  }

  const prefix = markdownTextPrefix(firstLine, { kind, name });
  const after = `${prefix}${replacementText}`;
  const ending = selectedLines[selectedLines.length - 1].ending;
  const nextLines = [
    ...lines.slice(0, startIndex),
    { line: after, ending },
    ...lines.slice(endIndex + 1),
  ];

  return {
    text: joinTextLines(nextLines),
    edit: {
      blockId,
      line: sourceRange.line,
      column: sourceRange.column,
      endLine: sourceRange.endLine,
      endColumn: sourceRange.endColumn,
      before: selectedLines.map((line) => line.line).join("\n"),
      after,
      text: replacementText,
    },
  };
}

function applySourceBlockCodeEditToText(documentText, {
  source,
  text,
  blockId,
} = {}) {
  const sourceRange = normalizeSourceRange(source);
  const replacementText = normalizeCodeBlockText(text);
  const lines = splitTextLines(documentText);
  const startIndex = sourceRange.line - 1;
  const endIndex = sourceRange.endLine - 1;

  if (!lines[startIndex]) throw new Error(`Source edit line ${sourceRange.line} is outside the source file.`);
  if (!lines[endIndex]) throw new Error(`Source edit end line ${sourceRange.endLine} is outside the source file.`);

  const selectedLines = lines.slice(startIndex, endIndex + 1);
  const openingFence = selectedLines[0]?.line ?? "";
  const closingFence = selectedLines.at(-1)?.line ?? "";
  if (selectedLines.length < 2 || !isFenceLine(openingFence) || !isFenceLine(closingFence)) {
    throw new Error("Code block edits require a fenced markdown code block source range.");
  }

  const replacementLines = replacementText ? replacementText.split("\n") : [];
  const afterLines = [openingFence, ...replacementLines, closingFence];
  const ending = selectedLines[selectedLines.length - 1].ending;
  const nextLines = [
    ...lines.slice(0, startIndex),
    ...afterLines.map((line, index) => ({
      line,
      ending: index === afterLines.length - 1 ? ending : "\n",
    })),
    ...lines.slice(endIndex + 1),
  ];
  const after = afterLines.join("\n");

  return {
    text: joinTextLines(nextLines),
    edit: {
      blockId,
      line: sourceRange.line,
      column: sourceRange.column,
      endLine: sourceRange.endLine,
      endColumn: sourceRange.endColumn,
      before: selectedLines.map((line) => line.line).join("\n"),
      after,
      text: replacementText,
    },
  };
}

function applySourceBlockCaptionEditToText(documentText, {
  source,
  text,
  blockId,
  name,
} = {}) {
  const sourceRange = normalizeSourceRange(source);
  const replacementText = normalizeEditedText(text);
  const lines = splitTextLines(documentText);
  const startIndex = sourceRange.line - 1;
  const endIndex = sourceRange.endLine - 1;

  if (!lines[startIndex]) throw new Error(`Source edit line ${sourceRange.line} is outside the source file.`);
  if (!lines[endIndex]) throw new Error(`Source edit end line ${sourceRange.endLine} is outside the source file.`);

  const selectedLines = lines.slice(startIndex, endIndex + 1);
  const before = selectedLines.map((line) => line.line).join("\n");
  const after = replaceCaptionText(before, replacementText, name);
  const replacementLines = after.split("\n");
  const ending = selectedLines[selectedLines.length - 1].ending;
  const nextLines = [
    ...lines.slice(0, startIndex),
    ...replacementLines.map((line, index) => ({
      line,
      ending: index === replacementLines.length - 1 ? ending : "\n",
    })),
    ...lines.slice(endIndex + 1),
  ];

  return {
    text: joinTextLines(nextLines),
    edit: {
      blockId,
      line: sourceRange.line,
      column: sourceRange.column,
      endLine: sourceRange.endLine,
      endColumn: sourceRange.endColumn,
      before,
      after,
      text: replacementText,
    },
  };
}

function applySourceBlockTableCellEditToText(documentText, {
  source,
  text,
  blockId,
  cellIndex,
} = {}) {
  const sourceRange = normalizeSourceRange(source);
  if (sourceRange.endLine !== sourceRange.line) {
    throw new Error("Table cell edits must target a single markdown table row.");
  }
  const replacementText = normalizeEditedText(text);
  const targetCellIndex = nonNegativeInteger(cellIndex, "cellIndex");
  const lines = splitTextLines(documentText);
  const rowIndex = sourceRange.line - 1;
  const row = lines[rowIndex];
  if (!row) throw new Error(`Source edit line ${sourceRange.line} is outside the source file.`);
  if (!isMarkdownTableRow(row.line)) {
    throw new Error("Table cell edits require a markdown table row source line.");
  }

  const after = replaceMarkdownTableCell(row.line, targetCellIndex, replacementText);
  const nextLines = [
    ...lines.slice(0, rowIndex),
    { line: after, ending: row.ending },
    ...lines.slice(rowIndex + 1),
  ];

  return {
    text: joinTextLines(nextLines),
    edit: {
      blockId,
      line: sourceRange.line,
      column: sourceRange.column,
      endLine: sourceRange.endLine,
      endColumn: sourceRange.endColumn,
      before: row.line,
      after,
      text: replacementText,
      cellIndex: targetCellIndex,
    },
  };
}

export async function collectSourceTextFiles(config, { scope = "content" } = {}) {
  const roots = await sourceRoots(config, scope);
  const files = [];
  for (const rootInfo of roots) {
    const visit = async (absolutePath) => {
      const extension = path.extname(absolutePath);
      if (!rootInfo.extensions.has(extension)) return;
      const relativePath = path.relative(config.root, absolutePath).replaceAll("\\", "/");
      files.push({
        scope: rootInfo.scope,
        name: path.basename(absolutePath),
        absolutePath,
        relativePath,
        text: await fs.readFile(absolutePath, "utf8"),
      });
    };
    if (rootInfo.kind === "file") {
      try {
        await fs.access(rootInfo.absolutePath);
        await visit(rootInfo.absolutePath);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    } else {
      await walkFiles(rootInfo.absolutePath, visit);
    }
  }
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return files;
}

export function findLiteralMatches(text, query, { caseSensitive = false } = {}) {
  if (!query) return [];
  const matches = [];
  forEachLine(text, ({ line, lineNumber, lineOffset }) => {
    for (const range of findLineMatches(line, query, { caseSensitive })) {
      matches.push({
        line: lineNumber,
        column: range.start + 1,
        index: lineOffset + range.start,
        text: line.slice(range.start, range.end),
        preview: previewLine(line, range.start, range.end),
      });
    }
  });
  return matches;
}

export function replaceLiteralMatches(text, from, to, { caseSensitive = false, includeCode = false } = {}) {
  if (!from) return { text, replacements: [] };
  let output = "";
  const replacements = [];
  let inFence = false;

  forEachLine(text, ({ line, ending, lineNumber, lineOffset }) => {
    const fenceLine = isFenceLine(line);
    const replaceLine = includeCode || (!inFence && !fenceLine);
    if (!replaceLine) {
      output += line + ending;
      if (fenceLine) inFence = !inFence;
      return;
    }

    const ranges = findLineMatches(line, from, { caseSensitive });
    if (ranges.length === 0) {
      output += line + ending;
      if (fenceLine) inFence = !inFence;
      return;
    }

    let nextLine = "";
    let cursor = 0;
    for (const range of ranges) {
      nextLine += line.slice(cursor, range.start) + to;
      replacements.push({
        line: lineNumber,
        column: range.start + 1,
        index: lineOffset + range.start,
        before: line,
        after: replaceRangesInLine(line, ranges, to),
        text: line.slice(range.start, range.end),
        replacement: to,
        previewBefore: previewLine(line, range.start, range.end),
        previewAfter: previewLine(replaceRangesInLine(line, ranges, to), range.start, range.start + to.length),
      });
      cursor = range.end;
    }
    nextLine += line.slice(cursor);
    output += nextLine + ending;
    if (fenceLine) inFence = !inFence;
  });

  return { text: output, replacements };
}

async function sourceRoots(config, scope) {
  const sourceWorkspace = await resolveActiveSourceWorkspace(config);
  const sourceConfig = sourceWorkspace.config;
  const contentRoots = (sourceWorkspace.contentRoots ?? [{ kind: "dir", absolutePath: sourceWorkspace.sourceDir }]).map((root) => ({
    scope: "content",
    kind: root.kind,
    absolutePath: root.absolutePath,
    extensions: sourceWorkspace.contentExtensions,
  }));

  if (scope === "all") {
    const roots = [
      ...contentRoots,
      { scope: "design-doc", kind: "file", absolutePath: sourceConfig.paths.designDoc, extensions: MARKDOWN_EXTENSIONS },
      { scope: "components", kind: "dir", absolutePath: sourceConfig.paths.componentsDir, extensions: ALL_SOURCE_EXTENSIONS },
      { scope: "document-entry", kind: "file", absolutePath: sourceWorkspace.entryPath, extensions: REACT_IMPLEMENTATION_EXTENSIONS },
      ...implementationRoots(sourceWorkspace),
    ];
    return roots;
  }
  return contentRoots;
}

function implementationRoots(sourceWorkspace) {
  const roots = [];
  const seen = new Set();
  for (const root of sourceWorkspace.contentRoots ?? [{ kind: "dir", absolutePath: sourceWorkspace.sourceDir }]) {
    const absolutePath = root.kind === "dir" ? root.absolutePath : path.dirname(root.absolutePath);
    if (seen.has(absolutePath)) continue;
    seen.add(absolutePath);
    roots.push({
      scope: "source-implementation",
      kind: "dir",
      absolutePath,
      extensions: REACT_IMPLEMENTATION_EXTENSIONS,
    });
  }
  return roots;
}

function forEachLine(text, visit) {
  const lineRe = /([^\r\n]*)(\r\n|\n|\r|$)/g;
  let lineNumber = 1;
  let offset = 0;
  let match;
  while ((match = lineRe.exec(text))) {
    const [full, line, ending] = match;
    if (full === "") break;
    visit({ line, ending, lineNumber, lineOffset: offset });
    offset += full.length;
    lineNumber += 1;
  }
}

function findLineMatches(line, query, { caseSensitive }) {
  const haystack = caseSensitive ? line : line.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();
  const ranges = [];
  let cursor = 0;
  while (needle && cursor <= haystack.length) {
    const start = haystack.indexOf(needle, cursor);
    if (start < 0) break;
    const end = start + needle.length;
    ranges.push({ start, end });
    cursor = end;
  }
  return ranges;
}

function replaceRangesInLine(line, ranges, replacement) {
  let output = "";
  let cursor = 0;
  for (const range of ranges) {
    output += line.slice(cursor, range.start) + replacement;
    cursor = range.end;
  }
  return output + line.slice(cursor);
}

function previewLine(line, start, end) {
  const previewStart = Math.max(0, start - 40);
  const previewEnd = Math.min(line.length, end + 40);
  const prefix = previewStart > 0 ? "..." : "";
  const suffix = previewEnd < line.length ? "..." : "";
  return `${prefix}${line.slice(previewStart, previewEnd)}${suffix}`;
}

function summarizeFiles(matches) {
  const summaries = new Map();
  for (const match of matches) {
    const current = summaries.get(match.path) ?? {
      scope: match.scope,
      file: match.file,
      path: match.path,
      matchCount: 0,
    };
    current.matchCount += 1;
    summaries.set(match.path, current);
  }
  return Array.from(summaries.values());
}

function isFenceLine(line) {
  return /^\s*(```|~~~)/.test(line);
}

function assertEditableSourceBlock({ kind, name, blockId }) {
  if (kind === "list-item") return;
  if (kind === "element" && isEditableElementName(name)) return;
  throw new Error(`Only rendered text blocks can be edited from the document surface${blockId ? `: ${blockId}` : ""}.`);
}

function isEditableElementName(name) {
  return typeof name === "string" && /^(h[1-6]|p|blockquote)$/.test(name);
}

function normalizeSourceRange(source) {
  const line = positiveInteger(source?.line, "line");
  const column = positiveInteger(source?.column ?? 1, "column");
  const endLine = positiveInteger(source?.endLine ?? line, "endLine");
  const endColumn = positiveInteger(source?.endColumn ?? column, "endColumn");
  if (endLine < line) throw new Error("Source edit endLine must be greater than or equal to line.");
  return { line, column, endLine, endColumn };
}

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`Source edit ${label} must be a positive integer.`);
  }
  return number;
}

function nonNegativeInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`Source edit ${label} must be a non-negative integer.`);
  }
  return number;
}

function normalizeEditedText(value) {
  if (typeof value !== "string") throw new Error("Source edit text must be a string.");
  return value.replace(/\s*\r?\n\s*/g, " ").trim();
}

function normalizeCodeBlockText(value) {
  if (typeof value !== "string") throw new Error("Source edit text must be a string.");
  return value.replace(/\r\n?/g, "\n").replace(/^\n+|\n+$/g, "");
}

function normalizeRawSourceText(value) {
  if (typeof value !== "string") throw new Error("Source edit text must be a string.");
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  if (!normalized) throw new Error("Source edit text must not be empty.");
  return normalized;
}

function splitTextLines(text) {
  const rows = [];
  const lineRe = /([^\r\n]*)(\r\n|\n|\r|$)/g;
  let match;
  while ((match = lineRe.exec(text))) {
    const [full, line, ending] = match;
    if (full === "") break;
    rows.push({ line, ending });
  }
  return rows.length > 0 ? rows : [{ line: "", ending: "" }];
}

function joinTextLines(lines) {
  return lines.map(({ line, ending }) => `${line}${ending}`).join("");
}

function isEditableMarkdownLine(line, { kind, name }) {
  if (isFenceLine(line)) return false;
  if (/^\s*(?:import|export)\b/.test(line)) return false;
  if (/^\s*[<{}]/.test(line)) return false;
  if (/^\s*\|/.test(line)) return false;
  if (kind === "list-item") return /^(\s*(?:[-*+]|\d+[.)])\s+)/.test(line);
  if (name && /^h[1-6]$/.test(name)) return /^(\s{0,3}#{1,6}\s+)/.test(line);
  return true;
}

function isMarkdownTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function replaceMarkdownTableCell(line, cellIndex, replacementText) {
  const parts = splitMarkdownTableRow(line);
  const firstCellPartIndex = parts[0] === "" ? 1 : 0;
  const lastCellPartIndex = parts.at(-1) === "" ? parts.length - 2 : parts.length - 1;
  const targetPartIndex = firstCellPartIndex + cellIndex;
  if (targetPartIndex > lastCellPartIndex) {
    throw new Error(`Markdown table row does not contain cell index ${cellIndex}.`);
  }
  parts[targetPartIndex] = replaceTableCellContent(parts[targetPartIndex], replacementText);
  return parts.join("|");
}

function splitMarkdownTableRow(line) {
  const parts = [];
  let current = "";
  let escaped = false;
  for (const char of line) {
    if (char === "|" && !escaped) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
    escaped = char === "\\" && !escaped;
    if (char !== "\\") escaped = false;
  }
  parts.push(current);
  return parts;
}

function replaceTableCellContent(cell, replacementText) {
  const match = cell.match(/^(\s*)(.*?)(\s*)$/);
  if (!match) return replacementText;
  const leading = match[1] || " ";
  const trailing = match[3] || " ";
  return `${leading}${replacementText}${trailing}`;
}

function markdownTextPrefix(line, { kind, name }) {
  if (kind === "list-item") return line.match(/^(\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?)/)?.[1] ?? "- ";
  if (name && /^h[1-6]$/.test(name)) return line.match(/^(\s{0,3}#{1,6}\s+)/)?.[1] ?? `${"#".repeat(Number(name.slice(1)))} `;
  if (name === "blockquote") return line.match(/^(\s{0,3}>\s*)/)?.[1] ?? "> ";
  return "";
}

function replaceCaptionText(sourceText, replacementText, name) {
  const componentMatch = sourceText.match(/^(\s*<TableCaption(?:\s[^>]*)?>)([\s\S]*?)(<\/TableCaption>\s*)$/);
  if (componentMatch) return `${componentMatch[1]}${replacementText}${componentMatch[3]}`;

  const tagName = name === "figcaption" ? "figcaption" : "caption";
  const tagRe = new RegExp(`^(\\s*<${tagName}(?:\\s[^>]*)?>)([\\s\\S]*?)(<\\/${tagName}>\\s*)$`);
  const tagMatch = sourceText.match(tagRe);
  if (tagMatch) return `${tagMatch[1]}${replacementText}${tagMatch[3]}`;

  throw new Error("Caption edits require a source-mapped TableCaption or caption element.");
}

function applySourceBlockComponentCaptionEditToText(documentText, {
  source,
  text,
  blockId,
  name,
} = {}) {
  assertEditableComponentCaption({ name, blockId });
  const sourceRange = normalizeSourceRange(source);
  const replacementText = normalizeEditedText(text);
  const lines = splitTextLines(documentText);
  const startIndex = sourceRange.line - 1;
  const endIndex = sourceRange.endLine - 1;

  if (!lines[startIndex]) {
    throw new Error(`Source edit line ${sourceRange.line} is outside the source file.`);
  }
  if (!lines[endIndex]) {
    throw new Error(`Source edit end line ${sourceRange.endLine} is outside the source file.`);
  }

  const selectedLines = lines.slice(startIndex, endIndex + 1);
  const before = selectedLines.map((line) => line.line).join("\n");
  const after = replaceComponentCaptionProp(before, replacementText);
  const replacementLines = after.split("\n");
  const ending = selectedLines[selectedLines.length - 1].ending;
  const nextLines = [
    ...lines.slice(0, startIndex),
    ...replacementLines.map((line, index) => ({
      line,
      ending: index === replacementLines.length - 1 ? ending : "\n",
    })),
    ...lines.slice(endIndex + 1),
  ];

  return {
    text: joinTextLines(nextLines),
    edit: {
      blockId,
      line: sourceRange.line,
      column: sourceRange.column,
      endLine: sourceRange.endLine,
      endColumn: sourceRange.endColumn,
      before,
      after,
      text: replacementText,
    },
  };
}

function assertEditableComponentCaption({ name, blockId }) {
  if (name === "MediaFigure" || name === "ImageFigure") return;
  throw new Error(`Only MediaFigure and ImageFigure caption props can be edited inline${blockId ? `: ${blockId}` : ""}.`);
}

function replaceComponentCaptionProp(sourceText, replacementText) {
  const attrRe = /(\bcaption\s*=\s*)(["'])([\s\S]*?)(\2)/m;
  const attrMatch = sourceText.match(attrRe);
  if (!attrMatch) {
    throw new Error("Figure caption edits require a quoted caption prop.");
  }
  const quote = attrMatch[2];
  const escapedReplacement = escapeJsxAttributeValue(replacementText, quote);
  return sourceText.replace(attrRe, `$1${quote}${escapedReplacement}${quote}`);
}

function escapeJsxAttributeValue(value, quote) {
  const quoted = String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return quote === '"'
    ? quoted.replaceAll('"', "&quot;")
    : quoted.replaceAll("'", "&#39;");
}

function sourceTextPathMatches(candidatePath, requestedPath) {
  return normalizeSourceTextPath(candidatePath) === normalizeSourceTextPath(requestedPath);
}

function normalizeSourceTextPath(value) {
  return String(value ?? "")
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/^press\//, "");
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}
