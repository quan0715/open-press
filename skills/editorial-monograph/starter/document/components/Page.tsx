import type { PageProps } from "@openpress/core";

export default function Page({
  pageIndex,
  totalPages,
  chapterSlug,
  chapterTone,
  children,
}: PageProps) {
  return (
    <section
      className="reader-page reader-page--report"
      data-page-kind="report"
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
