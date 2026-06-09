// Browser-safe literal-substring search over rendered page content or a
// build-time corpus (<outputDir>/openpress/search-corpus.json). Mirrors
// the `searchSourceText` logic in engine/runtime/source-text-tools.mjs so
// public deploys can search without the /__openpress/search dev endpoint.

export type SearchScope = "content" | "all";

export interface SearchCorpusFile {
  scope: string;
  file: string;
  path: string;
  text: string;
}

export interface SearchCorpus {
  kind: "search-corpus";
  version: number;
  files: SearchCorpusFile[];
}

export interface SearchReportFile {
  scope: string;
  file: string;
  path: string;
  matchCount: number;
}

export interface SearchReportMatch {
  id: string;
  scope: string;
  file: string;
  path: string;
  line: number;
  column: number;
  index: number;
  text: string;
  preview: string;
}

export interface SearchReport {
  ok?: boolean;
  kind: "search";
  query: string;
  scope: SearchScope;
  caseSensitive: boolean;
  matchCount: number;
  files: SearchReportFile[];
  matches: SearchReportMatch[];
  message?: string;
}

export interface SearchCorpusQueryOptions {
  query: string;
  scope?: SearchScope;
  caseSensitive?: boolean;
}

// Structural type so shared/ doesn't depend on document-model.
export interface SearchablePage {
  pageNumber: number;
  title?: string | null;
  html: string;
  anchors?: string[];
}

/**
 * In-browser search over rendered page HTML. Results use `path = "page:{N}"`
 * and `file = page title` so callers can distinguish them from source-file
 * results and jump directly to the page index without sourceBlocksByPath.
 */
export function searchPages(pages: readonly SearchablePage[], options: SearchCorpusQueryOptions): SearchReport {
  const query = options.query;
  const caseSensitive = options.caseSensitive ?? false;
  const matches: SearchReportMatch[] = [];

  if (!query) {
    return { kind: "search", query, scope: "content", caseSensitive, matchCount: 0, files: [], matches: [] };
  }

  for (const page of pages) {
    const pageIndex = page.pageNumber - 1;
    const text = extractPageText(page);
    const rawMatches = findLiteralMatches(text, query, { caseSensitive });
    for (const match of rawMatches) {
      matches.push({
        id: `match-${String(matches.length + 1).padStart(4, "0")}`,
        scope: "page",
        file: page.title || `Page ${page.pageNumber}`,
        path: `page:${pageIndex}`,
        line: match.line,
        column: match.column,
        index: match.index,
        text: match.text,
        preview: match.preview,
      });
    }
  }

  return {
    kind: "search",
    query,
    scope: "content",
    caseSensitive,
    matchCount: matches.length,
    files: summarizeFiles(matches),
    matches,
  };
}

function extractPageText(page: SearchablePage): string {
  const parts: string[] = [];
  if (page.title) parts.push(page.title);
  const bodyText = page.html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (bodyText) parts.push(bodyText);
  if (page.anchors?.length) parts.push(page.anchors.join(" "));
  return parts.join("\n");
}

export function searchCorpus(corpus: SearchCorpus, options: SearchCorpusQueryOptions): SearchReport {
  const query = options.query;
  const scope: SearchScope = options.scope ?? "content";
  const caseSensitive = options.caseSensitive ?? false;
  const matches: SearchReportMatch[] = [];

  if (!query) {
    return { kind: "search", query, scope, caseSensitive, matchCount: 0, files: [], matches: [] };
  }

  for (const file of corpus.files) {
    const rawMatches = findLiteralMatches(file.text, query, { caseSensitive });
    for (const match of rawMatches) {
      matches.push({
        id: `match-${String(matches.length + 1).padStart(4, "0")}`,
        scope: file.scope,
        file: file.file,
        path: file.path,
        line: match.line,
        column: match.column,
        index: match.index,
        text: match.text,
        preview: match.preview,
      });
    }
  }

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

interface RawMatch {
  line: number;
  column: number;
  index: number;
  text: string;
  preview: string;
}

function findLiteralMatches(text: string, query: string, options: { caseSensitive: boolean }): RawMatch[] {
  if (!query) return [];
  const matches: RawMatch[] = [];
  forEachLine(text, ({ line, lineNumber, lineOffset }) => {
    for (const range of findLineMatches(line, query, options)) {
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

function findLineMatches(line: string, query: string, { caseSensitive }: { caseSensitive: boolean }) {
  const haystack = caseSensitive ? line : line.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();
  const ranges: { start: number; end: number }[] = [];
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

function previewLine(line: string, start: number, end: number) {
  const previewStart = Math.max(0, start - 40);
  const previewEnd = Math.min(line.length, end + 40);
  const prefix = previewStart > 0 ? "..." : "";
  const suffix = previewEnd < line.length ? "..." : "";
  return `${prefix}${line.slice(previewStart, previewEnd)}${suffix}`;
}

function forEachLine(
  text: string,
  visit: (info: { line: string; ending: string; lineNumber: number; lineOffset: number }) => void,
) {
  const lineRe = /([^\r\n]*)(\r\n|\n|\r|$)/g;
  let lineNumber = 1;
  let offset = 0;
  let match: RegExpExecArray | null;
  while ((match = lineRe.exec(text))) {
    const [full, line, ending] = match;
    if (full === "") break;
    visit({ line, ending, lineNumber, lineOffset: offset });
    offset += full.length;
    lineNumber += 1;
  }
}

function summarizeFiles(matches: SearchReportMatch[]): SearchReportFile[] {
  const grouped = new Map<string, SearchReportFile>();
  for (const match of matches) {
    const current = grouped.get(match.path) ?? {
      scope: match.scope,
      file: match.file,
      path: match.path,
      matchCount: 0,
    };
    current.matchCount += 1;
    grouped.set(match.path, current);
  }
  return Array.from(grouped.values());
}
