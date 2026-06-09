import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { Download, Maximize2, X } from "lucide-react";
import { createPageObjectEntityId } from "../document-model";
import type { DeploymentInfo, HtmlPageBlock, ReaderDocument } from "../document-model";
import { pageIndexFromHash, replacePageRoute } from "./readerPageRoute";
import { clampReaderPageIndex, formatReaderPageNumber, normalizeReaderPageCount } from "./readerStateModel";
import { usePageViewportScale } from "./usePageViewportScale";
import { PUBLIC_HTML_PAGE_CLASS, PUBLIC_HTML_PAGE_HTML_CLASS } from "./publicViewerClasses";

type PresentationUiMode = "chrome" | "immersive";

const PRESENTER_ROOT_CLASS = [
  "openpress-workbench openpress-reader-app openpress-slide-presenter",
  "fixed inset-0 !grid !h-dvh !min-h-dvh !w-full !overflow-hidden overscroll-none",
  "![background-image:radial-gradient(circle_at_50%_0,var(--openpress-workbench-border-muted),transparent_42%)] !bg-[#070707]",
  "!text-[rgb(245_245_242_/_0.92)]",
].join(" ");
const PRESENTER_STAGE_CLASS = "relative min-h-0 min-w-0 overflow-hidden cursor-pointer";
const PRESENTER_STAGE_IMMERSIVE_CLASS = "relative min-h-0 min-w-0 overflow-hidden cursor-none";
const READER_STAGE_CLASS = [
  "reader-stage relative flex !h-full !min-h-0 !w-full items-center justify-center !overflow-hidden !bg-transparent outline-none",
  "[grid-area:main] [container-type:inline-size] focus:outline-none overscroll-contain !snap-none",
  "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
].join(" ");
const READER_PAGES_CLASS = [
  "reader-pages openpress-public-page",
  "!grid !h-full !min-h-full !w-full content-center !items-center !justify-items-center !p-0",
  "[--openpress-page-gap:0]",
].join(" ");
const PAGE_FRAME_CLASS = `${PUBLIC_HTML_PAGE_CLASS} !min-h-0 !scroll-mt-0 !snap-center`;
const PAGE_HTML_CLASS = [
  PUBLIC_HTML_PAGE_HTML_CLASS,
  "shadow-[0_28px_80px_rgb(0_0_0_/_0.34),0_0_0_1px_rgb(255_255_255_/_0.1)]",
].join(" ");
const HUD_BASE_CLASS = [
  "fixed bottom-[18px] right-[18px] z-40 flex items-center gap-2",
  "rounded-[var(--openpress-workbench-radius-pill)] border border-[var(--openpress-workbench-glass-border)]",
  "bg-[var(--openpress-workbench-glass-bg)] p-1.5 shadow-[var(--openpress-workbench-glass-shadow)]",
  "backdrop-blur-[18px] transition-[opacity,transform] duration-150",
].join(" ");
const HUD_TITLE_CLASS = [
  "max-w-60 overflow-hidden text-ellipsis whitespace-nowrap border-r border-white/10 px-3",
  "text-xs font-medium leading-[30px] text-[rgb(245_245_242_/_0.56)]",
  "[font-family:var(--openpress-font-sans,system-ui,sans-serif)]",
].join(" ");
const HUD_PROGRESS_CLASS = [
  "min-w-16 px-[10px] text-center text-xs font-semibold leading-[30px]",
  "tracking-[0.08em] text-[rgb(245_245_242_/_0.72)]",
  "[font-family:var(--openpress-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace)]",
].join(" ");
const HUD_BUTTON_CLASS = [
  "inline-flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full border-0",
  "bg-transparent p-0 text-[rgb(245_245_242_/_0.68)] no-underline",
  "hover:bg-white/10 hover:text-[rgb(245_245_242_/_0.96)] focus-visible:bg-white/10 focus-visible:text-[rgb(245_245_242_/_0.96)]",
  "[&_svg]:h-[15px] [&_svg]:w-[15px]",
].join(" ");

export function SlidePresentationPage({
  document,
  pages,
  style,
  onExitPresentation,
  deploymentInfo,
}: {
  document: ReaderDocument;
  pages: HtmlPageBlock[];
  style: CSSProperties;
  onExitPresentation?: (pageIndex: number) => void;
  deploymentInfo?: DeploymentInfo;
}) {
  const sourceContainerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLElement | null>(null);
  const currentPageIndexRef = useRef(0);
  const normalizedPageCount = normalizeReaderPageCount(pages.length);
  const [currentPageIndex, setCurrentPageIndex] = useState(() => {
    if (typeof window === "undefined") return 0;
    return pageIndexFromHash(window.location.hash, normalizedPageCount) ?? 0;
  });
  const [uiMode, setUiMode] = useState<PresentationUiMode>(() => {
    if (shouldStartImmersive()) return "immersive";
    // Fullscreen may already be active if requestFullscreen() was called
    // synchronously in the workbench click handler before in-place navigation.
    if (typeof globalThis.document !== "undefined" && globalThis.document.fullscreenElement) return "immersive";
    return "chrome";
  });
  const pageViewport = usePageViewportScale({
    stageRef,
    pageContainerRef: sourceContainerRef,
    pageCount: pages.length,
    layoutMode: "single",
    initialScaleMode: "fit-page",
    maxFitScale: Infinity,
  });
  const currentPage = pages[clampReaderPageIndex(currentPageIndex, normalizedPageCount)];
  const currentPageLabel = formatReaderPageNumber(currentPageIndex + 1);
  const totalPageLabel = formatReaderPageNumber(normalizedPageCount);
  const setPage = useCallback((pageIndex: number) => {
    const target = clampReaderPageIndex(pageIndex, normalizedPageCount);
    setCurrentPageIndex(target);
    replacePageRoute(target);
  }, [normalizedPageCount]);

  currentPageIndexRef.current = currentPageIndex;

  useEffect(() => {
    setCurrentPageIndex((idx) => clampReaderPageIndex(idx, normalizedPageCount));
  }, [normalizedPageCount]);

  useEffect(() => {
    const syncPageFromHash = () => {
      const fromHash = pageIndexFromHash(window.location.hash, normalizedPageCount);
      if (fromHash !== null) setCurrentPageIndex(fromHash);
    };

    syncPageFromHash();
    window.addEventListener("hashchange", syncPageFromHash);
    return () => window.removeEventListener("hashchange", syncPageFromHash);
  }, [normalizedPageCount]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (event.key === "Escape") {
        const activeDocument = globalThis.document;
        if (activeDocument.fullscreenElement && activeDocument.exitFullscreen) {
          event.preventDefault();
          void activeDocument.exitFullscreen();
        }
        return;
      }
      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        setPage(currentPageIndexRef.current + 1);
      } else if (event.key === "ArrowRight" || event.key === "PageDown") {
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
  }, [normalizedPageCount, onExitPresentation, setPage]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setUiMode(globalThis.document.fullscreenElement ? "immersive" : "chrome");
    };

    globalThis.document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => globalThis.document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!shouldStartImmersive()) return;
    enterImmersive({ keepOnFailure: true });
  }, []);

  const handleStageClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (event.defaultPrevented) return;
    if (!(event.target instanceof Element)) return;
    if (event.target.closest("a, button, input, textarea, select, [contenteditable]")) return;
    setPage(currentPageIndex + 1);
  };

  const handleFullscreen = () => {
    enterImmersive({ keepOnFailure: false });
  };

  const enterImmersive = ({ keepOnFailure }: { keepOnFailure: boolean }) => {
    const stage = stageRef.current;
    if (!stage?.requestFullscreen) {
      setUiMode("immersive");
      return;
    }
    setUiMode("immersive");
    void stage.requestFullscreen().catch(() => {
      if (!keepOnFailure) setUiMode("chrome");
    });
  };

  const pageHtml = useMemo(() => currentPage?.html ?? "", [currentPage?.html]);

  return (
    <main
      className={`${PRESENTER_ROOT_CLASS} ${uiMode === "immersive" ? "cursor-none" : ""}`}
      style={style}
      data-openpress-react-runtime="true"
      data-openpress-view-mode="paged"
      data-openpress-press-type="slides"
      data-openpress-presentation-mode="on"
      data-openpress-present-ui={uiMode}
      data-openpress-slide-presenter
      aria-label={`${document.meta.title} 放映模式`}
    >
      <section
        className={uiMode === "immersive" ? PRESENTER_STAGE_IMMERSIVE_CLASS : PRESENTER_STAGE_CLASS}
        data-openpress-present-stage
        aria-label="投影片放映區"
        onClick={handleStageClick}
      >
        <main className={READER_STAGE_CLASS} tabIndex={-1} ref={stageRef}>
          <div
            className={READER_PAGES_CLASS}
            ref={sourceContainerRef}
            data-openpress-public-page="true"
            data-openpress-page-layout="single"
          >
            {currentPage ? (
              <div
                key={currentPage.id}
                id={`page-${String(currentPage.pageNumber).padStart(2, "0")}`}
                className={PAGE_FRAME_CLASS}
                data-openpress-object-id={currentPage.frameKey ? createPageObjectEntityId(currentPage.frameKey) : undefined}
                data-openpress-page-index={currentPage.pageNumber - 1}
                data-openpress-active="true"
              >
                <div className={PAGE_HTML_CLASS} dangerouslySetInnerHTML={{ __html: pageHtml }} />
              </div>
            ) : null}
          </div>
        </main>
      </section>

      <div
        className={`${HUD_BASE_CLASS} ${uiMode === "immersive" ? "pointer-events-none translate-y-2 opacity-0" : "translate-y-0 opacity-100"}`}
        aria-label="放映控制"
      >
        {deploymentInfo && document.meta.title ? (
          <span className={HUD_TITLE_CLASS} aria-label="簡報標題">
            {document.meta.title}
          </span>
        ) : null}
        <span
          className={HUD_PROGRESS_CLASS}
          data-openpress-present-progress
          data-openpress-present-scale={pageViewport.scaleMode}
        >
          {currentPageLabel} / {totalPageLabel}
        </span>
        <button
          type="button"
          className={HUD_BUTTON_CLASS}
          data-openpress-present-fullscreen
          onClick={handleFullscreen}
          aria-label="進入全螢幕"
          title="進入全螢幕"
        >
          <Maximize2 aria-hidden="true" />
        </button>
        {deploymentInfo?.pdf ? (
          <a
            href={deploymentInfo.pdf}
            target="_blank"
            rel="noopener noreferrer"
            className={HUD_BUTTON_CLASS}
            data-openpress-present-pdf
            aria-label="下載 PDF"
            title="下載 PDF"
          >
            <Download aria-hidden="true" />
          </a>
        ) : null}
        {onExitPresentation ? (
          <button
            type="button"
            className={HUD_BUTTON_CLASS}
            data-openpress-present-exit
            onClick={() => onExitPresentation(currentPageIndex)}
            aria-label="回到工作台"
            title="回到工作台"
          >
            <X aria-hidden="true" />
          </button>
        ) : null}
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
