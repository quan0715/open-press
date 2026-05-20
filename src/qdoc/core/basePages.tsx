import type {
  BaseCalloutProps,
  BaseFigureProps,
  BasePageProps,
  BaseReportPageProps,
  BaseShellPageProps,
} from "./types";

function classNames(...values: Array<string | undefined>) {
  const joined = values.filter(Boolean).join(" ");
  return joined.length > 0 ? joined : undefined;
}

export function BasePage({ kind, footer = true, className, children, ...sectionProps }: BasePageProps) {
  return (
    <section
      {...sectionProps}
      className={classNames("reader-page", `reader-page--${kind}`, className)}
      data-page-footer={footer ? "true" : "false"}
      data-page-kind={kind}
    >
      {children}
    </section>
  );
}

export function BaseCoverPage(props: BaseShellPageProps) {
  return <BasePage {...props} footer={false} kind="cover" />;
}

export function BaseTocPage(props: BaseShellPageProps) {
  return <BasePage {...props} footer={false} kind="toc" />;
}

export function BaseReportPage({
  pageIndex,
  totalPages,
  chapterSlug,
  chapterTone,
  runningHeader,
  footerLeft,
  footerRight,
  children,
  ...sectionProps
}: BaseReportPageProps) {
  return (
    <BasePage
      {...sectionProps}
      data-chapter-slug={chapterSlug}
      data-chapter-tone={chapterTone}
      data-page-index={pageIndex}
      data-total-pages={totalPages}
      footer
      kind="report"
    >
      {runningHeader === undefined ? null : <header data-page-running-header>{runningHeader}</header>}
      {children}
      {footerLeft === undefined && footerRight === undefined ? null : (
        <footer data-page-footer-content>
          {footerLeft === undefined ? null : <span data-page-footer-left>{footerLeft}</span>}
          {footerRight === undefined ? null : <span data-page-footer-right>{footerRight}</span>}
        </footer>
      )}
    </BasePage>
  );
}

export function BaseBackCoverPage(props: BaseShellPageProps) {
  return <BasePage {...props} footer={false} kind="back-cover" />;
}

export function BaseFigure({ caption, className, children, ...figureProps }: BaseFigureProps) {
  return (
    <figure {...figureProps} className={classNames("qdoc-figure", className)}>
      <div data-figure-body>{children}</div>
      {caption === undefined ? null : <figcaption>{caption}</figcaption>}
    </figure>
  );
}

export function BaseCallout({ kind = "info", className, children, ...calloutProps }: BaseCalloutProps) {
  return (
    <aside {...calloutProps} className={classNames("qdoc-callout", className)} data-callout-kind={kind}>
      {children}
    </aside>
  );
}
