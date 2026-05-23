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

import { Fragment, useContext, type ReactNode } from "react";
import { Frame, FrameContext, PressContext, useSource } from "../core";
import type { MdxAreaOverflow, ResolvedSource } from "../core";

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
  page: React.ComponentType<SectionsPageProps>;
  opener?: React.ComponentType<SectionsOpenerProps>;
}

export function Sections({ source: sourceId, page: Page, opener: Opener }: SectionsProps) {
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

// ---------------------------------------------------------------------------
// <Toc>
// ---------------------------------------------------------------------------

export interface TocProps {
  source: string;
  className?: string;
  heading?: ReactNode;
  frameKey?: string;
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
  overflow?: MdxAreaOverflow;
}

export interface TocAreaProps {
  chainId: string;
  overflow?: MdxAreaOverflow;
  className?: string;
}

export function Toc({ source: sourceId, className, heading, frameKey = "toc", overflow = "extend", page: Page = DefaultTocPage }: TocProps) {
  useSource(sourceId) as ResolvedSource;
  const press = useContext(PressContext);
  const chainId = `toc:${sourceId}`;
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
        overflow={overflow}
      />,
    );
  }
  return <Fragment>{pages}</Fragment>;
}

function DefaultTocPage({ frameKey, chainId, pageIndex, totalPages, heading, className, overflow }: TocPageProps) {
  return (
    <Frame
      frameKey={frameKey}
      role="manuscript.toc"
      chrome={false}
      className={["reader-page--toc", className].filter(Boolean).join(" ") || undefined}
    >
      <div className="page-frame">
        <main className="page-body">
          {heading ?? <h2 className="toc-heading" id={pageIndex === 0 ? "toc-title" : `${frameKey}-title`}>{pageIndex === 0 ? "目錄" : "目錄續"}</h2>}
          <TocArea chainId={chainId} overflow={overflow} />
        </main>
      </div>
    </Frame>
  );
}

export function TocArea({ chainId, overflow = "extend", className }: TocAreaProps) {
  const frame = useContext(FrameContext);
  const blocks = frame?.consumeArea(chainId) ?? null;
  return (
    <ol
      className={["toc-list", className].filter(Boolean).join(" ") || undefined}
      data-openpress-mdx-area="true"
      data-openpress-mdx-area-chain={chainId}
      data-openpress-mdx-area-overflow={overflow}
      data-openpress-mdx-area-empty={blocks == null ? "true" : undefined}
    >
      {blocks}
    </ol>
  );
}
