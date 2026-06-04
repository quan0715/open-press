import { PageFolio, Slide } from "@open-press/core";
import type { ReactNode } from "react";

export type DeckSlideVariant = "cover" | "agenda" | "content" | "process" | "closing";

export function DeckSlide({
  id,
  variant,
  children,
}: {
  id: string;
  variant: DeckSlideVariant;
  children: ReactNode;
}) {
  return (
    <Slide
      id={id}
      className="reader-page--slide-test qjudge-slide"
    >
      <div className="slide-shell" data-variant={variant}>
        <header className="slide-fixed-header">
          <span>OpenPress Dogfood Slide Review</span>
          <span className="header-logo-rule" />
          <span className="dogfood-wordmark">open-press</span>
        </header>
        <main className="slide-main">{children}</main>
        <footer className="slide-fixed-footer">
          <span className="footer-report-label">
            Source-backed workspace for AI-generated pages, social artifacts, and slide decks
          </span>
          <PageFolio currentFormat="plain" className="footer-page-number" />
        </footer>
      </div>
    </Slide>
  );
}

export default DeckSlide;
