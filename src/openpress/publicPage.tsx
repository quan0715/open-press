import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type RefCallback,
  type RefObject,
} from "react";
import { BookOpen, ExternalLink, X } from "lucide-react";
import { collectBookmarkIndex } from "./indexes";
import type { InspectorState } from "./inspector";
import { paginateSourcePages, type PaginatedPage } from "./pagination";
import { getProjectIdentity } from "./projectIdentity";
import { hasBuildTimePagination } from "./reactDocumentMetadata";
import { useReaderRuntime } from "./readerRuntime";
import type { DeploymentInfo, ReaderDocument, HtmlPageBlock } from "./types";
import { Bookmarks, CurrentPagePanel } from "./workbenchPanels";
import type { DisplayPage } from "./workbenchTypes";

export const PUBLIC_DRAWER_BREAKPOINT = 1185;
export type ViewMode = "reading" | "paged";
export type PageInspector = Pick<InspectorState, "enabled" | "handleClick">;

const PAGED_VIEW_MIN_WIDTH = 360;

export function PublicViewer({
  document,
  pages,
  style,
  deploymentInfo = { online: false },
}: {
  document: ReaderDocument;
  pages: Array<HtmlPageBlock>;
  style: CSSProperties;
  deploymentInfo?: DeploymentInfo;
}) {
  const sourceContainerRef = useRef<HTMLDivElement | null>(null);
  const numberedPages = useMemo(() => numberSourceHeadings(pages), [pages]);
  const viewModeState = useViewMode();
  const { viewMode } = viewModeState;
  const buildTimePaginated = hasBuildTimePagination(document);
  const paginatedPages = usePaginatedPages(numberedPages, sourceContainerRef, viewMode === "paged" && !buildTimePaginated);
  const displayPages: DisplayPage[] = viewMode === "paged" && !buildTimePaginated
    ? (paginatedPages ?? numberedPages)
    : numberedPages;
  const paginatedReady = viewMode === "reading" || buildTimePaginated || Boolean(paginatedPages);
  const bookmarks = collectBookmarkIndex(displayPages);
  const anchorPageMap = useMemo(() => createAnchorPageMap(displayPages), [displayPages]);
  const reader = useReaderRuntime({
    pageCount: displayPages.length,
    rightPanelBreakpoint: PUBLIC_DRAWER_BREAKPOINT,
  });
  const currentPage = displayPages[reader.currentPageIndex];
  const staticPdfHref = deploymentInfo.pdf;
  const projectIdentity = getProjectIdentity(document.meta);

  const drawerOpen = reader.rightPanelOpen;

  const selectPublicPage = (pageIndex: number, options?: { behavior?: ScrollBehavior }) => {
    reader.setPage(pageIndex, options);
    if (window.innerWidth < PUBLIC_DRAWER_BREAKPOINT && drawerOpen) reader.toggleRightPanel();
  };

  const selectPublicAnchor = (anchorId: string, pageIndex?: number) => {
    const targetPageIndex = resolveAnchorPageIndex(anchorPageMap, displayPages.length, anchorId, pageIndex);
    if (targetPageIndex === null) return false;
    selectPublicPage(targetPageIndex, { behavior: "smooth" });
    return true;
  };

  const appClassName = [
    "reader-app openpress-reader-app openpress-public-viewer is-ready",
    drawerOpen ? "" : "is-closed-right",
  ].filter(Boolean).join(" ");

  const handleOpenStaticPdf = () => {
    if (!staticPdfHref) return;
    window.open(staticPdfHref, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="openpress-workbench openpress-public-shell" style={style} data-openpress-public-viewer="true" aria-label={`${document.meta.title} 公開頁`}>
      <div
        className={appClassName}
        data-openpress-react-runtime="true"
        data-openpress-view-mode={viewMode}
        data-openpress-pagination={paginatedReady ? "ready" : "pending"}
      >
        {drawerOpen && (
          <div className="openpress-public-scrim" aria-hidden="true" onClick={reader.toggleRightPanel} />
        )}
        <button type="button" className="openpress-public-fab" aria-label="開啟目錄" onClick={reader.toggleRightPanel}>
          <BookOpen size={20} aria-hidden="true" />
        </button>

        <section className="openpress-workbench__stage openpress-public-viewer__stage" aria-label="公開文件頁面">
          <main className="reader-stage" tabIndex={-1} ref={reader.stageRef}>
            <PublicPage
              pages={displayPages}
              currentPageIndex={reader.currentPageIndex}
              devMode={false}
              paginatedReady={paginatedReady}
              sourceContainerRef={sourceContainerRef}
              registerPage={reader.registerPage}
              onInternalAnchorNavigate={selectPublicAnchor}
            />
          </main>
        </section>

        <aside className="reader-side-nav openpress-workspace-panel openpress-public-navigation" aria-label="文件導覽">
          <button type="button" className="openpress-public-drawer-close" aria-label="關閉目錄" onClick={reader.toggleRightPanel}>
            <X size={16} aria-hidden="true" />
          </button>
          <section className="openpress-public-identity" aria-label="文件資訊">
            <strong>
              <span className="openpress-public-title-main">{projectIdentity.name}</span>
              {projectIdentity.subtitle ? <span className="openpress-public-title-sub">{projectIdentity.subtitle}</span> : null}
            </strong>
            {projectIdentity.label ? <span>{projectIdentity.label}</span> : null}
          </section>
          <div className="openpress-public-actions" aria-label="文件操作">
            <button
              type="button"
              className="openpress-public-export-button"
              data-openpress-public-export
              disabled={!staticPdfHref}
              onClick={handleOpenStaticPdf}
            >
              <ExternalLink aria-hidden="true" />
              {!staticPdfHref ? "PDF 未部署" : "開啟 PDF"}
            </button>
          </div>
          <section id="openpress-bookmarks" className="openpress-panel-section openpress-panel-section--bookmarks" aria-label="章節書籤">
            <nav className="reader-bookmarks" aria-label="章節導覽" data-openpress-react-bookmarks="true">
              <div className="reader-bookmarks-rail" aria-hidden="true" />
              <Bookmarks items={bookmarks} currentPageIndex={reader.currentPageIndex} onSelectPage={selectPublicPage} />
            </nav>
          </section>
          <CurrentPagePanel
            currentPageLabel={reader.currentPageLabel}
            totalPageLabel={reader.totalPageLabel}
            progressPercent={reader.progressPercent}
            title={currentPage?.title || document.meta.title}
            pageLabelPrefix={viewMode === "reading" ? "節" : "頁"}
            showHeading={false}
            showTitle={false}
          />
        </aside>
      </div>
    </main>
  );
}

export function useViewMode() {
  const [pagedAllowed, setPagedAllowed] = useState(() => {
    if (typeof window === "undefined") return true;
    return viewportAllowsPagedMode();
  });

  useLayoutEffect(() => {
    if (typeof window === "undefined") return undefined;

    let frame: number | null = null;
    const sync = () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = null;
        setPagedAllowed(viewportAllowsPagedMode());
      });
    };

    sync();
    window.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("resize", sync);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  const viewMode: ViewMode = pagedAllowed ? "paged" : "reading";

  return { viewMode };
}

export function PrintDocument({
  document,
  pages,
  style,
}: {
  document: ReaderDocument;
  pages: Array<HtmlPageBlock>;
  style: CSSProperties;
}) {
  const numberedPages = useMemo(() => numberSourceHeadings(pages), [pages]);
  const sourceContainerRef = useRef<HTMLDivElement | null>(null);
  const buildTimePaginated = hasBuildTimePagination(document);
  const paginatedPages = usePaginatedPages(numberedPages, sourceContainerRef, !buildTimePaginated);
  const displayPages: DisplayPage[] = buildTimePaginated ? numberedPages : (paginatedPages ?? numberedPages);
  const paginatedReady = buildTimePaginated || Boolean(paginatedPages);
  const registerPage = () => () => undefined;

  return (
    <main
      className="openpress-print-document"
      style={style}
      data-openpress-print-document="true"
      data-openpress-pagination={paginatedReady ? "ready" : "pending"}
      aria-label={`${document.meta.title} PDF 輸出`}
    >
      <PublicPage
        pages={displayPages}
        currentPageIndex={0}
        devMode={false}
        paginatedReady={paginatedReady}
        sourceContainerRef={sourceContainerRef}
        registerPage={registerPage}
        exposeSourceData
      />
    </main>
  );
}

function usePaginatedPages(
  pages: Array<HtmlPageBlock>,
  sourceContainerRef: RefObject<HTMLDivElement | null>,
  enabled = true,
) {
  const [paginatedPages, setPaginatedPages] = useState<PaginatedPage[] | null>(null);

  useLayoutEffect(() => {
    setPaginatedPages(null);
  }, [pages]);

  useLayoutEffect(() => {
    if (!enabled) return undefined;
    if (paginatedPages) return undefined;
    const sourceContainer = sourceContainerRef.current;
    if (!sourceContainer) return undefined;

    let cancelled = false;

    void (async () => {
      await waitForPaginationAssets(sourceContainer);
      await nextAnimationFrame();
      if (cancelled) return;

      const nextPages = paginateSourcePages(sourceContainer, pages);
      if (!cancelled) setPaginatedPages(nextPages);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, pages, paginatedPages, sourceContainerRef]);

  return paginatedPages;
}

function viewportAllowsPagedMode() {
  if (typeof window === "undefined") return true;
  return window.innerWidth >= PAGED_VIEW_MIN_WIDTH;
}

export function numberSourceHeadings(pages: Array<HtmlPageBlock>): Array<HtmlPageBlock> {
  if (typeof document === "undefined") return pages;

  let chapterCounter = 0;
  let sectionCounter = 0;
  let topicCounter = 0;

  return pages.map((page) => {
    const template = document.createElement("template");
    template.innerHTML = page.html;
    const readerPage = template.content.querySelector<HTMLElement>(".reader-page");
    if (!readerPage || !isReportPage(readerPage)) return page;

    readerPage.querySelectorAll<HTMLElement>("h2, h3, h4").forEach((heading) => {
      if (heading.tagName === "H2") {
        chapterCounter += 1;
        sectionCounter = 0;
        topicCounter = 0;
        ensureHeadingId(heading, `section-${String(chapterCounter).padStart(2, "0")}`);
        heading.dataset.chapter = String(chapterCounter).padStart(2, "0");
        heading.dataset.chapterMarker = `#${chapterCounter}`;
        return;
      }

      if (heading.tagName === "H3") {
        sectionCounter += 1;
        topicCounter = 0;
        ensureHeadingId(heading, `section-${chapterCounter}-${sectionCounter}`);
        heading.dataset.section = `${chapterCounter}.${sectionCounter}`;
        return;
      }

      if (heading.tagName === "H4") {
        topicCounter += 1;
        if (chapterCounter > 0 && sectionCounter > 0) {
          ensureHeadingId(heading, `section-${chapterCounter}-${sectionCounter}-${topicCounter}`);
          heading.dataset.topic = `${chapterCounter}.${sectionCounter}.${topicCounter}`;
        }
      }
    });

    const html = template.innerHTML;
    const anchors = collectElementIds(template.content);
    return html === page.html && anchorsAreEqual(page.anchors, anchors) ? page : { ...page, html, anchors };
  });
}

function isReportPage(page: HTMLElement) {
  return page.dataset.pageKind === "report";
}

async function waitForPaginationAssets(scope: HTMLElement) {
  await document.fonts?.ready;
  const images = Array.from(scope.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(images.map(waitForImage));
  await nextAnimationFrame();
}

async function waitForImage(img: HTMLImageElement) {
  if (!img.complete) {
    await new Promise<void>((resolve) => {
      const settle = () => {
        img.removeEventListener("load", settle);
        img.removeEventListener("error", settle);
        resolve();
      };

      img.addEventListener("load", settle, { once: true });
      img.addEventListener("error", settle, { once: true });
    });
  }

  await img.decode?.().catch(() => undefined);
}

function nextAnimationFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

export function PublicPage({
  pages,
  currentPageIndex,
  devMode,
  paginatedReady,
  sourceContainerRef,
  registerPage,
  exposeSourceData = false,
  inspector,
  onInternalAnchorNavigate,
}: {
  pages: DisplayPage[];
  currentPageIndex: number;
  devMode: boolean;
  paginatedReady: boolean;
  sourceContainerRef: RefObject<HTMLDivElement | null>;
  registerPage: (pageIndex: number) => RefCallback<HTMLElement>;
  exposeSourceData?: boolean;
  inspector?: PageInspector;
  onInternalAnchorNavigate?: (anchorId: string, pageIndex?: number) => boolean;
}) {
  const handlePageClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (inspector?.enabled && inspector.handleClick(event)) return;
    if (!onInternalAnchorNavigate || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    if (!(event.target instanceof Element)) return;

    const link = event.target.closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link) return;

    const href = link.getAttribute("href") ?? "";
    const anchorId = link.dataset.openpressAnchor || safeDecodeAnchor(href.slice(1));
    if (!anchorId) return;

    const pageIndex = Number.parseInt(link.dataset.openpressTargetPageIndex ?? "", 10);
    const handled = onInternalAnchorNavigate(anchorId, Number.isFinite(pageIndex) ? pageIndex : undefined);
    if (handled) event.preventDefault();
  };

  return (
    <div
      className="reader-pages openpress-public-page"
      ref={sourceContainerRef}
      data-openpress-public-page="true"
      onClick={handlePageClick}
    >
      {pages.map((page) => (
        <div
          key={page.id}
          ref={registerPage(page.pageNumber - 1)}
          id={`page-${String(page.pageNumber).padStart(2, "0")}`}
          className="openpress-html-page"
          data-openpress-page-index={page.pageNumber - 1}
          data-openpress-active={currentPageIndex === page.pageNumber - 1 ? "true" : "false"}
          data-source-path={exposeSourceData ? page.source?.path : undefined}
          data-source-file={exposeSourceData ? page.source?.file : undefined}
        >
          {devMode && !paginatedReady && page.source?.path ? (
            <div className="openpress-html-page__toolbar">
              <code>{page.source.path}</code>
            </div>
          ) : null}
          <div className="openpress-html-page__html" dangerouslySetInnerHTML={{ __html: page.html }} />
        </div>
      ))}
    </div>
  );
}

export function createAnchorPageMap(pages: DisplayPage[]) {
  const map = new Map<string, number>();
  pages.forEach((page, index) => {
    page.anchors?.forEach((anchor) => {
      if (anchor && !map.has(anchor)) map.set(anchor, index);
    });
  });
  return map;
}

export function resolveAnchorPageIndex(
  anchorPageMap: Map<string, number>,
  pageCount: number,
  anchorId: string,
  pageIndex?: number,
): number | null {
  if (typeof pageIndex === "number" && Number.isInteger(pageIndex) && pageIndex >= 0 && pageIndex < pageCount) return pageIndex;
  const mapped = anchorPageMap.get(anchorId);
  return mapped === undefined ? null : mapped;
}

function ensureHeadingId(heading: HTMLElement, fallbackId: string) {
  if (heading.id) return;
  heading.id = fallbackId;
}

function collectElementIds(scope: ParentNode) {
  const ids: string[] = [];
  scope.querySelectorAll<HTMLElement>("[id]").forEach((el) => {
    if (el.id && !ids.includes(el.id)) ids.push(el.id);
  });
  return ids;
}

function anchorsAreEqual(left: string[] | undefined, right: string[]) {
  if (!left || left.length !== right.length) return false;
  return left.every((item, index) => item === right[index]);
}

function safeDecodeAnchor(value: string) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
