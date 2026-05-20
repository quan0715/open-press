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
import type { QDocInspectorState } from "./inspector";
import { paginateQDocSourcePages, type PaginatedQDocPage } from "./pagination";
import { getQDocProjectIdentity } from "./projectIdentity";
import { hasQDocBuildTimePagination } from "./reactDocumentMetadata";
import { useQDocReaderRuntime } from "./readerRuntime";
import type { QDocDeploymentInfo, QDocDocument, QDocHtmlPageBlock } from "./types";
import { QDocBookmarks, QDocCurrentPagePanel } from "./workbenchPanels";
import type { QDocDisplayPage } from "./workbenchTypes";

export const PUBLIC_DRAWER_BREAKPOINT = 1185;
export type QDocViewMode = "reading" | "paged";
export type QDocPageInspector = Pick<QDocInspectorState, "enabled" | "handleClick">;

const PAGED_VIEW_MIN_WIDTH = 360;

export function QDocPublicViewer({
  document,
  pages,
  style,
  deploymentInfo = { online: false },
}: {
  document: QDocDocument;
  pages: Array<QDocHtmlPageBlock>;
  style: CSSProperties;
  deploymentInfo?: QDocDeploymentInfo;
}) {
  const sourceContainerRef = useRef<HTMLDivElement | null>(null);
  const numberedPages = useMemo(() => numberQDocSourceHeadings(pages), [pages]);
  const viewModeState = useQDocViewMode();
  const { viewMode } = viewModeState;
  const buildTimePaginated = hasQDocBuildTimePagination(document);
  const paginatedPages = usePaginatedQDocPages(numberedPages, sourceContainerRef, viewMode === "paged" && !buildTimePaginated);
  const displayPages: QDocDisplayPage[] = viewMode === "paged" && !buildTimePaginated
    ? (paginatedPages ?? numberedPages)
    : numberedPages;
  const paginatedReady = viewMode === "reading" || buildTimePaginated || Boolean(paginatedPages);
  const bookmarks = collectBookmarkIndex(displayPages);
  const anchorPageMap = useMemo(() => createQDocAnchorPageMap(displayPages), [displayPages]);
  const reader = useQDocReaderRuntime({
    pageCount: displayPages.length,
    rightPanelBreakpoint: PUBLIC_DRAWER_BREAKPOINT,
  });
  const currentPage = displayPages[reader.currentPageIndex];
  const staticPdfHref = deploymentInfo.pdf;
  const projectIdentity = getQDocProjectIdentity(document.meta);

  const drawerOpen = reader.rightPanelOpen;

  const selectPublicPage = (pageIndex: number, options?: { behavior?: ScrollBehavior }) => {
    reader.setPage(pageIndex, options);
    if (window.innerWidth < PUBLIC_DRAWER_BREAKPOINT && drawerOpen) reader.toggleRightPanel();
  };

  const selectPublicAnchor = (anchorId: string, pageIndex?: number) => {
    const targetPageIndex = resolveQDocAnchorPageIndex(anchorPageMap, displayPages.length, anchorId, pageIndex);
    if (targetPageIndex === null) return false;
    selectPublicPage(targetPageIndex, { behavior: "smooth" });
    return true;
  };

  const appClassName = [
    "reader-app qdoc-reader-app qdoc-public-viewer is-ready",
    drawerOpen ? "" : "is-closed-right",
  ].filter(Boolean).join(" ");

  const handleOpenStaticPdf = () => {
    if (!staticPdfHref) return;
    window.open(staticPdfHref, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="qdoc-workbench qdoc-public-shell" style={style} data-qdoc-public-viewer="true" aria-label={`${document.meta.title} 公開頁`}>
      <div
        className={appClassName}
        data-qdoc-react-runtime="true"
        data-qdoc-view-mode={viewMode}
        data-qdoc-pagination={paginatedReady ? "ready" : "pending"}
      >
        {drawerOpen && (
          <div className="qdoc-public-scrim" aria-hidden="true" onClick={reader.toggleRightPanel} />
        )}
        <button type="button" className="qdoc-public-fab" aria-label="開啟目錄" onClick={reader.toggleRightPanel}>
          <BookOpen size={20} aria-hidden="true" />
        </button>

        <section className="qdoc-workbench__stage qdoc-public-viewer__stage" aria-label="公開文件頁面">
          <main className="reader-stage" tabIndex={-1} ref={reader.stageRef}>
            <QDocPublicPage
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

        <aside className="reader-side-nav qdoc-workspace-panel qdoc-public-navigation" aria-label="文件導覽">
          <button type="button" className="qdoc-public-drawer-close" aria-label="關閉目錄" onClick={reader.toggleRightPanel}>
            <X size={16} aria-hidden="true" />
          </button>
          <section className="qdoc-public-identity" aria-label="文件資訊">
            <strong>
              <span className="qdoc-public-title-main">{projectIdentity.name}</span>
              {projectIdentity.subtitle ? <span className="qdoc-public-title-sub">{projectIdentity.subtitle}</span> : null}
            </strong>
            {projectIdentity.label ? <span>{projectIdentity.label}</span> : null}
          </section>
          <div className="qdoc-public-actions" aria-label="文件操作">
            <button
              type="button"
              className="qdoc-public-export-button"
              data-qdoc-public-export
              disabled={!staticPdfHref}
              onClick={handleOpenStaticPdf}
            >
              <ExternalLink aria-hidden="true" />
              {!staticPdfHref ? "PDF 未部署" : "開啟 PDF"}
            </button>
          </div>
          <section id="qdoc-bookmarks" className="qdoc-panel-section qdoc-panel-section--bookmarks" aria-label="章節書籤">
            <nav className="reader-bookmarks" aria-label="章節導覽" data-qdoc-react-bookmarks="true">
              <div className="reader-bookmarks-rail" aria-hidden="true" />
              <QDocBookmarks items={bookmarks} currentPageIndex={reader.currentPageIndex} onSelectPage={selectPublicPage} />
            </nav>
          </section>
          <QDocCurrentPagePanel
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

export function useQDocViewMode() {
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

  const viewMode: QDocViewMode = pagedAllowed ? "paged" : "reading";

  return { viewMode };
}

export function QDocPrintDocument({
  document,
  pages,
  style,
}: {
  document: QDocDocument;
  pages: Array<QDocHtmlPageBlock>;
  style: CSSProperties;
}) {
  const numberedPages = useMemo(() => numberQDocSourceHeadings(pages), [pages]);
  const sourceContainerRef = useRef<HTMLDivElement | null>(null);
  const buildTimePaginated = hasQDocBuildTimePagination(document);
  const paginatedPages = usePaginatedQDocPages(numberedPages, sourceContainerRef, !buildTimePaginated);
  const displayPages: QDocDisplayPage[] = buildTimePaginated ? numberedPages : (paginatedPages ?? numberedPages);
  const paginatedReady = buildTimePaginated || Boolean(paginatedPages);
  const registerPage = () => () => undefined;

  return (
    <main
      className="qdoc-print-document"
      style={style}
      data-qdoc-print-document="true"
      data-qdoc-pagination={paginatedReady ? "ready" : "pending"}
      aria-label={`${document.meta.title} PDF 輸出`}
    >
      <QDocPublicPage
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

function usePaginatedQDocPages(
  pages: Array<QDocHtmlPageBlock>,
  sourceContainerRef: RefObject<HTMLDivElement | null>,
  enabled = true,
) {
  const [paginatedPages, setPaginatedPages] = useState<PaginatedQDocPage[] | null>(null);

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
      await waitForQDocPaginationAssets(sourceContainer);
      await nextAnimationFrame();
      if (cancelled) return;

      const nextPages = paginateQDocSourcePages(sourceContainer, pages);
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

export function numberQDocSourceHeadings(pages: Array<QDocHtmlPageBlock>): Array<QDocHtmlPageBlock> {
  if (typeof document === "undefined") return pages;

  let chapterCounter = 0;
  let sectionCounter = 0;
  let topicCounter = 0;

  return pages.map((page) => {
    if (!page.html.includes("report-page")) return page;

    const template = document.createElement("template");
    template.innerHTML = page.html;

    template.content.querySelectorAll<HTMLElement>(".reader-page.report-page h2, .reader-page.report-page h3, .reader-page.report-page h4").forEach((heading) => {
      if (heading.tagName === "H2") {
        chapterCounter += 1;
        sectionCounter = 0;
        topicCounter = 0;
        ensureQDocHeadingId(heading, `section-${String(chapterCounter).padStart(2, "0")}`);
        heading.dataset.chapter = String(chapterCounter).padStart(2, "0");
        heading.dataset.chapterMarker = `#${chapterCounter}`;
        return;
      }

      if (heading.tagName === "H3") {
        sectionCounter += 1;
        topicCounter = 0;
        ensureQDocHeadingId(heading, `section-${chapterCounter}-${sectionCounter}`);
        heading.dataset.section = `${chapterCounter}.${sectionCounter}`;
        return;
      }

      if (heading.tagName === "H4") {
        topicCounter += 1;
        if (chapterCounter > 0 && sectionCounter > 0) {
          ensureQDocHeadingId(heading, `section-${chapterCounter}-${sectionCounter}-${topicCounter}`);
          heading.dataset.topic = `${chapterCounter}.${sectionCounter}.${topicCounter}`;
        }
      }
    });

    const html = template.innerHTML;
    const anchors = collectQDocElementIds(template.content);
    return html === page.html && anchorsAreEqual(page.anchors, anchors) ? page : { ...page, html, anchors };
  });
}

async function waitForQDocPaginationAssets(scope: HTMLElement) {
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

export function QDocPublicPage({
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
  pages: QDocDisplayPage[];
  currentPageIndex: number;
  devMode: boolean;
  paginatedReady: boolean;
  sourceContainerRef: RefObject<HTMLDivElement | null>;
  registerPage: (pageIndex: number) => RefCallback<HTMLElement>;
  exposeSourceData?: boolean;
  inspector?: QDocPageInspector;
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
    const anchorId = link.dataset.qdocAnchor || safeDecodeAnchor(href.slice(1));
    if (!anchorId) return;

    const pageIndex = Number.parseInt(link.dataset.qdocTargetPageIndex ?? "", 10);
    const handled = onInternalAnchorNavigate(anchorId, Number.isFinite(pageIndex) ? pageIndex : undefined);
    if (handled) event.preventDefault();
  };

  return (
    <div className="reader-pages qdoc-public-page" ref={sourceContainerRef} data-qdoc-public-page="true" onClick={handlePageClick}>
      {pages.map((page) => (
        <div
          key={page.id}
          ref={registerPage(page.pageNumber - 1)}
          id={`page-${String(page.pageNumber).padStart(2, "0")}`}
          className="qdoc-html-page"
          data-qdoc-page-index={page.pageNumber - 1}
          data-qdoc-active={currentPageIndex === page.pageNumber - 1 ? "true" : "false"}
          data-source-path={exposeSourceData ? page.source?.path : undefined}
          data-source-file={exposeSourceData ? page.source?.file : undefined}
        >
          {devMode && !paginatedReady && page.source?.path ? (
            <div className="qdoc-html-page__toolbar">
              <code>{page.source.path}</code>
            </div>
          ) : null}
          <div className="qdoc-html-page__html" dangerouslySetInnerHTML={{ __html: page.html }} />
        </div>
      ))}
    </div>
  );
}

export function createQDocAnchorPageMap(pages: QDocDisplayPage[]) {
  const map = new Map<string, number>();
  pages.forEach((page, index) => {
    page.anchors?.forEach((anchor) => {
      if (anchor && !map.has(anchor)) map.set(anchor, index);
    });
  });
  return map;
}

export function resolveQDocAnchorPageIndex(
  anchorPageMap: Map<string, number>,
  pageCount: number,
  anchorId: string,
  pageIndex?: number,
): number | null {
  if (typeof pageIndex === "number" && Number.isInteger(pageIndex) && pageIndex >= 0 && pageIndex < pageCount) return pageIndex;
  const mapped = anchorPageMap.get(anchorId);
  return mapped === undefined ? null : mapped;
}

function ensureQDocHeadingId(heading: HTMLElement, fallbackId: string) {
  if (heading.id) return;
  heading.id = fallbackId;
}

function collectQDocElementIds(scope: ParentNode) {
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
