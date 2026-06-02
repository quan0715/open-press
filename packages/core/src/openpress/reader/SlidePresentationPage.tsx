import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { Maximize2, X } from "lucide-react";
import { createPageObjectEntityId } from "../document-model";
import type { HtmlPageBlock, ReaderDocument } from "../document-model";
import { pageIndexFromHash, replacePageRoute } from "./readerPageRoute";
import { clampReaderPageIndex, formatReaderPageNumber, normalizeReaderPageCount } from "./readerStateModel";
import { usePageViewportScale } from "./usePageViewportScale";

type PresentationUiMode = "chrome" | "immersive";

export function SlidePresentationPage({
  document,
  pages,
  style,
  onExitPresentation,
}: {
  document: ReaderDocument;
  pages: HtmlPageBlock[];
  style: CSSProperties;
  onExitPresentation?: (pageIndex: number) => void;
}) {
  const sourceContainerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLElement | null>(null);
  const currentPageIndexRef = useRef(0);
  const normalizedPageCount = normalizeReaderPageCount(pages.length);
  const [currentPageIndex, setCurrentPageIndex] = useState(() => {
    if (typeof window === "undefined") return 0;
    return pageIndexFromHash(window.location.hash, normalizedPageCount) ?? 0;
  });
  const [uiMode, setUiMode] = useState<PresentationUiMode>(() => (
    shouldStartImmersive() ? "immersive" : "chrome"
  ));
  const pageViewport = usePageViewportScale({
    stageRef,
    pageContainerRef: sourceContainerRef,
    pageCount: pages.length,
    layoutMode: "single",
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
        // Esc is reserved for exiting browser fullscreen. The chrome HUD
        // already exposes explicit "re-enter fullscreen" and "close"
        // buttons; navigating out of the presenter from a stray keystroke
        // would yank the user back to the workspace shell unexpectedly
        // (and racily, since the same Esc that triggered the browser's
        // fullscreen exit is also delivered to this handler with
        // fullscreenElement already null).
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
      className="openpress-workbench openpress-reader-app openpress-slide-presenter"
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
        className="openpress-slide-presenter__stage"
        data-openpress-present-stage
        aria-label="投影片放映區"
        onClick={handleStageClick}
      >
        <main className="reader-stage" tabIndex={-1} ref={stageRef}>
          <div
            className="reader-pages openpress-public-page openpress-slide-presenter__pages"
            ref={sourceContainerRef}
            data-openpress-public-page="true"
            data-openpress-page-layout="single"
          >
            {currentPage ? (
              <div
                key={currentPage.id}
                id={`page-${String(currentPage.pageNumber).padStart(2, "0")}`}
                className="openpress-html-page"
                data-openpress-object-id={currentPage.frameKey ? createPageObjectEntityId(currentPage.frameKey) : undefined}
                data-openpress-page-index={currentPage.pageNumber - 1}
                data-openpress-active="true"
              >
                <div className="openpress-html-page__html" dangerouslySetInnerHTML={{ __html: pageHtml }} />
              </div>
            ) : null}
          </div>
        </main>
      </section>

      <div className="openpress-slide-presenter__hud" aria-label="放映控制">
        <span
          className="openpress-slide-presenter__progress"
          data-openpress-present-progress
          data-openpress-present-scale={pageViewport.scaleMode}
        >
          {currentPageLabel} / {totalPageLabel}
        </span>
        <button
          type="button"
          className="openpress-slide-presenter__button"
          data-openpress-present-fullscreen
          onClick={handleFullscreen}
          aria-label="進入全螢幕"
          title="進入全螢幕"
        >
          <Maximize2 aria-hidden="true" />
        </button>
        <button
          type="button"
          className="openpress-slide-presenter__button"
          data-openpress-present-exit
          onClick={() => onExitPresentation?.(currentPageIndex)}
          aria-label="回到工作台"
          title="回到工作台"
        >
          <X aria-hidden="true" />
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
