import { useLayoutEffect, useRef, useState, type CSSProperties, type RefCallback, type RefObject } from "react";
import { BookOpen, ExternalLink, X } from "lucide-react";
import { collectBookmarkIndex } from "./indexes";
import { paginateQDocSourcePages, type PaginatedQDocPage } from "./pagination";
import { getQDocProjectIdentity } from "./projectIdentity";
import { useQDocReaderRuntime } from "./readerRuntime";
import type { QDocDeploymentInfo, QDocDocument, QDocHtmlPageBlock } from "./types";
import { QDocBookmarks, QDocCurrentPagePanel } from "./workbenchPanels";
import type { QDocDisplayPage } from "./workbenchTypes";

export const PUBLIC_DRAWER_BREAKPOINT = 1185;

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
  const paginatedPages = usePaginatedQDocPages(pages, sourceContainerRef);
  const displayPages: QDocDisplayPage[] = paginatedPages ?? pages;
  const bookmarks = collectBookmarkIndex(displayPages);
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
      <div className={appClassName} data-qdoc-react-runtime="true" data-qdoc-pagination={paginatedPages ? "ready" : "pending"}>
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
              paginatedReady={Boolean(paginatedPages)}
              sourceContainerRef={sourceContainerRef}
              registerPage={reader.registerPage}
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
            pageLabelPrefix="頁"
            showHeading={false}
            showTitle={false}
          />
        </aside>
      </div>
    </main>
  );
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
  const sourceContainerRef = useRef<HTMLDivElement | null>(null);
  const paginatedPages = usePaginatedQDocPages(pages, sourceContainerRef);
  const displayPages: QDocDisplayPage[] = paginatedPages ?? pages;
  const registerPage = () => () => undefined;

  return (
    <main
      className="qdoc-print-document"
      style={style}
      data-qdoc-print-document="true"
      data-qdoc-pagination={paginatedPages ? "ready" : "pending"}
      aria-label={`${document.meta.title} PDF 輸出`}
    >
      <QDocPublicPage
        pages={displayPages}
        currentPageIndex={0}
        devMode={false}
        paginatedReady={Boolean(paginatedPages)}
        sourceContainerRef={sourceContainerRef}
        registerPage={registerPage}
      />
    </main>
  );
}

function usePaginatedQDocPages(
  pages: Array<QDocHtmlPageBlock>,
  sourceContainerRef: RefObject<HTMLDivElement | null>,
) {
  const [paginatedPages, setPaginatedPages] = useState<PaginatedQDocPage[] | null>(null);

  useLayoutEffect(() => {
    setPaginatedPages(null);
  }, [pages]);

  useLayoutEffect(() => {
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
  }, [pages, paginatedPages, sourceContainerRef]);

  return paginatedPages;
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
}: {
  pages: QDocDisplayPage[];
  currentPageIndex: number;
  devMode: boolean;
  paginatedReady: boolean;
  sourceContainerRef: RefObject<HTMLDivElement | null>;
  registerPage: (pageIndex: number) => RefCallback<HTMLElement>;
}) {
  return (
    <div className="reader-pages qdoc-public-page" ref={sourceContainerRef} data-qdoc-public-page="true">
      {pages.map((page) => (
        <div
          key={page.id}
          ref={registerPage(page.pageNumber - 1)}
          id={`page-${String(page.pageNumber).padStart(2, "0")}`}
          className="qdoc-html-page"
          data-qdoc-page-index={page.pageNumber - 1}
          data-qdoc-active={currentPageIndex === page.pageNumber - 1 ? "true" : "false"}
          data-source-path={devMode ? page.source?.path : undefined}
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
