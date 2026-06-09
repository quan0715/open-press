import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { BookOpen, Loader2, Search } from "lucide-react";
import type { SourceBlock } from "../../document-model";
import type { SearchReport, SearchScope, SearchablePage } from "../../shared";
import { searchPages } from "../../shared";
import { WorkbenchDialog } from "../dialog";

type SearchStatus = "idle" | "loading" | "success" | "error";
const LIVE_SEARCH_DEBOUNCE_MS = 280;

type SearchFile = SearchReport["files"][number];
type SearchMatch = SearchReport["matches"][number];

type SearchJumpTarget = {
  blockId: string;
  pageIndex: number;
  pageNumber: number;
};

export interface SearchControlSearcherArgs {
  query: string;
  scope: SearchScope;
  signal: AbortSignal;
}

export type SearchControlSearcher = (args: SearchControlSearcherArgs) => Promise<SearchReport>;

// Fallback searcher: hits the dev-only /__openpress/search endpoint.
// When `pages` prop is supplied the component uses in-browser searchPages()
// instead and this function is never called.
async function liveSearcher({ query, scope, signal }: SearchControlSearcherArgs): Promise<SearchReport> {
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("scope", scope);
  const response = await fetch(`/__openpress/search?${params.toString()}`, { cache: "no-store", signal });
  const data = (await response.json().catch(() => null)) as (Partial<SearchReport> & { message?: string }) | null;
  if (!response.ok || data?.ok === false || !isSearchReport(data)) {
    throw new Error(data?.message ?? "搜尋失敗。");
  }
  return data;
}

export function SearchControl({
  pages,
  sourceBlocksByPath = {},
  onSelectPage,
  searcher = liveSearcher,
}: {
  pages?: readonly SearchablePage[];
  sourceBlocksByPath?: Record<string, SourceBlock[]>;
  onSelectPage?: (pageIndex: number, options?: { behavior?: ScrollBehavior }) => void;
  searcher?: SearchControlSearcher;
}) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [report, setReport] = useState<SearchReport | null>(null);
  const [error, setError] = useState("");
  const activeSearchControllerRef = useRef<AbortController | null>(null);
  const searchRequestIdRef = useRef(0);
  const submittedQueryRef = useRef<string | null>(null);
  const matchesByPath = useMemo(() => groupMatchesByPath(report?.matches ?? []), [report]);

  // When pages are provided, run search in-browser over rendered HTML.
  // Otherwise fall back to the dev endpoint or the passed searcher prop.
  const pageSearcher = useMemo<SearchControlSearcher | undefined>(() => {
    if (!pages || pages.length === 0) return undefined;
    return ({ query: q, signal }) => {
      if (signal.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
      return Promise.resolve(searchPages(pages, { query: q, caseSensitive: false }));
    };
  }, [pages]);

  const activeSearcher = pageSearcher ?? searcher;
  const isPageSearch = Boolean(pageSearcher);

  const jumpToMatch = (match: SearchMatch) => {
    const target = resolveSearchJumpTarget(match, sourceBlocksByPath);
    if (!target || !onSelectPage) return;
    onSelectPage(target.pageIndex, { behavior: "smooth" });
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const runSearch = useCallback(async (rawQuery: string, controller: AbortController) => {
    const trimmedQuery = rawQuery.trim();
    if (!trimmedQuery) {
      activeSearchControllerRef.current?.abort();
      activeSearchControllerRef.current = null;
      setReport(null);
      setError("");
      setStatus("idle");
      return;
    }

    activeSearchControllerRef.current?.abort();
    activeSearchControllerRef.current = controller;
    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    setStatus("loading");
    setError("");

    try {
      const data = await activeSearcher({ query: trimmedQuery, scope: "content", signal: controller.signal });
      if (controller.signal.aborted || requestId !== searchRequestIdRef.current) return;
      if (!isSearchReport(data)) throw new Error("搜尋失敗。");
      setReport(data);
      setStatus("success");
    } catch (searchError) {
      if (controller.signal.aborted || requestId !== searchRequestIdRef.current) return;
      if (searchError instanceof DOMException && searchError.name === "AbortError") return;
      setError(searchError instanceof Error ? searchError.message : String(searchError));
      setStatus("error");
    }
  }, [activeSearcher]);

  useEffect(() => {
    if (!open) return undefined;
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      activeSearchControllerRef.current?.abort();
      activeSearchControllerRef.current = null;
      setReport(null);
      setError("");
      setStatus("idle");
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (submittedQueryRef.current === trimmedQuery) {
        submittedQueryRef.current = null;
        return;
      }
      void runSearch(trimmedQuery, controller);
    }, LIVE_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, runSearch]);

  const submitSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    submittedQueryRef.current = trimmedQuery;
    await runSearch(trimmedQuery, new AbortController());
  };

  const dialog = open ? (
    <WorkbenchDialog
      titleId={titleId}
      title="搜尋文件"
      eyebrow="Search"
      className="openpress-search-dialog"
      backdropClassName="openpress-search-dialog-backdrop"
      headerClassName="openpress-search-dialog__header"
      closeLabel="關閉搜尋"
      onClose={() => setOpen(false)}
    >
      <form className="openpress-search-dialog__form" role="search" aria-label="文件搜尋" onSubmit={submitSearch}>
        <div className="openpress-search-dialog__input-row">
          <Search aria-hidden="true" />
          <input
            type="search"
            value={query}
            autoFocus
            aria-label="搜尋文字"
            placeholder={isPageSearch ? "搜尋頁面內容" : "搜尋所有來源"}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          <button type="submit" disabled={status === "loading"}>
            {status === "loading" ? <Loader2 aria-hidden="true" /> : <Search aria-hidden="true" />}
            <span>搜尋</span>
          </button>
        </div>
      </form>
      <SearchResults
        status={status}
        report={report}
        error={error}
        matchesByPath={matchesByPath}
        sourceBlocksByPath={sourceBlocksByPath}
        isPageSearch={isPageSearch}
        onJumpToMatch={jumpToMatch}
      />
    </WorkbenchDialog>
  ) : null;

  return (
    <>
      <button
        type="button"
        className="openpress-workbench-toolbar-action"
        data-openpress-search
        data-openpress-toolbar-expanded="false"
        data-openpress-toolbar-active={open ? "true" : "false"}
        aria-label="搜尋文件"
        title="搜尋文件"
        onClick={() => setOpen(true)}
      >
        <Search aria-hidden="true" />
      </button>
      {dialog}
    </>
  );
}

function SearchResults({
  status,
  report,
  error,
  matchesByPath,
  sourceBlocksByPath,
  isPageSearch,
  onJumpToMatch,
}: {
  status: SearchStatus;
  report: SearchReport | null;
  error: string;
  matchesByPath: Map<string, Array<SearchMatch>>;
  sourceBlocksByPath: Record<string, SourceBlock[]>;
  isPageSearch: boolean;
  onJumpToMatch: (match: SearchMatch) => void;
}) {
  if (status === "idle") {
    return (
      <p className="openpress-search-dialog__empty">
        {isPageSearch ? "輸入關鍵字即可搜尋頁面內容。" : "輸入關鍵字即可搜尋文件內容、元件與設定來源。"}
      </p>
    );
  }

  if (status === "loading") {
    return (
      <p className="openpress-search-dialog__empty" role="status">
        <Loader2 aria-hidden="true" />
        <span>搜尋中</span>
      </p>
    );
  }

  if (status === "error") {
    return <p className="openpress-search-dialog__error" role="alert">{error || "搜尋失敗。"}</p>;
  }

  if (!report || report.matchCount === 0) {
    return <p className="openpress-search-dialog__empty">沒有符合的結果。</p>;
  }

  return (
    <div className="openpress-search-dialog__results" aria-live="polite">
      <p className="openpress-search-dialog__summary">{report.matchCount} 個符合結果</p>
      {report.files.map((file) => {
        const pageIndex = parsePagePath(file.path);
        return (
          <section className="openpress-search-dialog__file" key={file.path}>
            <h3>
              <BookOpen aria-hidden="true" />
              <span>{pageIndex !== null ? file.file : file.path}</span>
              {pageIndex !== null ? (
                <small className="openpress-search-dialog__page-badge">
                  P{String(pageIndex + 1).padStart(2, "0")}
                </small>
              ) : null}
              <small>{file.matchCount}</small>
            </h3>
            <ol>
              {(matchesByPath.get(file.path) ?? []).map((match) => {
                const jumpTarget = resolveSearchJumpTarget(match, sourceBlocksByPath);
                return (
                  <li key={match.id}>
                    <button
                      type="button"
                      className="openpress-search-dialog__result"
                      data-openpress-search-result-jump={jumpTarget ? "true" : "false"}
                      disabled={!jumpTarget}
                      onClick={() => onJumpToMatch(match)}
                    >
                      {pageIndex === null ? (
                        <span className="openpress-search-dialog__line">{match.line}:{match.column}</span>
                      ) : null}
                      <span className="openpress-search-dialog__preview">{match.preview}</span>
                      {pageIndex === null ? (
                        <span className="openpress-search-dialog__page">
                          {jumpTarget ? `P${String(jumpTarget.pageNumber).padStart(2, "0")}` : "source"}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function groupMatchesByPath(matches: Array<SearchMatch>) {
  const grouped = new Map<string, Array<SearchMatch>>();
  for (const match of matches) {
    const existing = grouped.get(match.path) ?? [];
    existing.push(match);
    grouped.set(match.path, existing);
  }
  return grouped;
}

function isSearchReport(value: unknown): value is SearchReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<SearchReport>;
  return report.kind === "search"
    && typeof report.query === "string"
    && typeof report.matchCount === "number"
    && Array.isArray(report.files)
    && Array.isArray(report.matches);
}

function parsePagePath(path: string): number | null {
  if (!path.startsWith("page:")) return null;
  const n = Number.parseInt(path.slice("page:".length), 10);
  return Number.isFinite(n) ? n : null;
}

function resolveSearchJumpTarget(
  match: SearchMatch,
  sourceBlocksByPath: Record<string, SourceBlock[]>,
): SearchJumpTarget | null {
  // Page-based result: jump directly from the path.
  const pageIndex = parsePagePath(match.path);
  if (pageIndex !== null) {
    return { blockId: `page-${pageIndex}`, pageIndex, pageNumber: pageIndex + 1 };
  }

  // Source-file result: resolve via sourceBlocksByPath.
  const blocks = sourcePathKeys(match.path)
    .flatMap((key) => sourceBlocksByPath[key] ?? []);
  if (!blocks.length) return null;

  let selectedBlock: SourceBlock | null = null;
  for (const block of blocks) {
    const line = block.source?.line;
    if (typeof line !== "number") continue;
    if (line <= match.line) {
      selectedBlock = block;
      continue;
    }
    break;
  }

  const targetBlock = selectedBlock ?? blocks[0] ?? null;
  if (!targetBlock || typeof targetBlock.pageIndex !== "number") return null;
  return {
    blockId: targetBlock.id,
    pageIndex: targetBlock.pageIndex,
    pageNumber: targetBlock.pageNumber ?? targetBlock.pageIndex + 1,
  };
}

function sourcePathKeys(value: string) {
  const normalized = value.trim().replaceAll("\\", "/").replace(/^\.\//, "");
  const keys = [normalized];
  if (normalized.startsWith("press/")) {
    keys.push(normalized.replace(/^press\//, ""));
  } else {
    keys.push(`press/${normalized}`);
  }
  return Array.from(new Set(keys));
}
