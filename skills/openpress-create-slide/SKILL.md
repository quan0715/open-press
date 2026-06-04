---
name: openpress-create-slide
description: Use when the user wants to create, draft, scaffold, edit, reorder, add, or revise an OpenPress slide deck or presentation; author or revise slide layouts and UI primitives; convert data-prop layouts to slot-frame JSX; or reference a specific slide, template, opener, or column page. This skill owns slide Press creation, slide editing, layout and template authoring, DeckSlide/layout/ui source structure, slot boundary decisions, first-pass slide theme, deck narrative, slide density, assets, motion discipline, and verification.
---

# OpenPress Create Slide

This skill is the user-facing creation workflow for OpenPress slide decks.

`openpress-create-slide` owns artifact creation. The `openpress` skill owns ongoing system lifecycle: CLI command choice, validation, render/PDF/image export, deploy, doctor, upgrade, and migrate. The CLI `npx @open-press/cli init <target> --type slides` remains the low-level workspace scaffolder for fresh slide workspaces.

## Responsibilities

- Start a fresh slide-based OpenPress workspace.
- Add a slide Press to an existing Workspace.
- Generate a slide Press Tree with `type="slides"` and `page="slide-16-9"` by default.
- Generate a project-owned `DeckSlide` wrapper around core `Slide`.
- Generate slide-level layouts under `layouts/` and reusable content primitives under `ui/`.
- Gather theme inputs and write the first slide visual system.
- Plan deck structure and slide roles.
- Decide layout/UI/slot boundaries before introducing component props.
- Enforce fixed-canvas slide authoring rules.
- Verify the deck before handoff.

## Boundary

| Owner | Scope |
| --- | --- |
| `openpress-create-slide` | Create, add, edit, or revise slide decks, including structure, theme, layouts, UI primitives, assets, deck narrative, and layout/template authoring. |
| `openpress-create-pages` | Create or add page-based documents. |
| `openpress` | CLI lifecycle, build/render/PDF/image/deploy, doctor, upgrade, migrate, source/generated boundary. |
| `openpress-deploy` | Public deploy workflow after explicit user confirmation. |
| `openpress-apply-comments` | Pending `@openpress-comment` markers. |

Source paths follow `openpress` > Source Boundary.

## 0. Environment Preflight

```bash
node -v
npm -v
npx -v
```

- All commands work and Node is >=20: continue.
- Missing `node`, `npm`, or `npx`: stop and tell the user to install Node.js LTS, reopen the terminal, then rerun.
- Node <20: stop and tell the user to upgrade Node.js LTS, then rerun.

## 1. Detect Workspace Branch

```bash
find press -mindepth 2 -maxdepth 2 -name press.tsx -print -quit 2>/dev/null | grep -q . && echo EXISTING_WORKSPACE || echo FRESH_WORKSPACE
```

- `FRESH_WORKSPACE`: scaffold a new workspace first.
- `EXISTING_WORKSPACE`: add a slide Press folder under `press/<slug>/`.
- If no `press/*/press.tsx` files exist, scaffold a folder-convention workspace first.

## 2. Intake

Gather these before writing files:

- Topic and audience.
- Title.
- Page count: 3-5, 6-10, 11-20, or custom.
- Text density: minimal, light, standard, or dense.
- Motion: static, subtle, or rich.
- Visual direction: three topic-specific options, unless the user supplied a brand/theme.
- Required assets: screenshots, logos, product images, team photos, charts.
- Target slug when adding to an existing multi-Press workspace.

Default page geometry is `slide-16-9`. Ask before using custom geometry.

## 3. Fresh Workspace Flow

Run:

```bash
npx @open-press/cli init <target> --type slides --title "<title>"
```

Use `.` only when the user explicitly wants the current directory. The CLI rejects non-empty targets; do not use a force flag.

After init, continue with the slide Press Tree and component steps below.

## 4. Existing Workspace Flow

Read `press/*/press.tsx` and identify existing slugs, page geometries, source roots, `componentsDir`, and `mediaDir`.

Create a new `press/<slug>/` folder for the slide Press. Do not modify sibling Press folders unless the user explicitly asks for shared assets or a migration.

For internal dogfood or disposable verification, use an explicit temporary slug such as `slide-dogfood`, report that choice, and remove the temporary Press/source/output after verification.

## 5. Slide Press Tree Contract

Default generated shape:

```tsx
import { Press, Text } from "@open-press/core";
import { TitledContentSlide } from "./layouts/titled-content-slide";
import { TitleSlide } from "./layouts/title-slide";
import { Timeline } from "./ui/timeline";

export default function SlidePress() {
  return (
    <Press slug="slide" title="Deck Title" type="slides" page="slide-16-9">
      <TitleSlide id="cover" title="Deck Title">
        <TitleSlide.Title objectId="title">Deck Title</TitleSlide.Title>
        <TitleSlide.Description objectId="description">
          One-line audience promise.
        </TitleSlide.Description>
      </TitleSlide>

      <TitledContentSlide id="problem-context" title="Problem Context">
        <TitledContentSlide.Eyebrow objectId="eyebrow">Context</TitledContentSlide.Eyebrow>
        <TitledContentSlide.Title objectId="title">Problem Context</TitledContentSlide.Title>
        <TitledContentSlide.Content>
          <Text as="p" objectId="summary">Write visible slide content directly in JSX.</Text>
        </TitledContentSlide.Content>
      </TitledContentSlide>

      <TitledContentSlide id="workflow" title="Workflow">
        <TitledContentSlide.Eyebrow objectId="eyebrow">Process</TitledContentSlide.Eyebrow>
        <TitledContentSlide.Title objectId="title">Workflow</TitledContentSlide.Title>
        <TitledContentSlide.Content>
          <Timeline>
            <Timeline.Item id="draft" marker="01" title="Draft">Create the first structure.</Timeline.Item>
            <Timeline.Item id="review" marker="02" title="Review">Tighten content and layout.</Timeline.Item>
            <Timeline.Item id="export" marker="03" title="Export">Render PDF or images.</Timeline.Item>
          </Timeline>
        </TitledContentSlide.Content>
      </TitledContentSlide>
    </Press>
  );
}
```

Recommended folder layout:

```txt
press/slide/press.tsx
press/slide/components/DeckSlide.tsx
press/slide/ui/text.tsx
press/slide/ui/card.tsx
press/slide/ui/badge.tsx
press/slide/ui/callout.tsx
press/slide/ui/kpi-card.tsx
press/slide/ui/image-frame.tsx
press/slide/ui/quote-block.tsx
press/slide/ui/timeline.tsx
press/slide/ui/compare-table.tsx
press/slide/layouts/title-slide.tsx
press/slide/layouts/agenda-slide.tsx
press/slide/layouts/chapter-opener-slide.tsx
press/slide/layouts/titled-content-slide.tsx
press/slide/layouts/two-column-slide.tsx
press/slide/layouts/metric-slide.tsx
press/slide/layouts/comparison-slide.tsx
press/slide/layouts/quote-slide.tsx
press/slide/layouts/image-caption-slide.tsx
press/slide/layouts/conclusion-slide.tsx
press/slide/theme/tokens.css
press/slide/theme/slides.css
press/slide/media/
```

Use `layouts/` for full-slide layout components and `ui/` for reusable content primitives. Keep "template" as the name for the authoring task, not the source folder name.

The canonical and only supported entry is `press/<slug>/press.tsx`.

Component and media lookup is path-declared, not hardwired to one folder. Defaults include folder-local `./components` / `./media` and `press/shared/*`; when a slide Press intentionally uses another folder, set `<Press componentsDir>` or `<Press mediaDir>` to a string or string array. Paths starting with `./` resolve relative to the owning Press folder; bare paths resolve relative to `press/`.

Do not generate one empty component per slide such as `<ProblemContextSlide />` just to hide content. Compose visible slide content inline inside the `Press`, using layout components and their slots. Extract a component only when it is a reusable `ui/*` primitive or a reusable `layouts/*` pattern.

## 6. DeckSlide And Layout Contract

Core `Slide` maps author-facing `id` to the engine `Frame.frameKey`. Generated slide components are workspace authoring components. Use `PageFolio` for slide numbers instead of hardcoding `i + 1`, `01`, or `4 / 35`.

`DeckSlide` must wrap `Slide`:

```tsx
import { PageFolio, Slide } from "@open-press/core";
import type { ReactNode } from "react";

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
    <Slide
      id={id}
      className={`op-slide op-slide--${variant}`}
    >
      <div className="op-slide__surface">
        <div className="op-slide__grid" aria-hidden="true" />
        <main className="op-slide__content">{children}</main>
        <footer className="op-slide__footer">
          <PageFolio variant="slash" currentFormat="2-digit" totalFormat="2-digit" className="op-slide__folio" />
        </footer>
      </div>
    </Slide>
  );
}
```

`PageFolio` variants:

| Use | Component |
| --- | --- |
| `01` | `<PageFolio currentFormat="2-digit" />` |
| `1` | `<PageFolio currentFormat="plain" />` |
| `04 / 35` | `<PageFolio variant="slash" currentFormat="2-digit" totalFormat="2-digit" />` |
| `p 4` | `<PageFolio variant="prefix" prefix="p " />` |

Style the visual treatment with CSS classes such as `.op-slide__folio`; do not encode visual presets in the component props.

Initial slide layouts:

- `TitleSlide`
- `AgendaSlide`
- `ChapterOpenerSlide`
- `TitledContentSlide`
- `TwoColumnSlide`
- `MetricSlide`
- `ComparisonSlide`
- `QuoteSlide`
- `ImageCaptionSlide`
- `ConclusionSlide`

Initial `ui/` primitives:

- `Text` wrapper or local text role components
- `Card`
- `Badge`
- `Callout`
- `KpiCard`
- `ImageFrame`
- `QuoteBlock`
- `Timeline`
- `CompareTable`

Use `Text` from `@open-press/core` or local components that wrap it for source-backed text where inspector/comment editing should work. Text-backed compound slots should accept `TextProps`, pass them through to `Text`, and use `objectId` on visible literal text so OpenPress can inject source ranges for inline edit.

### Layout / UI Boundary

Before writing files, classify each region:

| Region | Put it in | Rule |
| --- | --- | --- |
| Deck chrome, footer, brand, folio, safe area | `components/DeckSlide.tsx` | One deck-local wrapper. |
| Full-slide grid, slots, and fixed page structure | `layouts/*.tsx` | Wraps `DeckSlide`. |
| Reusable card, timeline, KPI, image frame, quote block, comparison table | `ui/*.tsx` | Does not wrap `DeckSlide`. |
| Visible title, lead, caption, label | Text-backed compound slot | Example: `TitledContentSlide.Title`. |
| Replaceable diagram, chart, screenshot, custom JSX | children or named slot | Example: `ChapterOpenerSlide.Visual`. |
| Items, metrics, steps arrays | avoid by default | Use explicit JSX instead. |

`ChapterOpenerSlide.SectionList` and `ChapterOpenerSlide.ListItem` are valid layout-local primitives because the opener section list is part of a relatively fixed opener layout. A `Timeline` inside a titled content slide belongs in `ui/timeline.tsx` because it can be reused across layouts.

## 7. Deck Structure Rules

Common roles:

| Role | Purpose |
| --- | --- |
| Cover | Title, subtitle, strong visual identity. |
| Agenda | Three to five promised sections. |
| Section | Chapter divider. |
| Titled content | One idea with 2-5 bullets, one visual, or one reusable `ui/*` primitive. |
| Comparison | Two-column before/after or A/B. |
| Quote | Pull quote and attribution. |
| Image | One concrete visual with minimal text. |
| Closing | CTA, thank you, next step, or contact. |

One idea per slide. If a slide needs both a paragraph and a long bullet list, split it.

## 8. Slot Boundary Decision

Before writing files, classify each region of the slide:

| Region type | Behavior | Example |
| --- | --- | --- |
| Fixed layout frame | Layout owns it. Do not expose as content props. | safe area, grid, gutters, dividers, background panel, footer chrome |
| Formal text slot | Expose as Text-backed compound component. | `TitledContentSlide.Title`, `ChapterOpenerSlide.Lead` |
| Fixed local primitive | Small component when a layout structure is fixed but repeated. May accept scalar values rendered through `Text`. | `ChapterOpenerSlide.SectionList`, `ChapterOpenerSlide.ListItem` |
| Flexible content slot | Expose as `children` or a named slot. Do not force a data shape. | `TitledContentSlide.Content`, `ChapterOpenerSlide.Visual`, `TwoColumnSlide.Left` |
| Data adapter | Avoid as the default authoring API. | `items`, `metrics`, `steps`, `blocks`, `pageNumber`, `totalPages` |

Ask: what is the user likely to replace later? If they may replace the whole region with a diagram, chart, or custom JSX, make it a flexible slot. If they will usually only change the words inside the same repeated structure, use a narrow local primitive. If the region is layout scaffolding, keep it inside the layout.

Allowed layout props: `id`, navigation `title?`, `chapter?`, `variant?`, `className?`, `children`. Avoid `items`, `metrics`, `steps`, `blocks`, `logo`, `footerLabel`, `showFolio`, `pageNumber`, `totalPages`.

## 9. Slide Authoring Rules

- Design against a fixed 1920 x 1080 canvas.
- Use absolute pixel thinking for type, spacing, and image slots.
- Use 100-160 px content padding unless a slide is deliberately full-bleed.
- Keep body text large enough for projection.
- Do vertical budget math before writing dense slides.
- Never use scrollable slide content.
- Keep one coherent visual direction across the deck.
- Prefer explicit repeated component instances over `array.map` when inspector editability matters.
- Prefer `Press > LayoutSlide > inline content` over one component per individual slide.
- Use real assets only when required by the deck topic.
- Static decks are valid. Use motion sparingly and keep one transition family if motion is used.

## 10. Editing Guidance

Before editing an existing slide Press, identify the operation:

- **Reorder slides**: Move JSX blocks. Keep semantic `id` values unchanged — do not renumber.
- **Insert a slide**: Choose a new semantic `id`. Do not renumber adjacent slide ids.
- **Edit content**: Edit visible JSX, `Text` nodes, and Text-backed compound slots directly.
- **Migrate a data-prop layout**: Replace `items={[...]}` or `steps={[...]}` with explicit JSX children inside the layout's `children` or named content slot before making further content edits.
- **Add a layout**: Only when a slide pattern will be reused or clarifies a common slide role. Do not extract a component just to hide individual slide JSX.
- **Add a `ui/*` primitive**: Only when a content block is reusable across multiple layouts.

## 11. Theme Rules

Write or update:

```txt
press/slide/theme/tokens.css
press/slide/theme/slides.css
press/slide/components/
press/slide/ui/
press/slide/layouts/
press/design.md or press/slide/design.md
```

If the slide deck uses a per-deck theme folder, import the CSS from the deck entry (for example `import "./theme/slides.css";`). The `<Press theme>` prop is metadata for the Press; do not assume theme files are bundled unless they are imported or otherwise included by the workspace runtime.

Theme inputs:

- primary background
- primary text
- accent
- muted color
- display font
- body font
- brand mark or logo if supplied
- visual direction

Page geometry stays on `<Press page>`, not CSS.

## 12. Verify

Run:

```bash
npm run build
```

When image/PDF export matters:

```bash
npm run openpress:image
npm run openpress:pdf
```

Report:

- target path
- Press slug, title, and page geometry
- generated `components/`, `layouts/`, and `ui/` files
- theme paths written
- assets required from the user
- verification commands and results

## Do Not

- Do not route slide creation to deleted lifecycle skills.
- Do not use `npx @open-press/cli init` as an upgrade/migration tool.
- Do not generate one empty component per slide when inline layout composition is clearer.
- Do not edit generated output.
- Do not publish.
- Do not install dependencies for slide authoring.
