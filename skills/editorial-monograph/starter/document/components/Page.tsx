import type { PageProps } from "@qdoc/core";

export default function Page({
  pageIndex,
  totalPages,
  chapterSlug,
  chapterTone,
  children,
}: PageProps) {
  return (
    <section
      className="reader-page report-page"
      data-page-kind="chapter"
      data-page-footer="true"
      data-page-index={pageIndex}
      data-total-pages={totalPages}
      data-chapter-slug={chapterSlug}
      data-chapter-tone={chapterTone}
    >
      <div className="page-frame">
        <header className="page-header" aria-hidden="true" />
        <main className="page-body">{children}</main>
        <footer className="page-footer" aria-hidden="true" />
      </div>
    </section>
  );
}
