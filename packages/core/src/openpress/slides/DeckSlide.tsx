import { PageFolio, Slide } from "../core";
import type { ReactNode } from "react";

export type DeckSlideVariant = "cover" | "agenda" | "content" | "process" | "closing";

const SLIDE_PAGE_CLASS = "op-slide-page bg-bg text-text [font-family:var(--font-body)]";
const SLIDE_SHELL_CLASS = "op-slide-shell relative h-full w-full overflow-hidden bg-bg";
const CHROME_HEADER_CLASS =
  "op-slide-chrome-header absolute left-0 right-0 top-0 z-10 grid h-[66px] items-center border-b border-border bg-bg/95 pl-op-sm text-op-caption text-text-muted [grid-template-columns:minmax(0,1fr)_1px_218px]";
const CHROME_RULE_CLASS = "op-slide-chrome-rule h-[42px] w-px bg-border";
const WORDMARK_CLASS =
  "op-slide-wordmark justify-self-center font-mono text-op-caption font-bold text-text";
const SLIDE_MAIN_CLASS = "op-slide-main absolute left-0 right-0 z-[1] top-[66px] bottom-[64px]";
const CHROME_FOOTER_CLASS =
  "op-slide-chrome-footer absolute bottom-0 left-0 right-0 z-10 grid h-[64px] items-center border-t border-border bg-bg/95 pl-op-sm text-op-caption text-text-muted [grid-template-columns:minmax(0,1fr)_62px]";
const FOOTER_LABEL_CLASS =
  "op-slide-footer-label overflow-hidden text-ellipsis whitespace-nowrap text-op-caption text-text-muted";
const FOOTER_NUMBER_CLASS =
  "op-slide-footer-number grid h-[64px] place-items-center border-l border-border text-op-caption text-text-muted [font-variant-numeric:tabular-nums]";

export function DeckSlide({
  id,
  variant = "content",
  title = "",
  brand = "open-press",
  footerLabel = "",
  children,
}: {
  id: string;
  variant?: DeckSlideVariant;
  title?: string;
  brand?: string;
  footerLabel?: string;
  children: ReactNode;
}) {
  return (
    <Slide id={id} className={SLIDE_PAGE_CLASS}>
      <div className={SLIDE_SHELL_CLASS} data-variant={variant}>
        <header className={CHROME_HEADER_CLASS}>
          <span>{title}</span>
          <span className={CHROME_RULE_CLASS} />
          <span className={WORDMARK_CLASS}>{brand}</span>
        </header>
        <main className={SLIDE_MAIN_CLASS}>{children}</main>
        <footer className={CHROME_FOOTER_CLASS}>
          <span className={FOOTER_LABEL_CLASS}>{footerLabel}</span>
          <PageFolio currentFormat="plain" className={FOOTER_NUMBER_CLASS} />
        </footer>
      </div>
    </Slide>
  );
}

export default DeckSlide;
