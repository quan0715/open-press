# Layout & Component Contract

## DeckSlide Wrapper

`DeckSlide` must wrap core `Slide`. It is the deck-local shell: footer, folio, variant, background.

```tsx
import { PageFolio, Slide } from "@open-press/core";
import type { ReactNode } from "react";
import "./DeckSlide.css";

export function DeckSlide({
  id,
  variant = "default",
  children,
}: {
  id: string;
  variant?: "default" | "cover" | "chapter" | "closing";
  children: ReactNode;
}) {
  return (
    <Slide id={id} className={`op-slide op-slide--${variant}`}>
      <div className="op-slide__surface">
        <div className="op-slide__grid" aria-hidden="true" />
        <main className="op-slide__content">{children}</main>
        <footer className="op-slide__footer">
          <PageFolio
            variant="slash"
            currentFormat="2-digit"
            totalFormat="2-digit"
            className="op-slide__folio"
          />
        </footer>
      </div>
    </Slide>
  );
}
```

## PageFolio Variants

| Display | Usage |
| --- | --- |
| `01` | `<PageFolio currentFormat="2-digit" />` |
| `1` | `<PageFolio currentFormat="plain" />` |
| `04 / 35` | `<PageFolio variant="slash" currentFormat="2-digit" totalFormat="2-digit" />` |
| `p 4` | `<PageFolio variant="prefix" prefix="p " />` |

Style via CSS class (e.g. `.op-slide__folio`). Do not encode visual presets in props.

## Initial Layout Set

Each layout wraps `DeckSlide` and owns its own `.css` file.

| Layout | File | Typical Use |
| --- | --- | --- |
| `TitleSlide` | `layouts/title-slide.tsx` | Cover, closing |
| `AgendaSlide` | `layouts/agenda-slide.tsx` | Section preview |
| `ChapterOpenerSlide` | `layouts/chapter-opener-slide.tsx` | Chapter divider |
| `TitledContentSlide` | `layouts/titled-content-slide.tsx` | Most content slides |
| `TwoColumnSlide` | `layouts/two-column-slide.tsx` | Before/after, A/B |
| `MetricSlide` | `layouts/metric-slide.tsx` | KPIs, numbers |
| `ComparisonSlide` | `layouts/comparison-slide.tsx` | Side-by-side comparison |
| `QuoteSlide` | `layouts/quote-slide.tsx` | Pull quote |
| `ImageCaptionSlide` | `layouts/image-caption-slide.tsx` | Single visual |
| `ConclusionSlide` | `layouts/conclusion-slide.tsx` | CTA, next step |

## Initial UI Primitive Set

Each primitive does **not** wrap `DeckSlide`. It is a reusable content block.

| Primitive | File |
| --- | --- |
| `Card` | `ui/card.tsx` |
| `Badge` | `ui/badge.tsx` |
| `Callout` | `ui/callout.tsx` |
| `KpiCard` | `ui/kpi-card.tsx` |
| `ImageFrame` | `ui/image-frame.tsx` |
| `QuoteBlock` | `ui/quote-block.tsx` |
| `Timeline` | `ui/timeline.tsx` |
| `CompareTable` | `ui/compare-table.tsx` |

## Layout / UI Boundary

| Region | Put it in | Rule |
| --- | --- | --- |
| Deck chrome, footer, brand, folio, safe area | `components/DeckSlide.tsx` | One deck-local wrapper |
| Full-slide grid, slots, fixed page structure | `layouts/*.tsx` | Wraps `DeckSlide` |
| Reusable card, timeline, KPI, image frame, quote, table | `ui/*.tsx` | Does not wrap `DeckSlide` |
| Visible title, lead, caption, label | Text-backed compound slot | e.g. `TitledContentSlide.Title` |
| Replaceable diagram, chart, screenshot, custom JSX | `children` or named slot | e.g. `ChapterOpenerSlide.Visual` |
| Items, metrics, steps arrays | Avoid | Use explicit JSX instead |

## Slot Boundary Decision

| Region type | Behavior | Example |
| --- | --- | --- |
| Fixed layout frame | Layout owns it; do not expose as props | safe area, grid, gutters, dividers, footer chrome |
| Formal text slot | Text-backed compound component | `TitledContentSlide.Title`, `ChapterOpenerSlide.Lead` |
| Fixed local primitive | Small component for fixed-but-repeated layout structure | `ChapterOpenerSlide.SectionList` |
| Flexible content slot | `children` or named slot; no forced data shape | `TitledContentSlide.Content`, `TwoColumnSlide.Left` |
| Data adapter | Avoid as default authoring API | `items`, `metrics`, `steps`, `blocks` |

## Allowed Layout Props

`id`, `chapter?`, `variant?`, `className?`, `children`

Avoid: `items`, `metrics`, `steps`, `blocks`, `logo`, `footerLabel`, `showFolio`, `pageNumber`, `totalPages`

## Text Slot Rule

Use `Text` from `@open-press/core` or local wrappers that pass through `TextProps`. Always set `objectId` on visible literal text so OpenPress can inject source ranges for inline edit.
