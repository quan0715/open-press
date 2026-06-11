// @open-press/core/manuscript — long-form section-flow helpers.
//
// Manuscript helpers cover the "paper / report / book / monograph" pattern:
// a source resolves into a sequence of sections, each section becomes one
// content frame (with overflow auto-cloning across pages), and a TOC frame
// summarizes the outline.
//
// These helpers are conventions only. Core never knows about them. Any
// document type that wants section flow imports from here; documents that
// do not (slides, folios, calendars) skip this module entirely.

import { Fragment, useContext, type ComponentType, type ReactNode } from "react";
import { Frame, FrameContext, MdxArea, PressContext, useSource } from "../core";
import type { MdxAreaOverflow, ResolvedSource } from "../core";
import { createMdxAreaObjectEntityId } from "../document-model/objectEntityModel";

const PAGE_FRAME_CLASS = [
  "page-frame grid h-full min-h-[inherit] w-full",
  "grid-rows-[var(--page-header-height)_minmax(0,1fr)_var(--page-footer-height)]",
  "gap-y-[var(--page-frame-gap)] bg-[var(--openpress-color-document)]",
  "px-[var(--page-margin-x)] pb-[var(--page-margin-bottom)] pt-[var(--page-margin-top)]",
].join(" ");
const TOC_PAGE_FRAME_CLASS = [
  "page-frame grid h-full min-h-[inherit] w-full",
  "[grid-template-rows:auto_minmax(0,1fr)]",
  "gap-y-[var(--page-frame-gap)] bg-[var(--openpress-color-document)]",
  "px-[var(--page-margin-x)] pb-[var(--page-margin-bottom)] pt-[var(--page-margin-top)]",
].join(" ");
const PAGE_HEADER_CLASS = [
  "page-header pointer-events-none flex min-w-0 items-start overflow-hidden",
  "text-[clamp(7pt,1.2cqw,8pt)] tracking-[0.1em] text-[var(--openpress-color-muted)] opacity-[0.62]",
].join(" ");
const TOC_HEADER_CLASS = [
  "page-header toc-header pointer-events-none block min-w-0 overflow-visible",
  "text-[clamp(7pt,1.2cqw,8pt)] tracking-[0.1em] text-[var(--openpress-color-muted)] opacity-100",
].join(" ");
const PAGE_BODY_CLASS = "page-body min-h-0 min-w-0 overflow-visible";
const MDX_PROSE_CLASS = [
  "openpress-prose h-full min-h-0 min-w-0 text-[var(--openpress-color-ink)]",
  "[font-family:var(--openpress-font-body)] text-[clamp(4.2pt,1.85cqw,10.5pt)] leading-[1.85]",
  "[&_h2]:m-0 [&_h2]:mb-[var(--openpress-space-4)] [&_h2]:break-after-avoid",
  "[&_h2]:[font-family:var(--openpress-font-serif)] [&_h2]:text-[clamp(5.7pt,3.4cqw,17pt)] [&_h2]:font-light [&_h2]:leading-[1.45] [&_h2]:tracking-[0.04em]",
  "[&_h3]:mb-[var(--openpress-space-2)] [&_h3]:mt-[var(--openpress-space-3)] [&_h3]:break-after-avoid",
  "[&_h3]:[font-family:var(--openpress-font-serif)] [&_h3]:text-[clamp(4.8pt,2.4cqw,13pt)] [&_h3]:font-normal [&_h3]:leading-[1.55] [&_h3]:tracking-[0.03em]",
  "[&_h4]:mb-[var(--openpress-space-1)] [&_h4]:mt-[var(--openpress-space-3)] [&_h4]:break-after-avoid",
  "[&_h4]:text-[clamp(4.4pt,1.9cqw,11pt)] [&_h4]:font-medium [&_h4]:tracking-[0.04em] [&_h4]:text-[var(--openpress-color-muted)]",
  "[&_p]:m-0 [&_p]:mb-[var(--openpress-space-2)]",
  "[&_strong]:font-semibold [&_strong]:text-[var(--openpress-color-ink)]",
  "[&_em]:[font-family:var(--openpress-font-serif)] [&_em]:italic [&_em]:text-[var(--openpress-color-ink)]",
  "[&_a]:text-[var(--openpress-color-ink)] [&_a]:underline [&_a]:decoration-dotted [&_a]:underline-offset-2",
  "[&_figcaption]:mt-[2mm] [&_figcaption]:text-center [&_figcaption]:text-[clamp(3.8pt,1.45cqw,8.5pt)] [&_figcaption]:leading-[1.5] [&_figcaption]:tracking-[0.02em] [&_figcaption]:text-[var(--openpress-color-muted)]",
  "[&_figure]:my-[var(--openpress-space-4)] [&_figure]:break-inside-avoid",
  "[&_figure_img]:mx-auto [&_figure_img]:block [&_figure_img]:max-h-[135mm] [&_figure_img]:max-w-full [&_figure_img]:border [&_figure_img]:border-[var(--openpress-color-line)] [&_figure_img]:bg-white [&_figure_img]:p-[6px]",
  "[&_ol]:mb-[var(--openpress-space-3)] [&_ol]:pl-[7mm] [&_ol]:leading-[1.85]",
  "[&_ul]:mb-[var(--openpress-space-3)] [&_ul]:pl-[7mm] [&_ul]:leading-[1.85]",
  "[&_li]:mb-[1.4mm] [&_li]:pl-[1mm]",
  "[&_table]:my-[var(--openpress-space-3)] [&_table]:w-full [&_table]:break-inside-avoid [&_table]:border-collapse [&_table]:border-t [&_table]:border-[var(--openpress-color-ink)] [&_table]:text-[clamp(3.5pt,1.55cqw,9pt)] [&_table]:leading-[var(--openpress-leading-table)]",
  "[&_thead]:table-header-group",
  "[&_th]:whitespace-nowrap [&_th]:border-b [&_th]:border-[var(--openpress-color-ink)] [&_th]:px-[2.4mm] [&_th]:py-[3.4mm] [&_th]:text-left [&_th]:font-medium [&_th]:tracking-[0.02em]",
  "[&_td]:border-b [&_td]:border-[var(--openpress-color-line)] [&_td]:px-[2.4mm] [&_td]:py-[3.4mm] [&_td]:align-top [&_td]:[overflow-wrap:anywhere]",
].join(" ");
const PAGE_FOOTER_CLASS = [
  "page-footer pointer-events-none flex min-w-0 items-baseline justify-between gap-3 overflow-hidden",
  "text-[clamp(7pt,1.25cqw,8pt)] tracking-[0.1em] text-[var(--openpress-color-muted)] opacity-70",
].join(" ");
const FOOTER_LEFT_CLASS = "footer-left min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap";
const FOOTER_RIGHT_CLASS = "footer-right shrink-0 tracking-[0.14em] [font-variant-numeric:tabular-nums]";
const TOC_HEADING_CLASS = [
  "toc-heading !m-0 !border-b-0 !p-0 !pb-0",
  "[font-family:var(--openpress-font-serif)] !text-[clamp(15pt,3.6cqw,18pt)] !font-light !tracking-[0.12em]",
].join(" ");
const TOC_HEADING_CONTINUATION_CLASS = `${TOC_HEADING_CLASS} toc-heading--continuation hidden`;
const TOC_AREA_CLASS = "openpress-mdx-area openpress-toc-area h-full";
const TOC_LIST_CLASS = [
  "toc-list m-0 flex list-none flex-col gap-[0.45mm] p-0 pt-[8mm]",
  "[&_a]:grid [&_a]:grid-cols-[10mm_1fr_14mm] [&_a]:items-baseline [&_a]:gap-[4mm]",
].join(" ");

// ---------------------------------------------------------------------------
// <Sections>
// ---------------------------------------------------------------------------

export interface SectionsPageProps {
  frameKey: string;
  chainId: string;
  pageIndex: number;
  totalPages: number;
  sectionSlug: string;
  sectionTitle: string;
  sectionTone?: string;
  sectionMeta: Record<string, unknown>;
}

export interface SectionsOpenerProps {
  frameKey: string;
  sectionSlug: string;
  sectionTitle: string;
  sectionIndex: number;
  sectionMeta: Record<string, unknown>;
}

export interface SectionsProps {
  source: string;
  page?: ComponentType<SectionsPageProps>;
  opener?: ComponentType<SectionsOpenerProps>;
}

export function Sections({ source: sourceId, page: Page = DefaultSectionPage, opener: Opener }: SectionsProps) {
  const source = useSource(sourceId);
  const press = useContext(PressContext);
  const hints = press?.hints ?? null;
  return (
    <Fragment>
      {source.tree.map((section, index) => {
        const chainId = `${sourceId}:${section.slug}`;
        const meta = (section.meta ?? {}) as Record<string, unknown>;
        const tone = typeof meta.tone === "string" ? meta.tone : undefined;
        const totalPages = Math.max(1, hints?.totalPagesPerChain?.[chainId] ?? 1);
        const pages: ReactNode[] = [];
        for (let i = 0; i < totalPages; i++) {
          pages.push(
            <Page
              key={i}
              frameKey={`${sourceId}:${section.slug}:content:${i}`}
              chainId={chainId}
              pageIndex={i}
              totalPages={totalPages}
              sectionSlug={section.slug}
              sectionTitle={section.title}
              sectionTone={tone}
              sectionMeta={meta}
            />,
          );
        }
        return (
          <Fragment key={section.slug}>
            {Opener ? (
              <Opener
                frameKey={`${sourceId}:${section.slug}:opener`}
                sectionSlug={section.slug}
                sectionTitle={section.title}
                sectionIndex={index}
                sectionMeta={meta}
              />
            ) : null}
            {pages}
          </Fragment>
        );
      })}
    </Fragment>
  );
}

// Compatibility alias for chapter vocabulary.
export const Chapters = Sections;
export type ChaptersProps = SectionsProps;

export function DefaultSectionPage({
  frameKey,
  chainId,
  pageIndex,
  totalPages,
  sectionSlug,
  sectionTitle,
  sectionTone,
}: SectionsPageProps) {
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
      <div className={PAGE_FRAME_CLASS}>
        <header className={PAGE_HEADER_CLASS} aria-hidden="true" />
        <main className={PAGE_BODY_CLASS}>
          <MdxArea chainId={chainId} className={MDX_PROSE_CLASS} />
        </main>
        <footer className={PAGE_FOOTER_CLASS} aria-hidden="true">
          <span className={FOOTER_LEFT_CLASS}>{sectionTitle}</span>
          <span className={FOOTER_RIGHT_CLASS}>
            {totalPages > 1 ? `${pageIndex + 1}/${totalPages}` : pageIndex + 1}
          </span>
        </footer>
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// <Toc>
// ---------------------------------------------------------------------------

export interface TocProps {
  source: string;
  className?: string;
  heading?: ReactNode;
  frameKey?: string;
  maxLevel?: 2 | 3;
  overflow?: MdxAreaOverflow;
  page?: React.ComponentType<TocPageProps>;
}

export interface TocPageProps {
  frameKey: string;
  chainId: string;
  pageIndex: number;
  totalPages: number;
  sourceId: string;
  heading?: ReactNode;
  className?: string;
  maxLevel?: 2 | 3;
  overflow?: MdxAreaOverflow;
}

export interface TocAreaProps {
  chainId: string;
  maxLevel?: 2 | 3;
  overflow?: MdxAreaOverflow;
  className?: string;
}

export function Toc({ source: sourceId, className, heading, frameKey = "toc", maxLevel = 3, overflow = "extend", page: Page = DefaultTocPage }: TocProps) {
  useSource(sourceId) as ResolvedSource;
  const press = useContext(PressContext);
  const chainId = maxLevel <= 2 ? `toc:${sourceId}:h2` : `toc:${sourceId}`;
  const totalPages = Math.max(1, press?.hints?.totalPagesPerChain?.[chainId] ?? 1);
  const pages: ReactNode[] = [];
  for (let i = 0; i < totalPages; i++) {
    pages.push(
      <Page
        key={i}
        frameKey={i === 0 ? frameKey : `${frameKey}:page:${i}`}
        chainId={chainId}
        pageIndex={i}
        totalPages={totalPages}
        sourceId={sourceId}
        heading={heading}
        className={className}
        maxLevel={maxLevel}
        overflow={overflow}
      />,
    );
  }
  return <Fragment>{pages}</Fragment>;
}

function DefaultTocPage({ frameKey, chainId, pageIndex, totalPages, heading, className, maxLevel, overflow }: TocPageProps) {
  const isContinuation = pageIndex > 0;
  const tocClassName = ["reader-page--toc", isContinuation ? "toc-continuation" : null, className].filter(Boolean).join(" ") || undefined;
  return (
    <Frame
      frameKey={frameKey}
      role="manuscript.toc"
      chrome={false}
      className={tocClassName}
    >
      <div className={TOC_PAGE_FRAME_CLASS}>
        <header className={TOC_HEADER_CLASS}>
          {heading ?? (
            <h2 className={isContinuation ? TOC_HEADING_CONTINUATION_CLASS : TOC_HEADING_CLASS} id={isContinuation ? `${frameKey}-title` : "toc-title"}>
              {isContinuation ? "目錄續" : "目錄"}
            </h2>
          )}
        </header>
        <main className={PAGE_BODY_CLASS}>
          <TocArea
            chainId={chainId}
            className={isContinuation ? "pt-[3mm]" : undefined}
            maxLevel={maxLevel}
            overflow={overflow}
          />
        </main>
      </div>
    </Frame>
  );
}

export function TocArea({ chainId, maxLevel, overflow = "extend", className }: TocAreaProps) {
  const frame = useContext(FrameContext);
  const consumed = frame?.consumeArea(chainId) ?? null;
  const blocks = consumed?.blocks ?? null;
  const objectId = frame && consumed
    ? createMdxAreaObjectEntityId(frame.frameKey, chainId, consumed.indexInFrame)
    : undefined;
  return (
    <div
      className={TOC_AREA_CLASS}
      data-openpress-mdx-area="true"
      data-openpress-mdx-area-chain={chainId}
      data-openpress-mdx-area-index={consumed?.indexInFrame}
      data-openpress-object-id={objectId}
      data-openpress-toc-max-level={maxLevel}
      data-openpress-mdx-area-overflow={overflow}
      data-openpress-mdx-area-empty={blocks == null ? "true" : "false"}
    >
      <ol className={[TOC_LIST_CLASS, className].filter(Boolean).join(" ") || undefined}>
        {blocks}
      </ol>
    </div>
  );
}
