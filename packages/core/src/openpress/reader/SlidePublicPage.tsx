import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { ChevronLeft, ChevronRight, Download, Minimize2, PanelLeftClose, PanelLeftOpen, Play } from "lucide-react";
import { createPageObjectEntityId } from "../document-model";
import type { DeploymentInfo, HtmlPageBlock, ReaderDocument } from "../document-model";
import { pageIndexFromHash, replacePageRoute } from "./readerPageRoute";
import { clampReaderPageIndex, formatReaderPageNumber, normalizeReaderPageCount } from "./readerStateModel";
import { usePageViewportScale } from "./usePageViewportScale";
import { PageThumbnails } from "./PageThumbnailsPanel";
import { PUBLIC_HTML_PAGE_CLASS, PUBLIC_HTML_PAGE_HTML_CLASS } from "./publicViewerClasses";
import {
  TOOLBAR_ACTION_CLASS,
  TOOLBAR_ACTION_LABEL_CLASS,
  TOOLBAR_ACTION_PRIMARY_CLASS,
  TOOLBAR_CONTENT_CLASS,
  TOOLBAR_GROUP_CLASS,
  TOOLBAR_PANEL_TOGGLE_CLASS,
  WORKBENCH_TOOLBAR_CLASS,
} from "../workbench/toolbarClasses";

type SlideUiMode = "chrome" | "immersive";

const SLIDE_PUBLIC_ROOT_CLASS = [
  "openpress-workbench openpress-reader-app openpress-slide-public",
  "!fixed inset-0 !flex !h-dvh !w-full !flex-col !overflow-hidden overscroll-none",
  "!bg-[#0d0d0d] !text-[rgb(245_245_242_/_0.9)]",
].join(" ");
const SLIDE_PUBLIC_TOOLBAR_CLASS = [
  WORKBENCH_TOOLBAR_CLASS,
  "shrink-0 !z-10",
  "!border-b !border-[var(--openpress-workbench-border-muted)] !bg-[rgb(18_18_18_/_0.92)] backdrop-blur-xl",
  "[&_.openpress-workbench-toolbar-action]:!text-[rgb(245_245_242_/_0.6)]",
  "[&_.openpress-workbench-toolbar-panel-toggle]:!text-[rgb(245_245_242_/_0.6)]",
  "[&_.openpress-workbench-toolbar-action:hover]:!bg-[var(--openpress-workbench-border-muted)]",
  "[&_.openpress-workbench-toolbar-action:hover]:!text-[rgb(245_245_242_/_0.92)]",
  "[&_.openpress-workbench-toolbar-action:focus-visible]:!bg-[var(--openpress-workbench-border-muted)]",
  "[&_.openpress-workbench-toolbar-action:focus-visible]:!text-[rgb(245_245_242_/_0.92)]",
  "[&_.openpress-workbench-toolbar-panel-toggle:hover]:!bg-[var(--openpress-workbench-border-muted)]",
  "[&_.openpress-workbench-toolbar-panel-toggle:hover]:!text-[rgb(245_245_242_/_0.92)]",
  "[&_.openpress-workbench-toolbar-panel-toggle:focus-visible]:!bg-[var(--openpress-workbench-border-muted)]",
  "[&_.openpress-workbench-toolbar-panel-toggle:focus-visible]:!text-[rgb(245_245_242_/_0.92)]",
  "[&_.openpress-workbench-toolbar-action--primary]:!border-[rgb(240_182_76_/_0.38)]",
  "[&_.openpress-workbench-toolbar-action--primary]:!bg-[var(--openpress-accent,#df4b21)]",
  "[&_.openpress-workbench-toolbar-action--primary]:!text-white",
  "[&_.openpress-workbench-toolbar-action--primary]:shadow-[0_0_0_1px_rgb(255_255_255_/_0.08),0_10px_24px_rgb(223_75_33_/_0.28)]",
  "[&_.openpress-workbench-toolbar-action--primary:hover]:!bg-[color-mix(in_srgb,var(--openpress-accent,#df4b21)_84%,#fff)]",
  "[&_.openpress-workbench-toolbar-action--primary:hover]:!text-white",
  "[&_.openpress-workbench-toolbar-action--primary:focus-visible]:!bg-[color-mix(in_srgb,var(--openpress-accent,#df4b21)_84%,#fff)]",
  "[&_.openpress-workbench-toolbar-action--primary:focus-visible]:!text-white",
  "[&_.openpress-workbench-toolbar-action:disabled]:!pointer-events-none",
  "[&_.openpress-workbench-toolbar-action:disabled]:!text-[rgb(245_245_242_/_0.24)]",
].join(" ");
const SLIDE_PUBLIC_NAV_CLASS = "flex items-center gap-0.5";
const SLIDE_PUBLIC_NAV_BUTTON_CLASS = `${TOOLBAR_ACTION_CLASS} !h-[30px] !w-[30px] !p-0`;
const SLIDE_PUBLIC_PRESENT_BUTTON_CLASS = [
  TOOLBAR_ACTION_PRIMARY_CLASS,
  "!border-[rgb(240_182_76_/_0.38)] !bg-[var(--openpress-accent,#df4b21)] !text-white",
  "shadow-[0_0_0_1px_rgb(255_255_255_/_0.08),0_10px_24px_rgb(223_75_33_/_0.28)]",
  "hover:!bg-[color-mix(in_srgb,var(--openpress-accent,#df4b21)_84%,#fff)] hover:!text-white",
  "focus-visible:!bg-[color-mix(in_srgb,var(--openpress-accent,#df4b21)_84%,#fff)] focus-visible:!text-white",
].join(" ");
const SLIDE_PUBLIC_COUNTER_CLASS = [
  "min-w-14 px-1.5 text-center text-xs font-semibold tracking-[0.06em] text-[rgb(245_245_242_/_0.48)]",
  "[font-family:var(--openpress-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace)]",
].join(" ");
const SLIDE_PUBLIC_BODY_CLASS = "flex min-h-0 flex-1 overflow-hidden";
const SLIDE_PUBLIC_THUMBS_BASE_CLASS = [
  "w-[220px] shrink-0 flex-col overflow-hidden border-r border-white/[0.07] bg-[#0a0a0a] px-2 pb-6 pt-2",
].join(" ");
const SLIDE_PUBLIC_THUMB_CLASS_NAMES = {
  activeCard: "!border-[rgb(255_255_255_/_0.5)]",
  activeIndex: "!text-[rgb(245_245_242_/_0.72)]",
  card: "!text-[rgb(245_245_242_/_0.56)] hover:!border-[rgb(255_255_255_/_0.22)] hover:!bg-white/[0.04]",
  index: "!text-[rgb(245_245_242_/_0.32)]",
  list: "flex min-h-0 flex-1 flex-col gap-[10px] overflow-auto overscroll-contain !m-0 !list-none !pb-[10px] !pl-0 !pr-0 !pt-0 [scrollbar-color:rgb(255_255_255_/_0.14)_transparent] [scrollbar-width:thin]",
  title: "!text-[rgb(245_245_242_/_0.56)]",
};
const SLIDE_PUBLIC_STAGE_CLASS = "relative min-h-0 min-w-0 flex-1 overflow-hidden bg-[#0d0d0d]";
const SLIDE_PUBLIC_STAGE_IMMERSIVE_CLASS = `${SLIDE_PUBLIC_STAGE_CLASS} cursor-none`;
const SLIDE_PUBLIC_PAGES_CLASS = [
  "reader-pages openpress-public-page",
  "!grid !h-full !w-full content-center !items-center !justify-items-center !p-0",
  "[--openpress-page-gap:0]",
].join(" ");
const SLIDE_PUBLIC_PAGE_CLASS = PUBLIC_HTML_PAGE_CLASS;
const SLIDE_PUBLIC_PAGE_HTML_CLASS = PUBLIC_HTML_PAGE_HTML_CLASS;
const SLIDE_PUBLIC_MINI_HUD_BASE_CLASS = [
  "fixed bottom-[18px] right-[18px] z-40 flex items-center gap-1.5 rounded-[var(--openpress-workbench-radius-pill)]",
  "border border-[var(--openpress-workbench-glass-border)] bg-[var(--openpress-workbench-glass-bg)] p-1.5",
  "shadow-[var(--openpress-workbench-glass-shadow)] backdrop-blur-[18px]",
  "transition-[opacity,transform] duration-150",
].join(" ");
const SLIDE_PUBLIC_MINI_COUNTER_CLASS = [
  "min-w-14 px-2 text-center text-xs font-semibold leading-[30px] tracking-[0.08em] text-[rgb(245_245_242_/_0.72)]",
  "[font-family:var(--openpress-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace)]",
].join(" ");
const SLIDE_PUBLIC_MINI_BUTTON_CLASS = [
  "inline-flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0",
  "text-[rgb(245_245_242_/_0.68)] hover:bg-white/10 hover:text-[rgb(245_245_242_/_0.96)]",
  "focus-visible:bg-white/10 focus-visible:text-[rgb(245_245_242_/_0.96)] [&_svg]:h-[15px] [&_svg]:w-[15px]",
].join(" ");

export function SlidePublicViewer({
  document,
  pages,
  style,
  deploymentInfo,
}: {
  document: ReaderDocument;
  pages: HtmlPageBlock[];
  style: CSSProperties;
  deploymentInfo?: DeploymentInfo;
}) {
  const stageRef = useRef<HTMLElement | null>(null);
  const sourceContainerRef = useRef<HTMLDivElement | null>(null);
  const currentPageIndexRef = useRef(0);
  const normalizedPageCount = normalizeReaderPageCount(pages.length);

  const [currentPageIndex, setCurrentPageIndex] = useState(() => {
    if (typeof window === "undefined") return 0;
    return pageIndexFromHash(window.location.hash, normalizedPageCount) ?? 0;
  });
  const [uiMode, setUiMode] = useState<SlideUiMode>("chrome");
  const [thumbPanelOpen, setThumbPanelOpen] = useState(true);

  currentPageIndexRef.current = currentPageIndex;

  const currentPage = pages[clampReaderPageIndex(currentPageIndex, normalizedPageCount)];
  const currentPageLabel = formatReaderPageNumber(currentPageIndex + 1);
  const totalPageLabel = formatReaderPageNumber(normalizedPageCount);
  const pageHtml = useMemo(() => currentPage?.html ?? "", [currentPage?.html]);

  const pageViewport = usePageViewportScale({
    stageRef,
    pageContainerRef: sourceContainerRef,
    pageCount: pages.length,
    layoutMode: "single",
    initialScaleMode: "fit-width",
    maxFitScale: Infinity,
  });

  const setPage = useCallback(
    (pageIndex: number) => {
      const target = clampReaderPageIndex(pageIndex, normalizedPageCount);
      setCurrentPageIndex(target);
      replacePageRoute(target);
    },
    [normalizedPageCount],
  );

  // Clamp on page count change
  useEffect(() => {
    setCurrentPageIndex((idx) => clampReaderPageIndex(idx, normalizedPageCount));
  }, [normalizedPageCount]);

  // Hash sync
  useEffect(() => {
    const sync = () => {
      const fromHash = pageIndexFromHash(window.location.hash, normalizedPageCount);
      if (fromHash !== null) setCurrentPageIndex(fromHash);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [normalizedPageCount]);

  // Auto-enter immersive when ?fullscreen=1 is in the URL (e.g., launched from workbench play button)
  useEffect(() => {
    if (!shouldStartImmersive()) return;
    setUiMode("immersive");
    const root = globalThis.document.documentElement;
    if (root?.requestFullscreen) {
      void root.requestFullscreen().catch(() => {
        // Fullscreen rejected — keep immersive CSS only.
      });
    }
  }, []);

  // Fullscreen change
  useEffect(() => {
    const handler = () => {
      setUiMode(globalThis.document.fullscreenElement ? "immersive" : "chrome");
    };
    globalThis.document.addEventListener("fullscreenchange", handler);
    return () => globalThis.document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      if (event.key === "Escape") {
        const activeDoc = globalThis.document;
        if (activeDoc.fullscreenElement && activeDoc.exitFullscreen) {
          event.preventDefault();
          void activeDoc.exitFullscreen();
        }
        return;
      }

      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        enterImmersive();
        return;
      }

      if (event.key === " " || event.code === "Space" || event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        setPage(currentPageIndexRef.current + 1);
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        setPage(currentPageIndexRef.current - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        setPage(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setPage(normalizedPageCount - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [normalizedPageCount, setPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const enterImmersive = () => {
    setUiMode("immersive");
    const root = globalThis.document.documentElement;
    if (root?.requestFullscreen) {
      void root.requestFullscreen().catch(() => {
        // Fullscreen rejected (e.g. gesture policy) — keep immersive CSS only.
      });
    }
  };

  const exitImmersive = () => {
    const activeDoc = globalThis.document;
    if (activeDoc.fullscreenElement && activeDoc.exitFullscreen) {
      void activeDoc.exitFullscreen();
    } else {
      setUiMode("chrome");
    }
  };

  const handleStageClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (uiMode !== "immersive") return;
    if (event.defaultPrevented) return;
    if (!(event.target instanceof Element)) return;
    if (event.target.closest("a, button, input, textarea, select, [contenteditable]")) return;
    setPage(currentPageIndexRef.current + 1);
  };

  const LeftIcon = thumbPanelOpen ? PanelLeftClose : PanelLeftOpen;
  const leftLabel = thumbPanelOpen ? "收合縮圖面板" : "展開縮圖面板";
  const pdfHref = deploymentInfo?.pdf;

  return (
    <main
      className={`${SLIDE_PUBLIC_ROOT_CLASS} ${uiMode === "immersive" ? "cursor-none" : ""}`}
      style={style}
      data-openpress-react-runtime="true"
      data-openpress-view-mode="paged"
      data-openpress-press-type="slides"
      data-openpress-presentation-mode={uiMode === "immersive" ? "on" : "off"}
      data-openpress-present-ui={uiMode}
      aria-label={`${document.meta.title} 投影片瀏覽`}
    >
      {/* Top toolbar — chrome mode only */}
      <header
        className={`${SLIDE_PUBLIC_TOOLBAR_CLASS} ${uiMode === "immersive" ? "!hidden" : ""}`}
        role="toolbar"
        aria-label="投影片操作"
        data-openpress-slide-public-toolbar
      >
        <button
          type="button"
          className={TOOLBAR_PANEL_TOGGLE_CLASS}
          aria-label={leftLabel}
          title={leftLabel}
          onClick={() => setThumbPanelOpen((v) => !v)}
        >
          <LeftIcon aria-hidden="true" />
        </button>

        <div className={SLIDE_PUBLIC_NAV_CLASS} aria-label="翻頁">
          <button
            type="button"
            className={SLIDE_PUBLIC_NAV_BUTTON_CLASS}
            onClick={() => setPage(currentPageIndex - 1)}
            disabled={currentPageIndex === 0}
            aria-label="上一頁"
            title="上一頁"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <span className={SLIDE_PUBLIC_COUNTER_CLASS} aria-live="polite" aria-label={`第 ${currentPageLabel} 頁，共 ${totalPageLabel} 頁`}>
            {currentPageLabel} / {totalPageLabel}
          </span>
          <button
            type="button"
            className={SLIDE_PUBLIC_NAV_BUTTON_CLASS}
            onClick={() => setPage(currentPageIndex + 1)}
            disabled={currentPageIndex >= normalizedPageCount - 1}
            aria-label="下一頁"
            title="下一頁"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>

        <div className={TOOLBAR_CONTENT_CLASS} />

        <div className={TOOLBAR_GROUP_CLASS} aria-label="視圖">
          <button
            type="button"
            className={SLIDE_PUBLIC_PRESENT_BUTTON_CLASS}
            data-openpress-slide-present
            onClick={enterImmersive}
            aria-label="進入放映模式"
            title="放映"
          >
            <Play aria-hidden="true" />
            <span className={TOOLBAR_ACTION_LABEL_CLASS}>放映</span>
          </button>
          {pdfHref ? (
            <a
              href={pdfHref}
              target="_blank"
              rel="noopener noreferrer"
              className={TOOLBAR_ACTION_CLASS}
              aria-label="下載 PDF"
              title="下載 PDF"
            >
              <Download aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </header>

      {/* Body: thumb panel + stage */}
      <div className={SLIDE_PUBLIC_BODY_CLASS}>
        {/* Thumbnail panel */}
        <aside
          className={uiMode === "immersive" || !thumbPanelOpen ? "hidden" : `${SLIDE_PUBLIC_THUMBS_BASE_CLASS} flex`}
          aria-label="投影片縮圖"
          data-openpress-slide-public-thumbs
        >
          <PageThumbnails
            pages={pages}
            currentPageIndex={currentPageIndex}
            onSelectPage={setPage}
            theme={document.theme}
            classNames={SLIDE_PUBLIC_THUMB_CLASS_NAMES}
          />
        </aside>

        {/* Main slide stage */}
        <section
          className={uiMode === "immersive" ? SLIDE_PUBLIC_STAGE_IMMERSIVE_CLASS : SLIDE_PUBLIC_STAGE_CLASS}
          aria-label="投影片檢視區"
          onClick={handleStageClick}
          ref={stageRef}
        >
          <div
            className={SLIDE_PUBLIC_PAGES_CLASS}
            ref={sourceContainerRef}
            data-openpress-public-page="true"
            data-openpress-page-layout="single"
          >
            {currentPage ? (
              <div
                key={currentPage.id}
                id={`page-${String(currentPage.pageNumber).padStart(2, "0")}`}
                className={SLIDE_PUBLIC_PAGE_CLASS}
                data-openpress-object-id={currentPage.frameKey ? createPageObjectEntityId(currentPage.frameKey) : undefined}
                data-openpress-page-index={currentPage.pageNumber - 1}
                data-openpress-active="true"
              >
                <div className={SLIDE_PUBLIC_PAGE_HTML_CLASS} dangerouslySetInnerHTML={{ __html: pageHtml }} />
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {/* Immersive mini HUD — fullscreen mode only */}
      <div
        className={`${SLIDE_PUBLIC_MINI_HUD_BASE_CLASS} ${uiMode === "immersive" ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}
        aria-label="放映控制"
        data-openpress-present-scale={pageViewport.scaleMode}
      >
        <span className={SLIDE_PUBLIC_MINI_COUNTER_CLASS}>
          {currentPageLabel} / {totalPageLabel}
        </span>
        <button
          type="button"
          className={SLIDE_PUBLIC_MINI_BUTTON_CLASS}
          onClick={exitImmersive}
          aria-label="離開全螢幕"
          title="離開全螢幕 (Esc)"
        >
          <Minimize2 aria-hidden="true" />
        </button>
      </div>
    </main>
  );
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, button, [contenteditable]"));
}

function shouldStartImmersive() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("fullscreen") === "1";
}
