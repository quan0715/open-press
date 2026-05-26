import type { ResolvedConfig } from "./config.mjs";

export type SourceTextScope = "content" | "all";

export type SourceTextMatch = {
  id: string;
  scope: string;
  file: string;
  path: string;
  line: number;
  column: number;
  index: number;
  text: string;
  preview: string;
};

export type SourceTextFileSummary = {
  scope: string;
  file: string;
  path: string;
  matchCount: number;
};

export type SourceSearchReport = {
  kind: "search";
  query: string;
  scope: SourceTextScope;
  caseSensitive: boolean;
  matchCount: number;
  files: Array<SourceTextFileSummary>;
  matches: Array<SourceTextMatch>;
};

export type SourceBlockTextEditInput = {
  config: ResolvedConfig;
  path: string;
  source: {
    line: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
  };
  text: string;
  kind?: string;
  name?: string;
  blockId?: string;
  cellIndex?: number;
  sourceMode?: boolean;
};

export type SourceBlockTextEdit = {
  blockId?: string;
  path: string;
  requestedPath: string;
  file: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  before: string;
  after: string;
  text: string;
  cellIndex?: number;
};

export function searchSourceText(options: {
  config: ResolvedConfig;
  query: string;
  scope?: SourceTextScope;
  caseSensitive?: boolean;
}): Promise<SourceSearchReport>;

export function applySourceBlockTextEdit(options: SourceBlockTextEditInput): Promise<SourceBlockTextEdit>;

export function applySourceBlockTextEditToText(documentText: string, options: Omit<SourceBlockTextEditInput, "config" | "path">): {
  text: string;
  edit: Omit<SourceBlockTextEdit, "path" | "requestedPath" | "file">;
};

export function readSourceBlockText(options: Pick<SourceBlockTextEditInput, "config" | "path" | "source">): Promise<{
  path: string;
  requestedPath: string;
  file: string;
  text: string;
}>;

export function readSourceBlockTextFromText(documentText: string, options: Pick<SourceBlockTextEditInput, "source">): string;

export function applySourceBlockSourceEditToText(documentText: string, options: Pick<SourceBlockTextEditInput, "source" | "text" | "blockId">): {
  text: string;
  edit: Omit<SourceBlockTextEdit, "path" | "requestedPath" | "file">;
};

export function collectSourceTextFiles(config: ResolvedConfig, options?: {
  scope?: SourceTextScope;
}): Promise<Array<{
  scope: string;
  name: string;
  absolutePath: string;
  relativePath: string;
  text: string;
}>>;
