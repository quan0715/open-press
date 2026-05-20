import fs from "node:fs/promises";
import path from "node:path";

const CONTENT_EXTENSIONS = new Set([".md"]);
const ALL_SOURCE_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".ts", ".tsx"]);

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

export async function collectSourceTextFiles(config, { scope = "content" } = {}) {
  const roots = sourceRoots(config, scope);
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

function sourceRoots(config, scope) {
  if (scope === "all") {
    return [
      { scope: "content", kind: "dir", absolutePath: config.paths.sourceDir, extensions: CONTENT_EXTENSIONS },
      { scope: "design-doc", kind: "file", absolutePath: config.paths.designDoc, extensions: CONTENT_EXTENSIONS },
      { scope: "components", kind: "dir", absolutePath: config.paths.componentsDir, extensions: ALL_SOURCE_EXTENSIONS },
    ];
  }
  return [{ scope: "content", kind: "dir", absolutePath: config.paths.sourceDir, extensions: CONTENT_EXTENSIONS }];
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
