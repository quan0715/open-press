import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type RefCallback,
  type RefObject,
} from "react";
import { ExternalLink, Ruler } from "lucide-react";
import {
  collectBookmarkIndex,
  createAnchorPageMap,
  createPageObjectEntityId,
  getProjectIdentity,
  getSourceBlockMap,
  resolveAnchorPageIndex,
  type DeploymentInfo,
  type HtmlPageBlock,
  type ReaderDocument,
} from "../document-model";
import type { InspectorState } from "../workbench/inspector";
import { groupSourceBlocksByPath } from "../workbench/inspector";
import { useReaderRuntime } from "./useReaderRuntime";
import {
  BOOKMARKS_NAV_CLASS,
  BOOKMARKS_RAIL_CLASS,
  BOOKMARKS_SECTION_CLASS,
  Bookmarks,
  CurrentPagePanel,
} from "./ReaderNavigationPanel";
import {
  PUBLIC_HTML_PAGE_CLASS,
  PUBLIC_HTML_PAGE_HTML_CLASS,
  PUBLIC_IDENTITY_CLASS,
  PUBLIC_IDENTITY_TITLE_CLASS,
  PUBLIC_READER_PAGES_CLASS,
  PUBLIC_READER_STAGE_CLASS,
  PUBLIC_TITLE_MAIN_CLASS,
  PUBLIC_TITLE_SUB_CLASS,
} from "./publicViewerClasses";
import type { DisplayPage } from "./readerTypes";
import { usePageViewportScale } from "./usePageViewportScale";
import type { PageLayoutMode } from "./pageViewportScaleModel";
import { PageZoomControl, SearchControl, type SearchControlSearcher } from "../workbench/actions";
import { WorkbenchShell } from "../workbench/shell";
import {
  PAGE_GEOMETRY_CLASS,
  PAGE_GEOMETRY_DIMENSIONS_CLASS,
  PAGE_GEOMETRY_LABEL_CLASS,
  TOOLBAR_ACTION_CLASS,
  TOOLBAR_ACTION_LABEL_CLASS,
  TOOLBAR_GROUP_CLASS,
  TOOLBAR_PAGE_GROUP_CLASS,
} from "../workbench/toolbarClasses";
import { formatPageGeometrySpec } from "../workbench/workbenchFormatters";
import { searchCorpus, type SearchCorpus } from "../shared";

export const PUBLIC_DRAWER_BREAKPOINT = 1440;
export type ViewMode = "paged";
export type PageInspector = Pick<InspectorState, "enabled" | "handleClick">;

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
  const displayPages = pages;
  const { viewMode } = useViewMode();
  const bookmarks = collectBookmarkIndex(displayPages);
  const anchorPageMap = useMemo(() => createAnchorPageMap(displayPages), [displayPages]);
  const reader = useReaderRuntime({
    pageCount: displayPages.length,
    leftPanelBreakpoint: PUBLIC_DRAWER_BREAKPOINT,
    rightPanelBreakpoint: PUBLIC_DRAWER_BREAKPOINT,
  });
  const [pageLayoutMode, setPageLayoutMode] = useState<PageLayoutMode>("single");
  const pageViewport = usePageViewportScale({
    stageRef: reader.stageRef,
    pageContainerRef: sourceContainerRef,
    pageCount: displayPages.length,
    layoutMode: pageLayoutMode,
  });
  const currentPage = displayPages[reader.currentPageIndex];
  const staticPdfHref = deploymentInfo.pdf;
  const projectIdentity = getProjectIdentity(document.meta);
  const pressType = document.meta.type === "slides" ? "slides" : "pages";
  const pageGeometry = formatPageGeometrySpec(document.theme);
  const sourceBlocksByPath = useMemo(
    () => groupSourceBlocksByPath(getSourceBlockMap(document)),
    [document],
  );

  // Static searcher: lazy-fetch /openpress/search-corpus.json on first
  // query, cache for subsequent searches, then run the same literal-match
  // logic the dev endpoint uses — no backend required for deployed pages.
  const corpusRef = useRef<SearchCorpus | null>(null);
  const corpusFetchRef = useRef<Promise<SearchCorpus> | null>(null);
  const staticSearcher = useCallback<SearchControlSearcher>(async ({ query, scope, signal }) => {
    if (!corpusRef.current) {
      if (!corpusFetchRef.current) {
        corpusFetchRef.current = fetch("/openpress/search-corpus.json", { cache: "force-cache" })
          .then(async (response) => {
            if (!response.ok) throw new Error(`Failed to load search corpus (${response.status})`);
            return (await response.json()) as SearchCorpus;
          })
          .catch((error) => {
            corpusFetchRef.current = null;
            throw error;
          });
      }
      const corpus = await corpusFetchRef.current;
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      corpusRef.current = corpus;
    }
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    return searchCorpus(corpusRef.current, { query, scope, caseSensitive: false });
  }, []);

  const selectPublicPage = (pageIndex: number, options?: { behavior?: ScrollBehavior }) => {
    reader.setPage(pageIndex, options);
    if (window.innerWidth < PUBLIC_DRAWER_BREAKPOINT && reader.leftPanelOpen) reader.toggleLeftPanel();
  };

  const selectPublicAnchor = (anchorId: string, pageIndex?: number) => {
    const targetPageIndex = resolveAnchorPageIndex(anchorPageMap, displayPages.length, anchorId, pageIndex);
    if (targetPageIndex === null) return false;
    selectPublicPage(targetPageIndex, { behavior: "smooth" });
    return true;
  };

  const handleOpenStaticPdf = () => {
    if (!staticPdfHref) return;
    window.open(staticPdfHref, "_blank", "noopener,noreferrer");
  };

  return (
    <WorkbenchShell
      style={style}
      viewMode={viewMode}
      pressType={pressType}
      inspectorMode={false}
      leftPanelOpen={reader.leftPanelOpen}
      rightPanelOpen={false}
      onToggleLeftPanel={reader.toggleLeftPanel}
      onToggleRightPanel={reader.toggleLeftPanel}
      withRightPanel={false}
      publicViewer
    >
      <WorkbenchShell.Toolbar>
        <div className={TOOLBAR_GROUP_CLASS} aria-label="輸出">
          <button
            type="button"
            className={TOOLBAR_ACTION_CLASS}
            data-openpress-public-export
            disabled={!staticPdfHref}
            onClick={handleOpenStaticPdf}
            title={staticPdfHref ? "開啟 PDF" : "PDF 未部署"}
            aria-label={staticPdfHref ? "開啟 PDF" : "PDF 未部署"}
          >
            <ExternalLink aria-hidden="true" />
            <span className={TOOLBAR_ACTION_LABEL_CLASS}>
              {staticPdfHref ? "開啟 PDF" : "PDF 未部署"}
            </span>
          </button>
        </div>
        <div className={TOOLBAR_PAGE_GROUP_CLASS} aria-label="頁面規格">
          <button
            type="button"
            className={PAGE_GEOMETRY_CLASS}
            data-openpress-page-geometry
            title={pageGeometry.title}
            aria-label={`頁面規格 ${pageGeometry.title}`}
          >
            <Ruler aria-hidden="true" />
            <span className={PAGE_GEOMETRY_LABEL_CLASS}>{pageGeometry.label}</span>
            <span className={PAGE_GEOMETRY_DIMENSIONS_CLASS}>{pageGeometry.dimensions}</span>
          </button>
          <PageZoomControl
            scaleMode={pageViewport.scaleMode}
            scaleLabel={pageViewport.scaleLabel}
            pageLayoutMode={pageLayoutMode}
            onScaleModeChange={pageViewport.setScaleMode}
            onPageLayoutModeChange={setPageLayoutMode}
          />
          <SearchControl
            pages={displayPages}
            sourceBlocksByPath={sourceBlocksByPath}
            onSelectPage={selectPublicPage}
          />
        </div>
      </WorkbenchShell.Toolbar>

      <WorkbenchShell.LeftPanel>
        <section className={PUBLIC_IDENTITY_CLASS} aria-label="文件資訊">
          <strong className={PUBLIC_IDENTITY_TITLE_CLASS}>
            <span className={PUBLIC_TITLE_MAIN_CLASS}>{projectIdentity.name}</span>
            {projectIdentity.subtitle ? <span className={PUBLIC_TITLE_SUB_CLASS}>{projectIdentity.subtitle}</span> : null}
          </strong>
          {projectIdentity.label ? <span>{projectIdentity.label}</span> : null}
        </section>
        {bookmarks.length > 0 ? (
          <section
            id="openpress-bookmarks"
            className={BOOKMARKS_SECTION_CLASS}
            aria-label="章節書籤"
          >
            <nav className={BOOKMARKS_NAV_CLASS} aria-label="章節導覽" data-openpress-react-bookmarks="true">
              <div className={BOOKMARKS_RAIL_CLASS} aria-hidden="true" />
              <Bookmarks items={bookmarks} currentPageIndex={reader.currentPageIndex} onSelectPage={selectPublicPage} />
            </nav>
          </section>
        ) : null}
        <CurrentPagePanel
          currentPageLabel={reader.currentPageLabel}
          totalPageLabel={reader.totalPageLabel}
          progressPercent={reader.progressPercent}
          title={currentPage?.title || document.meta.title}
          pageLabelPrefix="頁"
          showHeading={false}
          showTitle={false}
        />
      </WorkbenchShell.LeftPanel>

      <WorkbenchShell.MainContent>
        <main className={PUBLIC_READER_STAGE_CLASS} tabIndex={-1} ref={reader.stageRef}>
          <PublicPage
            pages={displayPages}
            currentPageIndex={reader.currentPageIndex}
            sourceContainerRef={sourceContainerRef}
            registerPage={reader.registerPage}
            onInternalAnchorNavigate={selectPublicAnchor}
            pageLayoutMode={pageLayoutMode}
          />
        </main>
      </WorkbenchShell.MainContent>
    </WorkbenchShell>
  );
}

export function useViewMode(): { viewMode: ViewMode } {
  return { viewMode: "paged" };
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
  const sourceContainerRef = useRef<HTMLDivElement | null>(null);
  const displayPages = pages;
  const registerPage = () => () => undefined;

  // Mirror the per-document page geometry vars onto :root so the @page
  // rule in print-route.css can resolve them. CSS custom properties set
  // on <main> never reach @page in any browser; without this, headless
  // Chrome falls back to the workspace theme default (210mm × 297mm A4)
  // and slide/social/landscape presses print onto the wrong paper.
  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return undefined;
    const root = window.document.documentElement;
    const overrides: Array<[string, string]> = [];
    for (const [key, value] of Object.entries(style)) {
      if (typeof key === "string" && key.startsWith("--") && typeof value === "string") {
        overrides.push([key, value]);
      }
    }
    const previous = overrides.map(([key]) => [key, root.style.getPropertyValue(key)] as const);
    overrides.forEach(([key, value]) => root.style.setProperty(key, value));
    return () => {
      previous.forEach(([key, value]) => {
        if (value) root.style.setProperty(key, value);
        else root.style.removeProperty(key);
      });
    };
  }, [style]);

  return (
    <main
      className="openpress-print-document"
      style={style}
      data-openpress-print-document="true"
      aria-label={`${document.meta.title} PDF 輸出`}
    >
      <PublicPage
        pages={displayPages}
        currentPageIndex={0}
        sourceContainerRef={sourceContainerRef}
        registerPage={registerPage}
        exposeSourceData
      />
    </main>
  );
}

export function PublicPage({
  pages,
  currentPageIndex,
  sourceContainerRef,
  registerPage,
  exposeSourceData = false,
  inspector,
  onInternalAnchorNavigate,
  pageLayoutMode = "single",
}: {
  pages: DisplayPage[];
  currentPageIndex: number;
  sourceContainerRef: RefObject<HTMLDivElement | null>;
  registerPage: (pageIndex: number) => RefCallback<HTMLElement>;
  exposeSourceData?: boolean;
  inspector?: PageInspector;
  onInternalAnchorNavigate?: (anchorId: string, pageIndex?: number) => boolean;
  pageLayoutMode?: PageLayoutMode;
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
      className={PUBLIC_READER_PAGES_CLASS}
      ref={sourceContainerRef}
      data-openpress-public-page="true"
      data-openpress-page-layout={pageLayoutMode}
      onClick={handlePageClick}
    >
      {pages.map((page) => (
        <div
          key={page.id}
          ref={registerPage(page.pageNumber - 1)}
          id={`page-${String(page.pageNumber).padStart(2, "0")}`}
          className={PUBLIC_HTML_PAGE_CLASS}
          data-openpress-object-id={page.frameKey ? createPageObjectEntityId(page.frameKey) : undefined}
          data-openpress-page-index={page.pageNumber - 1}
          data-openpress-page-spread-side={pageLayoutMode === "spread" ? ((page.pageNumber - 1) % 2 === 0 ? "left" : "right") : undefined}
          data-openpress-active={currentPageIndex === page.pageNumber - 1 ? "true" : "false"}
          data-source-path={exposeSourceData ? page.source?.path : undefined}
          data-source-file={exposeSourceData ? page.source?.file : undefined}
        >
          <div className={PUBLIC_HTML_PAGE_HTML_CLASS} dangerouslySetInnerHTML={{ __html: page.html }} />
        </div>
      ))}
    </div>
  );
}

function safeDecodeAnchor(value: string) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
