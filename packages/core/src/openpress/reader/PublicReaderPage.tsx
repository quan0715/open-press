import {
  memo,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type Ref,
  type RefCallback,
} from "react";
import { Download } from "lucide-react";
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
  CurrentPagePanel,
  DocumentNavigation,
} from "./ReaderNavigationPanel";
import { useFigureDirectory, useTableDirectory } from "../navigation";
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
import { PageZoomDock, SearchControl } from "../workbench/actions";
import { PublicAttribution } from "./PublicAttribution";
import {
  SHELL_COMPACT_MEDIA_QUERY,
  SHELL_DRAWER_BREAKPOINT,
  WorkbenchShell,
} from "../workbench/shell";
import { useHotkey } from "../hotkeys";
import { cn } from "../core/cn";
import { isLocalWorkspaceHost } from "../shared";
import {
  TOOLBAR_ACTION_CLASS,
  TOOLBAR_ACTION_LABEL_CLASS,
  TOOLBAR_GROUP_CLASS,
} from "../workbench/toolbarClasses";

export const PUBLIC_DRAWER_BREAKPOINT = SHELL_DRAWER_BREAKPOINT;
const PUBLIC_READER_PAGE_SCALE_STORAGE_KEY = "openpress:reader:page-scale-mode";
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
  const bookmarks = useMemo(() => collectBookmarkIndex(displayPages), [displayPages]);
  const figures = useFigureDirectory(document);
  const tables = useTableDirectory(document);
  const hasDirectory = bookmarks.length > 0 || figures.length > 0 || tables.length > 0;
  const anchorPageMap = useMemo(() => createAnchorPageMap(displayPages), [displayPages]);
  const reader = useReaderRuntime({
    pageCount: displayPages.length,
    leftPanelBreakpoint: PUBLIC_DRAWER_BREAKPOINT,
    rightPanelBreakpoint: PUBLIC_DRAWER_BREAKPOINT,
    initialPanelState: {
      leftPanelOpen: hasDirectory && !isPublicDrawerViewport(),
      rightPanelOpen: false,
    },
  });
  const pageViewport = usePageViewportScale({
    stageRef: reader.stageRef,
    pageContainerRef: sourceContainerRef,
    pageCount: displayPages.length,
    scaleModeStorageKey: PUBLIC_READER_PAGE_SCALE_STORAGE_KEY,
  });
  const currentPage = displayPages[reader.currentPageIndex];
  const publicPdfHref = typeof window !== "undefined" && !isLocalWorkspaceHost(window.location.hostname)
    ? deploymentInfo.pdf
    : undefined;
  const projectIdentity = getProjectIdentity(document.meta);
  const pressType = document.meta.type === "slides" ? "slides" : "pages";
  const sourceBlocksByPath = useMemo(
    () => groupSourceBlocksByPath(getSourceBlockMap(document)),
    [document],
  );

  const selectPublicPage = (pageIndex: number, options?: { behavior?: ScrollBehavior }) => {
    reader.setPage(pageIndex, options);
    if (window.innerWidth < PUBLIC_DRAWER_BREAKPOINT && reader.leftPanelOpen) reader.toggleLeftPanel();
  };
  useHotkey("workspace.toggle-bookmarks", reader.toggleLeftPanel);

  const selectPublicAnchor = (anchorId: string, pageIndex?: number) => {
    const targetPageIndex = resolveAnchorPageIndex(anchorPageMap, displayPages.length, anchorId, pageIndex);
    if (targetPageIndex === null) return false;
    selectPublicPage(targetPageIndex, { behavior: "smooth" });
    return true;
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
        {publicPdfHref ? (
          <div className={TOOLBAR_GROUP_CLASS} aria-label="下載">
            <a
              className={TOOLBAR_ACTION_CLASS}
              data-openpress-public-pdf-download
              href={publicPdfHref}
              download
              target="_blank"
              rel="noreferrer"
              title="下載 PDF"
              aria-label="下載 PDF"
            >
              <Download aria-hidden="true" />
              <span className={TOOLBAR_ACTION_LABEL_CLASS}>下載 PDF</span>
            </a>
          </div>
        ) : null}
        <div className={`${TOOLBAR_GROUP_CLASS} ml-auto`} aria-label="閱讀工具">
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
        {hasDirectory ? (
          <section
            id="openpress-bookmarks"
            className={BOOKMARKS_SECTION_CLASS}
            aria-label="文件目錄"
          >
            <nav className={BOOKMARKS_NAV_CLASS} aria-label="文件目錄導覽" data-openpress-react-bookmarks="true">
              <div className={BOOKMARKS_RAIL_CLASS} aria-hidden="true" />
              <DocumentNavigation
                bookmarks={bookmarks}
                figures={figures}
                tables={tables}
                currentPageIndex={reader.currentPageIndex}
                onSelectPage={selectPublicPage}
              />
            </nav>
          </section>
        ) : null}
        <div>
          <CurrentPagePanel
            currentPageLabel={reader.currentPageLabel}
            totalPageLabel={reader.totalPageLabel}
            progressPercent={reader.progressPercent}
            title={currentPage?.title || document.meta.title}
            pageLabelPrefix="頁"
            showHeading={false}
            showTitle={false}
          />
          <PublicAttribution className="mx-[22px] mb-4 border-t border-[var(--op-workspace-border-muted)] pt-3" />
        </div>
      </WorkbenchShell.LeftPanel>

      <WorkbenchShell.MainContent>
        <main className={PUBLIC_READER_STAGE_CLASS} tabIndex={-1} ref={reader.stageRef}>
          <PublicPage
            pages={displayPages}
            currentPageIndex={reader.currentPageIndex}
            sourceContainerRef={sourceContainerRef}
            registerPage={reader.registerPage}
            onInternalAnchorNavigate={selectPublicAnchor}
          />
        </main>
        <PageZoomDock
          placement="floating"
          scaleMode={pageViewport.scaleMode}
          scale={pageViewport.scale}
          scaleLabel={pageViewport.scaleLabel}
          onScaleModeChange={pageViewport.setScaleMode}
        />
      </WorkbenchShell.MainContent>
    </WorkbenchShell>
  );
}

function isPublicDrawerViewport() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(SHELL_COMPACT_MEDIA_QUERY).matches;
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
        printLayout
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
  printLayout = false,
  inspector,
  onInternalAnchorNavigate,
  className,
}: {
  pages: DisplayPage[];
  currentPageIndex: number;
  sourceContainerRef: Ref<HTMLDivElement>;
  registerPage: (pageIndex: number) => RefCallback<HTMLElement>;
  exposeSourceData?: boolean;
  printLayout?: boolean;
  inspector?: PageInspector;
  onInternalAnchorNavigate?: (anchorId: string, pageIndex?: number) => boolean;
  className?: string;
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
      className={cn(printLayout ? "reader-pages openpress-public-page" : PUBLIC_READER_PAGES_CLASS, className)}
      ref={sourceContainerRef}
      data-openpress-public-page="true"
      data-openpress-page-layout="single"
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
          data-openpress-active={currentPageIndex === page.pageNumber - 1 ? "true" : "false"}
          data-source-path={exposeSourceData ? page.source?.path : undefined}
          data-source-file={exposeSourceData ? page.source?.file : undefined}
        >
          <PageHtmlContent html={page.html} className={PUBLIC_HTML_PAGE_HTML_CLASS} />
        </div>
      ))}
    </div>
  );
}

// Memoized by html string: React skips re-rendering (and therefore skips the
// innerHTML assignment) when the page content hasn't changed. This preserves
// any running CSS animations / transitions that live inside the rendered HTML.
export const PageHtmlContent = memo(function PageHtmlContent({
  html,
  className,
}: {
  html: string;
  className: string;
}) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
});

function safeDecodeAnchor(value: string) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
