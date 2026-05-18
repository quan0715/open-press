import type { RefCallback, RefObject } from "react";
import { QDocPublicPage } from "./publicPage";
import type { QDocDesignSystemInfo } from "./types";
import type { QDocDisplayPage } from "./workbenchTypes";

export function QDocDesignSystemWorkspace({
  designSystem,
  pages,
  currentPageIndex,
  devMode,
  paginatedReady,
  sourceContainerRef,
  registerPage,
}: {
  designSystem: QDocDesignSystemInfo;
  pages: QDocDisplayPage[];
  currentPageIndex: number;
  devMode: boolean;
  paginatedReady: boolean;
  sourceContainerRef: RefObject<HTMLDivElement | null>;
  registerPage: (pageIndex: number) => RefCallback<HTMLElement>;
}) {
  if (!designSystem.previewDocument || pages.length === 0) {
    return (
      <section className="qdoc-design-system-workspace" aria-label="Design System">
        <div className="qdoc-design-empty-state">
          <strong>尚未建立 Design preview document</strong>
          <p>請建立 `{__QDOC_DESIGN_SYSTEM_PATH__}/Design.md` 與 design source files，再重新執行 QDoc export。</p>
        </div>
      </section>
    );
  }

  return (
    <section className="qdoc-design-system-workspace" aria-label="Design System">
      <QDocPublicPage
        pages={pages}
        currentPageIndex={currentPageIndex}
        devMode={devMode}
        paginatedReady={paginatedReady}
        sourceContainerRef={sourceContainerRef}
        registerPage={registerPage}
      />
    </section>
  );
}
