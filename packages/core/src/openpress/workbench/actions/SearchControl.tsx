import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import type { SearchReport, SearchablePage } from "../../shared";
import { findSearchTextRanges, searchPages } from "../../shared";
import { TOOLBAR_ACTION_CLASS } from "../toolbarClasses";
import { Button } from "@/openpress/ui/button";
import { Input } from "@/openpress/ui/input";
import { Badge } from "@/openpress/ui/badge";
import { useHotkey } from "../../hotkeys";
import {
  SHELL_PANEL_BODY_PADDING_X_CLASS,
  SHELL_PANEL_HEADER_CLASS,
  SHELL_PANEL_ICON_ACTION_CLASS,
  SHELL_PANEL_TITLE_CLASS,
} from "../../shared/shellPanelLanguage";

type SearchMatch = SearchReport["matches"][number];

type SearchJumpTarget = {
  pageIndex: number;
  pageNumber: number;
};

const SEARCH_PANEL_CLASS = [
  "openpress-search-panel grid h-full min-h-0 min-w-0 grid-rows-[auto_auto_auto_minmax(0,1fr)] overflow-hidden",
  "bg-[var(--op-workspace-panel-bg)] text-[var(--op-workspace-text)]",
].join(" ");

const SEARCH_PANEL_HEADER_CLASS = SHELL_PANEL_HEADER_CLASS;
const SEARCH_FORM_CLASS = [
  "shrink-0 border-b border-[var(--op-workspace-border-muted)] py-3",
  SHELL_PANEL_BODY_PADDING_X_CLASS,
].join(" ");
const SEARCH_NAVIGATION_CLASS = [
  "flex min-w-0 shrink-0 items-center justify-between gap-2 border-b border-[var(--op-workspace-border-muted)] py-2.5",
  SHELL_PANEL_BODY_PADDING_X_CLASS,
  "bg-[var(--op-workspace-panel-bg)]",
].join(" ");
const SEARCH_NAVIGATION_BUTTON_CLASS = [
  "h-7 w-7 min-w-7 rounded-[var(--op-workspace-radius-sm)] border-0 bg-transparent p-0 shadow-none",
  "text-[var(--op-workspace-text-soft)] hover:bg-[var(--op-workspace-surface-hover)] hover:text-[var(--op-workspace-text)]",
  "disabled:text-[var(--op-workspace-text-muted)]",
  "[&_svg]:h-4 [&_svg]:w-4",
].join(" ");
const SEARCH_INPUT_ROW_CLASS = [
  "relative flex min-h-[36px] items-center rounded-md border border-[var(--op-workspace-border)] bg-white/[0.05] px-2.5",
  "focus-within:border-[var(--op-workspace-accent-border)] focus-within:ring-1 focus-within:ring-[var(--op-workspace-accent-border)]",
].join(" ");

const SEARCH_INPUT_CLASS = [
  "h-full flex-1 !rounded-none !border-0 bg-transparent p-0 text-xs text-[var(--op-workspace-text)] !outline-0",
  "focus-visible:!border-0 focus-visible:!ring-0",
  "[font-family:inherit] placeholder:text-[var(--op-workspace-text-muted)]",
  "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
].join(" ");

const SEARCH_CLEAR_CLASS = [
  "inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-[var(--op-workspace-radius-sm)]",
  "border border-transparent bg-transparent p-0 text-[var(--op-workspace-text-muted)]",
  "hover:text-[var(--op-workspace-text)] [&_svg]:h-3.5 [&_svg]:w-3.5",
].join(" ");

const SEARCH_EMPTY_CLASS = [
  "m-0 flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center text-xs leading-normal text-[var(--op-workspace-text-muted)]",
].join(" ");

const SEARCH_RESULTS_CLASS = [
  "flex min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto py-3 [scrollbar-width:thin]",
  SHELL_PANEL_BODY_PADDING_X_CLASS,
].join(" ");
const SEARCH_SUMMARY_CLASS = "m-0 mb-2.5 text-[11px] font-medium leading-[1.35] text-[var(--op-workspace-text-muted)]";
const SEARCH_FILE_CLASS = "mb-3.5 grid min-w-0 max-w-full gap-1.5 border-b border-[var(--op-workspace-border-muted)] pb-3.5 last:mb-0 last:border-b-0 last:pb-0";

const SEARCH_FILE_HEADING_CLASS = [
  "flex min-w-0 items-center justify-between gap-2 m-0",
  "text-xs font-semibold leading-tight text-[var(--op-workspace-text-soft)]",
].join(" ");

const SEARCH_FILE_TITLE_CLASS = "min-w-0 max-w-full whitespace-normal text-xs font-semibold text-[var(--op-workspace-text)] [overflow-wrap:anywhere]";
const SEARCH_FILE_BADGE_CLASS = [
  "inline-flex h-[18px] min-w-5 items-center justify-center rounded-full px-1.5",
  "border border-[var(--op-workspace-border)] text-[10px] font-semibold text-[var(--op-workspace-text-muted)]",
].join(" ");

const SEARCH_MATCH_LIST_CLASS = "m-0 grid list-none gap-1.5 p-0";
const SEARCH_MATCH_ITEM_CLASS = "block min-w-0";

const SEARCH_RESULT_CLASS = [
  "group relative flex !h-auto w-full min-w-0 max-w-full flex-col items-stretch justify-start gap-1 overflow-hidden !whitespace-normal",
  "rounded-[var(--op-workspace-radius-sm)] border border-transparent bg-[var(--op-workspace-surface-muted)] p-2.5",
  "cursor-pointer text-left text-inherit [font-family:inherit] transition-all duration-150",
  "hover:border-[var(--op-workspace-accent-border)] hover:bg-[var(--op-workspace-accent-surface)]",
  "data-[active=true]:border-[var(--op-workspace-accent)] data-[active=true]:bg-[var(--op-workspace-accent-surface)]",
  "disabled:cursor-default disabled:opacity-[0.68]",
].join(" ");

const SEARCH_PREVIEW_CLASS = "block min-w-0 max-w-full flex-1 whitespace-normal text-[12px] leading-[1.55] text-[var(--op-workspace-text-soft)] [overflow-wrap:anywhere]";
const SEARCH_OCCURRENCE_BADGE_CLASS = [
  "mt-0.5 inline-flex h-[18px] shrink-0 items-center rounded-full px-1.5",
  "border border-[var(--op-workspace-border-muted)] text-[10px] font-semibold text-[var(--op-workspace-text-muted)]",
].join(" ");

function ensureHighlightStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("openpress-search-highlight-styles")) return;
  const style = document.createElement("style");
  style.id = "openpress-search-highlight-styles";
  style.textContent = `
    ::highlight(openpress-search-highlight) {
      background-color: rgba(240, 182, 76, 0.38);
      color: inherit;
    }
    ::highlight(openpress-search-active) {
      background-color: rgb(240, 182, 76);
      color: #141414;
      text-shadow: 0 0 8px rgba(240, 182, 76, 0.95);
    }
  `;
  document.head.appendChild(style);
}

function getHighlightRegistry() {
  if (typeof CSS === "undefined" || !("highlights" in CSS)) return null;
  return (CSS as unknown as { highlights?: Map<string, unknown> }).highlights ?? null;
}

function clearDocumentSearchHighlights() {
  const highlights = getHighlightRegistry();
  highlights?.delete("openpress-search-highlight");
  highlights?.delete("openpress-search-active");
}

function applyDocumentSearchHighlights(
  query: string,
  activeMatch?: SearchMatch,
  activeMatchOrdinal = 0,
): HTMLElement | null {
  const highlights = getHighlightRegistry();
  if (!highlights) return null;
  ensureHighlightStyles();
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    clearDocumentSearchHighlights();
    return null;
  }

  const HighlightConstructor = (window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;
  if (!HighlightConstructor) return null;

  const candidates = Array.from(document.querySelectorAll<HTMLElement>(
    "[data-openpress-public-page], .reader-pages, .reader-stage, .op-workspace-canvas, .op-workspace-main",
  ));
  const containers = candidates.filter((candidate) => (
    !candidates.some((other) => other !== candidate && candidate.contains(other))
  ));
  if (!containers.length) return null;

  const allRanges: Range[] = [];
  const activeRanges: Range[] = [];
  let activeElement: HTMLElement | null = null;
  let activePageRangeIndex = 0;
  const activePageIndex = activeMatch ? parsePagePath(activeMatch.path) : null;
  const activePageSelector = activePageIndex === null
    ? null
    : `#page-${String(activePageIndex + 1).padStart(2, "0")}, [data-page-index="${activePageIndex}"]`;

  containers.forEach((container) => {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (
          tag === "script" ||
          tag === "style" ||
          tag === "svg" ||
          parent.closest("[data-openpress-search-panel]")
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let currentNode: Node | null;
    while ((currentNode = walker.nextNode())) {
      const text = currentNode.textContent || "";
      for (const matchRange of findSearchTextRanges(text, cleanQuery)) {
        const range = new Range();
        range.setStart(currentNode, matchRange.start);
        range.setEnd(currentNode, matchRange.end);
        allRanges.push(range);

        const parent = currentNode.parentElement;
        const onActivePage = !activePageSelector || Boolean(parent?.closest(activePageSelector));
        if (activeMatch && onActivePage) {
          if (activePageRangeIndex === activeMatchOrdinal) {
            activeRanges.push(range);
            activeElement = parent;
          }
          activePageRangeIndex += 1;
        }
      }
    }
  });

  try {
    highlights.set("openpress-search-highlight", new HighlightConstructor(...allRanges));
    if (activeRanges.length) {
      highlights.set("openpress-search-active", new HighlightConstructor(...activeRanges));
    } else {
      highlights.delete("openpress-search-active");
    }
  } catch {
    // Ignore highlight API exceptions in unsupported environments
  }
  return activeElement;
}

export function SearchControl({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  useHotkey("workspace.open-search", () => onOpenChange(!open));
  useHotkey("search.close", () => onOpenChange(false), { enabled: open, allowInEditable: true });

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={TOOLBAR_ACTION_CLASS}
      data-openpress-search
      data-openpress-toolbar-expanded={open ? "true" : "false"}
      data-openpress-toolbar-active={open ? "true" : "false"}
      aria-label="搜尋文件"
      title="搜尋文件 (⌘K)"
      onClick={() => onOpenChange(!open)}
    >
      <Search aria-hidden="true" />
    </Button>
  );
}

export function SearchPanel({
  open,
  pages,
  onSelectPage,
  onClose,
}: {
  open: boolean;
  pages: readonly SearchablePage[];
  onSelectPage?: (pageIndex: number, options?: { behavior?: ScrollBehavior }) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const trimmedQuery = query.trim();
  const report = useMemo(
    () => trimmedQuery ? searchPages(pages, { query: trimmedQuery, caseSensitive: false }) : null,
    [pages, trimmedQuery],
  );
  const activeMatch = useMemo(
    () => report?.matches.find((match) => match.id === activeMatchId),
    [activeMatchId, report],
  );

  const matchesByPath = useMemo(() => groupMatchesByPath(report?.matches ?? []), [report]);
  const matches = report?.matches ?? [];
  const activeMatchIndex = matches.findIndex((match) => match.id === activeMatchId);

  const jumpToMatch = (match: SearchMatch) => {
    setActiveMatchId(match.id);
    const target = resolveSearchJumpTarget(match);
    if (!target || !onSelectPage) return;
    const activeMatchOrdinal = match.pageOccurrenceIndex ?? Math.max(
      0,
      (matchesByPath.get(match.path) ?? []).findIndex((candidate) => candidate.id === match.id),
    );
    onSelectPage(target.pageIndex, { behavior: "smooth" });

    const focusTarget = () => {
      const activeElement = applyDocumentSearchHighlights(trimmedQuery, match, activeMatchOrdinal);
      const pageElement = document.querySelector<HTMLElement>(
        `#page-${String(target.pageNumber).padStart(2, "0")}`,
      );
      const elem = activeElement ?? pageElement;
      if (elem) {
        elem.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    window.requestAnimationFrame(() => window.requestAnimationFrame(focusTarget));
  };

  const selectRelativeMatch = (direction: -1 | 1) => {
    if (!matches.length) return;
    const start = activeMatchIndex < 0 ? (direction === 1 ? -1 : 0) : activeMatchIndex;
    const nextIndex = (start + direction + matches.length) % matches.length;
    jumpToMatch(matches[nextIndex]);
  };

  useEffect(() => {
    if (!open) {
      clearDocumentSearchHighlights();
      return;
    }
    applyDocumentSearchHighlights(trimmedQuery, activeMatch);
  }, [activeMatch, open, report, trimmedQuery]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!activeMatchId) return;
    const frame = window.requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>(`[data-openpress-search-match-id="${activeMatchId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeMatchId]);

  return (
    <section
      ref={panelRef}
      className={SEARCH_PANEL_CLASS}
      data-openpress-search-panel
      aria-labelledby={titleId}
    >
      <header className={SEARCH_PANEL_HEADER_CLASS} data-openpress-panel-header>
        <h2 id={titleId} className={SHELL_PANEL_TITLE_CLASS}>搜尋文件</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={SHELL_PANEL_ICON_ACTION_CLASS}
          aria-label="關閉搜尋"
          title="關閉搜尋 (Esc)"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </Button>
      </header>

      <div className={SEARCH_FORM_CLASS}>
        <form role="search" aria-label="文件搜尋" onSubmit={(event) => event.preventDefault()}>
          <div className={SEARCH_INPUT_ROW_CLASS}>
            <Search className="mr-2 h-3.5 w-3.5 shrink-0 text-[var(--op-workspace-text-muted)]" aria-hidden="true" />
            <Input
              ref={inputRef}
              type="search"
              className={SEARCH_INPUT_CLASS}
              value={query}
              aria-label="搜尋關鍵字"
              placeholder="搜尋頁面內容"
              onChange={(event) => {
                setQuery(event.currentTarget.value);
                setActiveMatchId(null);
              }}
            />
            {query.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className={SEARCH_CLEAR_CLASS}
                aria-label="清除關鍵字"
                title="清除關鍵字"
                onClick={() => {
                  setQuery("");
                  setActiveMatchId(null);
                  inputRef.current?.focus();
                }}
              >
                <X aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </form>
      </div>

      <div className={SEARCH_NAVIGATION_CLASS}>
        <span
          className="text-[11px] font-semibold tabular-nums text-[var(--op-workspace-text-muted)]"
          data-openpress-search-position
          aria-live="polite"
        >
          {activeMatchIndex >= 0 ? activeMatchIndex + 1 : 0} / {matches.length}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={SEARCH_NAVIGATION_BUTTON_CLASS}
            aria-label="上一個搜尋結果"
            title="上一個搜尋結果"
            disabled={matches.length === 0}
            onClick={() => selectRelativeMatch(-1)}
          >
            <ChevronUp aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={SEARCH_NAVIGATION_BUTTON_CLASS}
            aria-label="下一個搜尋結果"
            title="下一個搜尋結果"
            disabled={matches.length === 0}
            onClick={() => selectRelativeMatch(1)}
          >
            <ChevronDown aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className={SEARCH_RESULTS_CLASS} data-openpress-search-results aria-live="polite">
        <SearchResults
          report={report}
          query={query}
          activeMatchId={activeMatchId}
          matchesByPath={matchesByPath}
          onJumpToMatch={jumpToMatch}
        />
      </div>
    </section>
  );
}

function HighlightMatchSnippet({ text, query }: { text: string; query: string }) {
  const ranges = findSearchTextRanges(text, query.trim());
  if (!ranges.length) {
    return <span className="whitespace-normal [overflow-wrap:anywhere]">{text}</span>;
  }

  const segments: Array<{ text: string; highlighted: boolean }> = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) segments.push({ text: text.slice(cursor, range.start), highlighted: false });
    segments.push({ text: text.slice(range.start, range.end), highlighted: true });
    cursor = range.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), highlighted: false });

  return (
    <span className="whitespace-normal [overflow-wrap:anywhere]">
      {segments.map((segment, index) => segment.highlighted ? (
        <mark
          key={`${index}-${segment.text}`}
          className="rounded-[2px] bg-[var(--op-workspace-accent)] px-0.5 font-semibold text-[#141414]"
        >
          {segment.text}
        </mark>
      ) : <span key={`${index}-${segment.text}`}>{segment.text}</span>)}
    </span>
  );
}

function SearchResults({
  report,
  query,
  activeMatchId,
  matchesByPath,
  onJumpToMatch,
}: {
  report: SearchReport | null;
  query: string;
  activeMatchId: string | null;
  matchesByPath: Map<string, Array<SearchMatch>>;
  onJumpToMatch: (match: SearchMatch) => void;
}) {
  if (!query.trim()) {
    return (
      <div className={SEARCH_EMPTY_CLASS}>
        <p className="m-0">輸入關鍵字即可即時搜尋頁面內容與定位。</p>
      </div>
    );
  }

  if (!report || report.matchCount === 0) {
    return (
      <div className={SEARCH_EMPTY_CLASS}>
        <p className="m-0">沒有找到符合「{query}」的內容。</p>
      </div>
    );
  }

  return (
    <>
      <p className={SEARCH_SUMMARY_CLASS}>
        找到 {report.matchCount} 段內容
        {(report.occurrenceCount ?? report.matchCount) > report.matchCount
          ? `，共 ${report.occurrenceCount} 次命中`
          : ""}
      </p>
      {report.files.map((file) => {
        const pageIndex = parsePagePath(file.path);
        return (
          <section className={SEARCH_FILE_CLASS} key={file.path}>
            <h3 className={SEARCH_FILE_HEADING_CLASS}>
              <div className="flex min-w-0 max-w-full items-start overflow-hidden">
                <span className={SEARCH_FILE_TITLE_CLASS}>{pageIndex !== null ? file.file : file.path}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {pageIndex !== null ? (
                  <Badge variant="outline" className={SEARCH_FILE_BADGE_CLASS}>
                    P{String(pageIndex + 1).padStart(2, "0")}
                  </Badge>
                ) : null}
                <span className="text-[10px] font-semibold text-[var(--op-workspace-text-muted)]">
                  {file.matchCount}
                </span>
              </div>
            </h3>
            <ol className={SEARCH_MATCH_LIST_CLASS}>
              {(matchesByPath.get(file.path) ?? []).map((match) => {
                const jumpTarget = resolveSearchJumpTarget(match);
                const isActive = activeMatchId === match.id;
                return (
                  <li className={SEARCH_MATCH_ITEM_CLASS} key={match.id}>
                    <Button
                      type="button"
                      variant="ghost"
                      className={SEARCH_RESULT_CLASS}
                      data-openpress-search-result-jump={jumpTarget ? "true" : "false"}
                      data-openpress-search-match-id={match.id}
                      data-active={isActive ? "true" : "false"}
                      disabled={!jumpTarget}
                      onClick={() => onJumpToMatch(match)}
                    >
                      <div className="flex w-full min-w-0 max-w-full items-start gap-2 overflow-hidden">
                        <span className={SEARCH_PREVIEW_CLASS} data-openpress-search-preview>
                          <HighlightMatchSnippet text={match.preview} query={query} />
                        </span>
                        {(match.occurrenceCount ?? 1) > 1 ? (
                          <span className={SEARCH_OCCURRENCE_BADGE_CLASS} data-openpress-search-occurrence-count>
                            {match.occurrenceCount} 次
                          </span>
                        ) : null}
                      </div>
                    </Button>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </>
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

function parsePagePath(path: string): number | null {
  if (!path.startsWith("page:")) return null;
  const n = Number.parseInt(path.slice("page:".length), 10);
  return Number.isFinite(n) ? n : null;
}

function resolveSearchJumpTarget(match: SearchMatch): SearchJumpTarget | null {
  const pageIndex = parsePagePath(match.path);
  return pageIndex === null
    ? null
    : { pageIndex, pageNumber: pageIndex + 1 };
}
