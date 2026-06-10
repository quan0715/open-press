# Layout & Component Contract

Slide authoring is protocol-first and Tailwind-first.

## Import paths

`DeckSlide` and the Protocol layouts are workspace-owned files scaffolded by `npm create @open-press`. They live at:

```
press/<slug>/components/DeckSlide.tsx      ← deck chrome, edit freely
press/<slug>/layouts/SlideProtocol.tsx     ← protocol layouts, edit freely
```

```tsx
// In slides/<id>/slide.tsx — import from workspace-local paths
import { TitleSlide } from "../layouts/SlideProtocol";
import { BlankSlide, TwoColumnSlide } from "../layouts/SlideProtocol";

// Core primitives (from the npm package — do not edit)
import { Text, Slide } from "@open-press/core";
import type { SlideMeta } from "@open-press/core";
```

Use explicit JSX children, compound slots, and `op-*` semantic classes. Do not generate props-heavy layout APIs, slide-local CSS files, hand-authored object ids, or inline styles.

## DeckSlide Wrapper

`DeckSlide` lives at `press/<slug>/components/DeckSlide.tsx` — it is workspace-owned, not a framework export. It wraps core `Slide` and owns deck chrome: header, brand wordmark, footer label, and page folio.

```tsx
// components/DeckSlide.tsx — edit this to customise your deck's chrome
import { PageFolio, Slide } from "@open-press/core";

export function DeckSlide({ id, variant = "content", children }) {
  return (
    <Slide id={id} className="op-slide-page bg-bg">
      <div className="relative h-full w-full" data-variant={variant}>
        <header className="...">
          <span>My Deck Title</span>   {/* ← edit directly */}
          <span className="...">brand</span>
        </header>
        <main className="...">{children}</main>
        <footer className="...">
          <span>Footer label</span>
          <PageFolio currentFormat="plain" className="..." />
        </footer>
      </div>
    </Slide>
  );
}
```

To change the deck title, wordmark, or footer label: **edit `DeckSlide.tsx` directly**. These are not props — they are intentionally hardcoded in the file so the chrome is yours to own.

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

Root `className`, `aria-*`, and `data-*` may be forwarded to the layout `<section>` for small per-slide variants. Root `id` is reserved for the slide marker / frame identity; do not use it as a DOM id hook.

Avoid: `items`, `metrics`, `steps`, `blocks`, `logo`, `footerLabel`, `showFolio`, `pageNumber`, `totalPages`

## Customisation Layers

**Layer 1 — slot `className` override** (most common)

Every compound slot accepts `className`; it is merged after the default semantic class:

```tsx
<TitleSlide id="cover">
  <TitleSlide.Content>
    <TitleSlide.Title className="text-accent">
      {/* op-display stays; color overrides to accent */}
      主標題
    </TitleSlide.Title>
  </TitleSlide.Content>
</TitleSlide>
```

**Layer 2 — edit `DeckSlide.tsx` for chrome changes**

The header title, brand wordmark, and footer label are hardcoded in `components/DeckSlide.tsx`. Edit that file directly:

```tsx
// components/DeckSlide.tsx
<span>Q3 財報 — ACME Corp</span>   {/* header title */}
<span className={WORDMARK_CLASS}>ACME</span>  {/* wordmark */}
<span className={FOOTER_LABEL_CLASS}>機密文件</span>  {/* footer */}
```

**Layer 3 — design token override (whole deck)**

To change visual style for the whole deck, override `op-*` tokens in the workspace theme. Nothing in the slide JSX needs to change:

```css
/* press/<slug>/theme/brand.css */
@layer theme {
  --color-accent: #e53935;
  --color-bg: #0f0f0f;
  --color-text: #f5f5f5;
  --font-heading: "Inter", sans-serif;
}
```

**Layer 4 — escape hatch with `<Slide>`**

When no protocol layout fits, use the bare `<Slide>` from `@open-press/core` and compose freely:

```tsx
import { Slide, Text } from "@open-press/core";

export default function CustomSlide() {
  return (
    <Slide id="custom-chart" className="op-slide-page bg-bg">
      <div className="grid h-full grid-cols-2 gap-op-lg p-op-xl">
        <Text as="h2" className="op-section">Custom layout</Text>
        <MyChart />
      </div>
    </Slide>
  );
}
```

Escape-hatch slides should still use `op-*` semantic classes and `op-*` spacing tokens — avoid raw palette, arbitrary values, or absolute positioning in slide content.

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
