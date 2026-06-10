import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { BookOpen, Loader2, Search } from "lucide-react";
import { cn } from "../../core/cn";
import type { SourceBlock } from "../../document-model";
import type { SearchReport, SearchScope, SearchablePage } from "../../shared";
import { searchPages } from "../../shared";
import { WorkbenchDialog } from "../dialog";
import { TOOLBAR_ACTION_CLASS } from "../toolbarClasses";

type SearchStatus = "idle" | "loading" | "success" | "error";
const LIVE_SEARCH_DEBOUNCE_MS = 280;

type SearchFile = SearchReport["files"][number];
type SearchMatch = SearchReport["matches"][number];

type SearchJumpTarget = {
  blockId: string;
  pageIndex: number;
  pageNumber: number;
};

const SEARCH_DIALOG_BACKDROP_CLASS = [
  "openpress-search-dialog-backdrop !z-[1001]",
  "!bg-black/45 !px-6 !pb-6 !pt-[calc(var(--openpress-workbench-toolbar-height,44px)+24px)]",
].join(" ");
const SEARCH_DIALOG_CLASS = [
  "openpress-search-dialog !w-[min(640px,calc(100vw-48px))] !max-h-[min(72vh,760px)]",
  "!grid-rows-[auto_auto_minmax(0,1fr)] !shadow-[0_24px_72px_rgb(0_0_0_/_0.44)]",
].join(" ");
const SEARCH_DIALOG_HEADER_CLASS = "openpress-search-dialog__header gap-4 !py-2.5 !pl-4 !pr-12";
const SEARCH_FORM_CLASS = [
  "openpress-search-dialog__form grid gap-2.5 border-y border-[var(--openpress-workbench-border-muted)] px-4 py-3",
].join(" ");
const SEARCH_INPUT_ROW_CLASS = [
  "openpress-search-dialog__input-row grid min-h-[34px] grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-2",
  "rounded-[5px] border border-[var(--openpress-workbench-border)] bg-white/[0.04] py-0 pl-2.5 pr-[7px]",
  "[&_>svg]:h-[13px] [&_>svg]:w-[13px] [&_>svg]:text-[var(--openpress-workbench-muted)]",
].join(" ");
const SEARCH_INPUT_CLASS = [
  "min-w-0 border-0 bg-transparent p-0 text-xs text-[var(--openpress-workbench-text)] !outline-0",
  "[font-family:inherit] placeholder:text-[rgb(160_166_173_/_0.54)]",
].join(" ");
const SEARCH_SUBMIT_CLASS = [
  "inline-flex h-[26px] cursor-pointer items-center justify-center gap-1.5 rounded-[var(--openpress-workbench-radius-sm)]",
  "border border-transparent bg-transparent px-[9px] text-[11px] font-[560] text-[rgb(214_218_222_/_0.82)] [font-family:inherit]",
  "hover:text-[var(--openpress-workbench-accent)] disabled:cursor-progress disabled:opacity-60",
  "[&_svg]:h-3 [&_svg]:w-3 disabled:[&_svg]:animate-spin",
].join(" ");
const SEARCH_EMPTY_CLASS = [
  "openpress-search-dialog__empty m-0 flex items-center gap-2 px-4 py-[18px] text-xs leading-normal text-[rgb(160_166_173_/_0.72)]",
  "[&_svg]:h-[13px] [&_svg]:w-[13px] [&_svg]:animate-spin",
].join(" ");
const SEARCH_ERROR_CLASS = "openpress-search-dialog__error m-0 flex items-center gap-2 px-4 py-[18px] text-xs leading-normal text-[rgb(248_113_113_/_0.88)]";
const SEARCH_RESULTS_CLASS = "openpress-search-dialog__results min-h-0 overflow-auto px-4 pb-4 pt-3";
const SEARCH_SUMMARY_CLASS = "openpress-search-dialog__summary m-0 mb-2.5 text-[11px] leading-[1.35] text-[var(--openpress-workbench-muted)]";
const SEARCH_FILE_CLASS = "openpress-search-dialog__file mb-3 grid gap-[7px] border-b border-[var(--openpress-workbench-border-muted)] pb-3 last:mb-0 last:border-b-0 last:pb-0";
const SEARCH_FILE_HEADING_CLASS = [
  "grid min-w-0 grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-[7px] m-0",
  "text-xs font-semibold leading-tight text-[rgb(226_229_230_/_0.90)]",
  "[&_svg]:h-3 [&_svg]:w-3 [&_svg]:text-[rgb(240_182_76_/_0.82)]",
].join(" ");
const SEARCH_FILE_TITLE_CLASS = "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap";
const SEARCH_FILE_BADGE_CLASS = [
  "openpress-search-dialog__page-badge inline-flex h-[18px] min-w-5 items-center justify-center rounded-full",
  "border border-[var(--openpress-workbench-glass-border)] text-[10px] font-semibold text-[rgb(160_166_173_/_0.78)]",
].join(" ");
const SEARCH_MATCH_LIST_CLASS = "m-0 grid list-none gap-[5px] p-0";
const SEARCH_MATCH_ITEM_CLASS = "block min-w-0";
const SEARCH_RESULT_CLASS = [
  "openpress-search-dialog__result grid w-full min-w-0 grid-cols-[44px_minmax(0,1fr)_auto] items-baseline gap-2.5",
  "rounded-[var(--openpress-workbench-radius-sm)] border border-transparent bg-white/[0.03] px-[7px] py-1.5",
  "cursor-pointer text-left text-inherit [font-family:inherit] hover:border-[rgb(240_182_76_/_0.18)] hover:bg-[rgb(240_182_76_/_0.07)]",
  "disabled:cursor-default disabled:opacity-[0.68] disabled:[&_.openpress-search-dialog__page]:text-[rgb(160_166_173_/_0.58)]",
].join(" ");
const SEARCH_LINE_CLASS = "openpress-search-dialog__line font-mono text-[10px] leading-[1.35] text-[rgb(160_166_173_/_0.74)]";
const SEARCH_PREVIEW_CLASS = "openpress-search-dialog__preview min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] leading-[1.45] text-[rgb(226_229_230_/_0.84)]";
const SEARCH_PAGE_CLASS = "openpress-search-dialog__page font-mono text-[10px] font-semibold leading-[1.35] text-[rgb(240_182_76_/_0.82)]";

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
      className={SEARCH_DIALOG_CLASS}
      backdropClassName={SEARCH_DIALOG_BACKDROP_CLASS}
      headerClassName={SEARCH_DIALOG_HEADER_CLASS}
      closeLabel="關閉搜尋"
      onClose={() => setOpen(false)}
    >
      <form className={SEARCH_FORM_CLASS} role="search" aria-label="文件搜尋" onSubmit={submitSearch}>
        <div className={SEARCH_INPUT_ROW_CLASS}>
          <Search aria-hidden="true" />
          <input
            type="search"
            className={SEARCH_INPUT_CLASS}
            value={query}
            autoFocus
            aria-label="搜尋文字"
            placeholder={isPageSearch ? "搜尋頁面內容" : "搜尋所有來源"}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          <button type="submit" className={SEARCH_SUBMIT_CLASS} disabled={status === "loading"}>
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
        className={TOOLBAR_ACTION_CLASS}
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
      <p className={SEARCH_EMPTY_CLASS}>
        {isPageSearch ? "輸入關鍵字即可搜尋頁面內容。" : "輸入關鍵字即可搜尋文件內容、元件與設定來源。"}
      </p>
    );
  }

  if (status === "loading") {
    return (
      <p className={SEARCH_EMPTY_CLASS} role="status">
        <Loader2 aria-hidden="true" />
        <span>搜尋中</span>
      </p>
    );
  }

  if (status === "error") {
    return <p className={SEARCH_ERROR_CLASS} role="alert">{error || "搜尋失敗。"}</p>;
  }

  if (!report || report.matchCount === 0) {
    return <p className={SEARCH_EMPTY_CLASS}>沒有符合的結果。</p>;
  }

  return (
    <div className={SEARCH_RESULTS_CLASS} aria-live="polite">
      <p className={SEARCH_SUMMARY_CLASS}>{report.matchCount} 個符合結果</p>
      {report.files.map((file) => {
        const pageIndex = parsePagePath(file.path);
        return (
          <section className={SEARCH_FILE_CLASS} key={file.path}>
            <h3 className={SEARCH_FILE_HEADING_CLASS}>
              <BookOpen aria-hidden="true" />
              <span className={SEARCH_FILE_TITLE_CLASS}>{pageIndex !== null ? file.file : file.path}</span>
              {pageIndex !== null ? (
                <small className={SEARCH_FILE_BADGE_CLASS}>
                  P{String(pageIndex + 1).padStart(2, "0")}
                </small>
              ) : null}
              <small className={SEARCH_FILE_BADGE_CLASS}>{file.matchCount}</small>
            </h3>
            <ol className={SEARCH_MATCH_LIST_CLASS}>
              {(matchesByPath.get(file.path) ?? []).map((match) => {
                const jumpTarget = resolveSearchJumpTarget(match, sourceBlocksByPath);
                return (
                  <li className={SEARCH_MATCH_ITEM_CLASS} key={match.id}>
                    <button
                      type="button"
                      className={SEARCH_RESULT_CLASS}
                      data-openpress-search-result-jump={jumpTarget ? "true" : "false"}
                      disabled={!jumpTarget}
                      onClick={() => onJumpToMatch(match)}
                    >
                      {pageIndex === null ? (
                        <span className={SEARCH_LINE_CLASS}>{match.line}:{match.column}</span>
                      ) : null}
                      <span className={cn(SEARCH_PREVIEW_CLASS, pageIndex !== null && "col-span-3")}>{match.preview}</span>
                      {pageIndex === null ? (
                        <span className={SEARCH_PAGE_CLASS}>
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
