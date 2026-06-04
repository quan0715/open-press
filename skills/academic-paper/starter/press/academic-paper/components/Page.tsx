import { Frame, MdxArea } from "@open-press/core";
import type { SectionsPageProps } from "@open-press/core/manuscript";

export default function Page({
  frameKey,
  chainId,
  pageIndex,
  totalPages,
  sectionSlug,
  sectionTitle,
  sectionTone,
}: SectionsPageProps) {
  const runningHeader =
    "This is a non-peer reviewed Express letter submitted to J SEDI";
  const runningRight = "Your short title goes here";

  return (
    <Frame
      frameKey={frameKey}
      role="manuscript.content"
      className="reader-page--content"
      data-page-index={pageIndex}
      data-total-pages={totalPages}
      data-section-id={sectionSlug}
      data-chapter-tone={sectionTone}
    >
      <div className="page-frame">
        <header className="page-header" aria-hidden="true">
          <span className="running-head-left">{runningHeader}</span>
          <span className="running-head-right">{runningRight}</span>
        </header>
        <main className="page-body">
          <MdxArea chainId={chainId} overflow="extend" />
        </main>
        <footer className="page-footer" aria-hidden="true">
          <span className="footer-left">{sectionTitle}</span>
          <span className="footer-right">
            {totalPages > 1 ? `${pageIndex + 1}/${totalPages}` : pageIndex + 1}
          </span>
        </footer>
      </div>
    </Frame>
  );
}
