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
  /** Zero-based occurrence index within one rendered page. */
  pageOccurrenceIndex?: number;
  /** Number of literal occurrences represented by this context result. */
  occurrenceCount?: number;
}

export interface SearchReport {
  ok?: boolean;
  kind: "search";
  query: string;
  scope: SearchScope;
  caseSensitive: boolean;
  matchCount: number;
  occurrenceCount?: number;
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

export function resolveCleanPageTitle(page: SearchablePage): string {
  if (page.title) {
    if (page.title === "cover") return "封面";
    if (page.title === "toc") return "目錄";
    if (!isInternalIdentifier(page.title)) return page.title;
  }
  const headingMatch = (page.html || "").match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/i);
  if (headingMatch && headingMatch[1]) {
    const headingText = headingMatch[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
      .trim();
    if (headingText && !isInternalIdentifier(headingText)) {
      return headingText;
    }
  }
  return `第 ${page.pageNumber} 頁`;
}

function isInternalIdentifier(str: string): boolean {
  if (!str) return true;
  return /^(story|frame|page|block|mdx-area)[:\-_]/i.test(str) || (str.includes(":") && str.includes("content"));
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
  let occurrenceCount = 0;

  if (!query) {
    return { kind: "search", query, scope: "content", caseSensitive, matchCount: 0, files: [], matches: [] };
  }

  for (const page of pages) {
    const pageIndex = page.pageNumber - 1;
    const resolvedTitle = resolveCleanPageTitle(page);
    const text = extractPageText(page);
    const rawMatches = findLiteralMatches(text, query, { caseSensitive });
    occurrenceCount += rawMatches.length;
    for (const match of groupPageMatchesByContext(rawMatches)) {
      matches.push({
        id: `match-${String(matches.length + 1).padStart(4, "0")}`,
        scope: "page",
        file: resolvedTitle,
        path: `page:${pageIndex}`,
        line: match.line,
        column: match.column,
        index: match.index,
        text: match.text,
        preview: match.preview,
        pageOccurrenceIndex: match.pageOccurrenceIndex,
        occurrenceCount: match.occurrenceCount,
      });
    }
  }

  return {
    kind: "search",
    query,
    scope: "content",
    caseSensitive,
    matchCount: matches.length,
    occurrenceCount,
    files: summarizeFiles(matches),
    matches,
  };
}

function extractPageText(page: SearchablePage): string {
  const cleanHtml = (page.html || "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, " ");

  const text = cleanHtml
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article|header|footer|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return text;
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

interface PageMatchContext extends RawMatch {
  pageOccurrenceIndex: number;
  occurrenceCount: number;
}

export interface SearchTextRange {
  start: number;
  end: number;
}

/**
 * Finds non-overlapping text ranges while treating a single word join as
 * optional. This makes `openpress`, `open-press`, `open_press`, and
 * `open press` equivalent without turning every character boundary into a
 * fuzzy match.
 */
export function findSearchTextRanges(
  text: string,
  query: string,
  { caseSensitive = false }: { caseSensitive?: boolean } = {},
): SearchTextRange[] {
  if (!query) return [];

  const compactQuery = compactSearchText(query);
  if (!compactQuery.text) return findLiteralTextRanges(text, query, caseSensitive);

  const compactText = compactSearchText(text);
  const haystack = caseSensitive ? compactText.text : compactText.text.toLowerCase();
  const needle = caseSensitive ? compactQuery.text : compactQuery.text.toLowerCase();
  const allowedSeparatorGroups = Math.max(1, countSeparatorGroups(query));
  const ranges: SearchTextRange[] = [];
  let cursor = 0;

  while (cursor <= haystack.length - needle.length) {
    const compactStart = haystack.indexOf(needle, cursor);
    if (compactStart < 0) break;
    const compactEnd = compactStart + needle.length;
    const start = compactText.offsets[compactStart];
    const endOffset = compactText.offsets[compactEnd - 1];
    if (start === undefined || endOffset === undefined) break;
    const end = endOffset + 1;
    const candidate = text.slice(start, end);

    if (countSeparatorGroups(candidate) <= allowedSeparatorGroups) {
      ranges.push({ start, end });
    }
    cursor = compactEnd;
  }

  return ranges;
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

function groupPageMatchesByContext(matches: RawMatch[]): PageMatchContext[] {
  const contexts = new Map<number, PageMatchContext>();
  matches.forEach((match, pageOccurrenceIndex) => {
    const existing = contexts.get(match.line);
    if (existing) {
      existing.occurrenceCount += 1;
      return;
    }
    contexts.set(match.line, {
      ...match,
      pageOccurrenceIndex,
      occurrenceCount: 1,
    });
  });
  return Array.from(contexts.values());
}

function findLineMatches(line: string, query: string, { caseSensitive }: { caseSensitive: boolean }) {
  return findSearchTextRanges(line, query, { caseSensitive });
}

function compactSearchText(value: string) {
  let text = "";
  const offsets: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (/[-_\s]/u.test(character)) continue;
    text += character;
    offsets.push(index);
  }
  return { text, offsets };
}

function countSeparatorGroups(value: string) {
  return value.match(/[-_\s]+/gu)?.length ?? 0;
}

function findLiteralTextRanges(text: string, query: string, caseSensitive: boolean) {
  const haystack = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();
  const ranges: SearchTextRange[] = [];
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
