# Layout & Component Contract

Slide authoring is protocol-first and Tailwind-first.

## Import paths

```tsx
// Slide chrome wrapper — copy and customise per deck
import { DeckSlide } from "@open-press/core/slides";

// Protocol layouts — use directly in slides/<id>/slide.tsx
import {
  TitleSlide,
  StatementSlide,
  BlankSlide,
  TwoColumnSlide,
  CardGridSlide,
  ProcessSlide,
} from "@open-press/core/slides";

// Core primitives
import { Text, Slide } from "@open-press/core";
import type { SlideMeta } from "@open-press/core";
```

Use explicit JSX children, compound slots, and `op-*` semantic classes. Do not generate props-heavy layout APIs, slide-local CSS files, hand-authored object ids, or inline styles.

## DeckSlide Wrapper

`DeckSlide` wraps core `Slide`. It owns only deck chrome: footer, folio, brand, safe area, and variant metadata. It should use the shared `op-slide-*` classes from the Tailwind slide style layer.

```tsx
import { PageFolio, Slide } from "@open-press/core";
import type { ReactNode } from "react";

export function DeckSlide({
  id,
  variant = "content",
  children,
}: {
  id: string;
  variant?: "cover" | "agenda" | "content" | "process" | "closing";
  children: ReactNode;
}) {
  return (
    <Slide id={id} className="op-slide-page">
      <div className="op-slide-shell" data-variant={variant}>
        <header className="op-slide-chrome-header">
          <span>Deck title</span>
          <span className="op-slide-chrome-rule" />
          <span className="op-slide-wordmark">brand</span>
        </header>
        <main className="op-slide-main">{children}</main>
        <footer className="op-slide-chrome-footer">
          <span className="op-slide-footer-label">Footer label</span>
          <PageFolio currentFormat="plain" className="op-slide-footer-number" />
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

Style via `className` using semantic classes. Do not encode visual presets in PageFolio props.

## Slide Template Protocol

Full-slide layouts are compound components. Root wrappers accept `id` and render `DeckSlide`; visible text lives in child slots.

```tsx
<TitleSlide id="cover">
  <TitleSlide.Kicker>Quarterly Review</TitleSlide.Kicker>
  <TitleSlide.Title>Revenue quality, not just revenue growth</TitleSlide.Title>
  <TitleSlide.Subtitle>Three signals for deciding where to invest next.</TitleSlide.Subtitle>
</TitleSlide>
```

```tsx
<TwoColumnSlide id="comparison">
  <TwoColumnSlide.Left>
    <TwoColumnSlide.Kicker>Trade-off</TwoColumnSlide.Kicker>
    <TwoColumnSlide.Title>Speed vs governance</TwoColumnSlide.Title>
  </TwoColumnSlide.Left>
  <TwoColumnSlide.Right>
    <Text as="p" className="op-body">Use explicit JSX content here.</Text>
  </TwoColumnSlide.Right>
</TwoColumnSlide>
```

Required first-pass layouts:

| Layout | Typical Use |
| --- | --- |
| `BlankSlide` | New-slide placeholder |
| `TitleSlide` | Cover, opener |
| `StatementSlide` | Big claim, closing |
| `TwoColumnSlide` | A/B, text plus visual |
| `CardGridSlide` | Three to six repeated content cards |
| `ProcessSlide` | Timeline, workflow, sequence |

Add new layouts only when the same slide structure repeats. Keep one-off composition inside the slide's explicit JSX slots.

## Initial UI Primitive Set

UI primitives do **not** wrap `DeckSlide`. They are reusable content blocks inside layout slots.

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

Style primitives with `op-*` semantic classes and allowed Tailwind layout utilities.

## Layout / UI Boundary

| Region | Put it in | Rule |
| --- | --- | --- |
| Deck chrome, footer, brand, folio, safe area | `components/DeckSlide.tsx` | One deck-local wrapper |
| Full-slide grid, slots, fixed page structure | `layouts/*.tsx` | Compound component wrapping `DeckSlide` |
| Reusable card, timeline, KPI, image frame, quote, table | `ui/*.tsx` | Does not wrap `DeckSlide` |
| Visible title, lead, caption, label | Text-backed compound slot | e.g. `TitleSlide.Title` |
| Replaceable diagram, chart, screenshot, custom JSX | `children` or named slot | e.g. `TwoColumnSlide.Right` |
| Items, metrics, steps arrays | Avoid | Use explicit JSX instead |

## Slot Boundary Decision

| Region type | Behavior | Example |
| --- | --- | --- |
| Fixed layout frame | Layout owns it; do not expose as props | safe area, grid, gutters, dividers, footer chrome |
| Formal text slot | Text-backed compound component | `StatementSlide.Statement` |
| Fixed local primitive | Small component for fixed-but-repeated layout structure | `CardGridSlide.Card` |
| Flexible content slot | `children` or named slot; no forced data shape | `TwoColumnSlide.Right` |
| Data adapter | Avoid as default authoring API | `items`, `metrics`, `steps`, `blocks` |

## Allowed Layout Props

`id`, `variant?`, `className?`, `children`

Root `className`, `aria-*`, and `data-*` may be forwarded to the layout section
for small template variants. Root `id` is reserved for the slide marker / frame
identity; do not use it as a DOM hook.

Avoid: `items`, `metrics`, `steps`, `blocks`, `logo`, `footerLabel`, `showFolio`, `pageNumber`, `totalPages`

## Text Slot Rule

Use `Text` from `@open-press/core` or local wrappers that accept and forward `TextProps`.

Do not hand-write `objectId` or `data-op-id`. The engine injects build-local locators. Compound slots must forward `...props` to `Text` or the real DOM node so injected `data-op-id` is preserved:

```tsx
function TitleSlideTitle({ children, className, ...props }: TextProps) {
  return (
    <Text {...props} as="h1" className={cx("op-display", className)}>
      {children}
    </Text>
  );
}
```
