import { PageFolio, Slide } from "@open-press/core";
import type { ReactNode } from "react";

export type DeckSlideVariant = "cover" | "agenda" | "content" | "process" | "closing";

const SLIDE_PAGE_CLASS = [
  "op-slide-page bg-bg text-text [font-family:var(--font-body)]",
  "[--font-heading:var(--openpress-font-serif)] [--font-body:var(--openpress-font-body)]",
  "[--color-bg:var(--openpress-color-document)] [--color-surface:var(--openpress-color-document)]",
  "[--color-surface-muted:var(--openpress-color-soft-line)] [--color-surface-inverse:var(--openpress-color-ink)]",
  "[--color-text:var(--openpress-color-ink)] [--color-text-muted:var(--openpress-color-muted)]",
  "[--color-text-subtle:var(--openpress-color-muted)] [--color-text-inverse:var(--openpress-color-document)]",
  "[--color-accent:var(--openpress-chart-coral-deep)] [--color-accent-muted:var(--openpress-chart-gold-bg)]",
  "[--color-border:var(--openpress-color-line)] [--color-border-strong:var(--openpress-color-ink)]",
].join(" ");
const SLIDE_SHELL_CLASS = "op-slide-shell relative h-full w-full overflow-hidden bg-bg";
const CHROME_HEADER_CLASS =
  "op-slide-chrome-header absolute left-op-sm right-op-sm top-0 z-10 grid h-[72px] items-center border-b border-border bg-bg/95 text-op-caption text-text-muted [grid-template-columns:minmax(0,1fr)_auto]";
const WORDMARK_CLASS =
  "op-slide-wordmark justify-self-end font-mono text-op-caption font-semibold tracking-[0.02em] text-text";
const SLIDE_MAIN_CLASS = "op-slide-main absolute left-0 right-0 z-[1] top-[72px] bottom-[70px]";
const CHROME_FOOTER_CLASS =
  "op-slide-chrome-footer absolute bottom-0 left-op-sm right-op-sm z-10 grid h-[70px] items-center border-t border-border bg-bg/95 text-op-caption text-text-muted [grid-template-columns:minmax(0,1fr)_72px]";
const FOOTER_LABEL_CLASS =
  "op-slide-footer-label overflow-hidden text-ellipsis whitespace-nowrap text-op-caption text-text-muted";
const FOOTER_NUMBER_CLASS =
  "op-slide-footer-number grid h-[70px] place-items-center border-l border-border text-op-caption text-text-muted [font-variant-numeric:tabular-nums]";

export function DeckSlide({
  id,
  variant = "content",
  children,
}: {
  id: string;
  variant?: DeckSlideVariant;
  children: ReactNode;
}) {
  return (
    <Slide id={id} className={SLIDE_PAGE_CLASS}>
      <div className={SLIDE_SHELL_CLASS} data-variant={variant}>
        <header className={CHROME_HEADER_CLASS}>
          <span>OpenPress Slide System</span>
          <span className={WORDMARK_CLASS}>open-press</span>
        </header>
        <main className={SLIDE_MAIN_CLASS}>{children}</main>
        <footer className={CHROME_FOOTER_CLASS}>
          <span className={FOOTER_LABEL_CLASS}>
            Source-backed workspace for AI-generated pages, social artifacts, and slide decks
          </span>
          <PageFolio currentFormat="plain" className={FOOTER_NUMBER_CLASS} />
        </footer>
      </div>
    </Slide>
  );
}

export default DeckSlide;
