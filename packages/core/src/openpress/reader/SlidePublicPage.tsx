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

type SlideUiMode = "chrome" | "immersive";

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
      className="openpress-workbench openpress-reader-app openpress-slide-public"
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
        className="openpress-workbench-toolbar openpress-slide-public__toolbar"
        role="toolbar"
        aria-label="投影片操作"
        data-openpress-slide-public-toolbar
      >
        <button
          type="button"
          className="openpress-workbench-toolbar-panel-toggle"
          aria-label={leftLabel}
          title={leftLabel}
          onClick={() => setThumbPanelOpen((v) => !v)}
        >
          <LeftIcon aria-hidden="true" />
        </button>

        <div className="openpress-slide-public__nav" aria-label="翻頁">
          <button
            type="button"
            className="openpress-workbench-toolbar-action openpress-slide-public__nav-btn"
            onClick={() => setPage(currentPageIndex - 1)}
            disabled={currentPageIndex === 0}
            aria-label="上一頁"
            title="上一頁"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <span className="openpress-slide-public__counter" aria-live="polite" aria-label={`第 ${currentPageLabel} 頁，共 ${totalPageLabel} 頁`}>
            {currentPageLabel} / {totalPageLabel}
          </span>
          <button
            type="button"
            className="openpress-workbench-toolbar-action openpress-slide-public__nav-btn"
            onClick={() => setPage(currentPageIndex + 1)}
            disabled={currentPageIndex >= normalizedPageCount - 1}
            aria-label="下一頁"
            title="下一頁"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>

        <div className="openpress-workbench-toolbar__content" />

        <div className="openpress-workbench-toolbar__group" aria-label="視圖">
          <button
            type="button"
            className="openpress-workbench-toolbar-action openpress-workbench-toolbar-action--primary"
            onClick={enterImmersive}
            aria-label="進入放映模式"
            title="放映"
          >
            <Play aria-hidden="true" />
            <span className="openpress-workbench-toolbar-action__label">放映</span>
          </button>
          {pdfHref ? (
            <a
              href={pdfHref}
              target="_blank"
              rel="noopener noreferrer"
              className="openpress-workbench-toolbar-action"
              aria-label="下載 PDF"
              title="下載 PDF"
            >
              <Download aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </header>

      {/* Body: thumb panel + stage */}
      <div className="openpress-slide-public__body">
        {/* Thumbnail panel */}
        <aside
          className={`openpress-slide-public__thumbs${thumbPanelOpen ? "" : " is-closed"}`}
          aria-label="投影片縮圖"
          data-openpress-slide-public-thumbs
        >
          <PageThumbnails
            pages={pages}
            currentPageIndex={currentPageIndex}
            onSelectPage={setPage}
            theme={document.theme}
          />
        </aside>

        {/* Main slide stage */}
        <section
          className="openpress-slide-public__stage"
          aria-label="投影片檢視區"
          onClick={handleStageClick}
          ref={stageRef}
        >
          <div
            className="reader-pages openpress-public-page openpress-slide-public__pages"
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
        </section>
      </div>

      {/* Immersive mini HUD — fullscreen mode only */}
      <div
        className="openpress-slide-public__mini-hud"
        aria-label="放映控制"
        data-openpress-present-scale={pageViewport.scaleMode}
      >
        <span className="openpress-slide-public__mini-counter">
          {currentPageLabel} / {totalPageLabel}
        </span>
        <button
          type="button"
          className="openpress-slide-public__mini-btn"
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
