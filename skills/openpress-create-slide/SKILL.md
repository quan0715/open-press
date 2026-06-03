---
name: openpress-create-slide
description: Use when the user wants to create, draft, scaffold, or add an OpenPress slide deck or presentation. This skill owns fresh workspace bootstrap for slides, adding a slides Press to an existing Workspace, slide Press Tree generation, first-pass slide theme intake, Frame-based slide component templates, deck narrative, slide density, assets, motion discipline, and verification.
---

# OpenPress Create Slide

This skill is the user-facing creation workflow for OpenPress slide decks.

`openpress-create-slide` owns artifact creation. The `openpress` skill owns ongoing system lifecycle: CLI command choice, validation, render/PDF/image export, deploy, doctor, upgrade, and migrate. The CLI `npx @open-press/cli init <target>` remains the low-level workspace scaffolder; this skill calls it only when a fresh workspace is needed.

## Responsibilities

- Start a fresh slide-based OpenPress workspace.
- Add a slide Press to an existing Workspace.
- Generate a slide Press Tree with `type="slides"` and `page="slide-16-9"` by default.
- Generate Frame-based slide components.
- Gather theme inputs and write the first slide visual system.
- Plan deck structure and slide roles.
- Enforce fixed-canvas slide authoring rules.
- Verify the deck before handoff.

## Boundary

| Owner | Scope |
| --- | --- |
| `openpress-create-slide` | Create or add slide decks, including structure, theme, slide components, assets, and deck narrative. |
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
test -f press/index.tsx && grep -q "<Workspace" press/index.tsx && echo EXISTING_WORKSPACE || echo FRESH_WORKSPACE
```

- `FRESH_WORKSPACE`: scaffold a new workspace first.
- `EXISTING_WORKSPACE`: add a slide Press to the current Workspace.
- If `press/index.tsx` exists but does not use `<Workspace>`, route to `openpress` for upgrade/migration before creating new content.

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
npx @open-press/cli init <target> --title "<title>"
```

Use `.` only when the user explicitly wants the current directory. The CLI rejects non-empty targets; do not use a force flag.

After init, continue with the slide Press Tree and component steps below.

## 4. Existing Workspace Flow

Read `press/index.tsx` and identify existing `<Press>` children, slugs, page geometries, and source roots.

If adding a second Press to an implicit single-Press workspace, add a slug to the existing Press in the same edit. Ask the user for the new slide Press slug; do not invent it when there is already more than one Press.

For internal dogfood or disposable verification, use an explicit temporary slug such as `slide-dogfood`, report that choice, and remove the temporary Press/source/output after verification.

## 5. Slide Press Tree Contract

Default generated shape:

```tsx
import { Press, Workspace } from "@open-press/core";
import Deck from "./slides";

<Press
  slug="slides"
  title="Deck Title"
  type="slides"
  page="slide-16-9"
  componentsDir="./slides/components"
  theme="./slides/theme"
>
  <Deck />
</Press>
```

Recommended folder layout:

```txt
press/slides/index.tsx
press/slides/components/SlideFrame.tsx
press/slides/components/TitleSlide.tsx
press/slides/components/SectionSlide.tsx
press/slides/components/AgendaSlide.tsx
press/slides/components/ContentSlide.tsx
press/slides/components/TwoColumnSlide.tsx
press/slides/components/QuoteSlide.tsx
press/slides/components/ImageSlide.tsx
press/slides/components/ClosingSlide.tsx
press/slides/theme/tokens.css
press/slides/theme/slides.css
press/slides/media/
```

## 6. Frame-Based Slide Component Contract

`Frame` is the engine primitive. Generated slide components are workspace authoring components.

`SlideFrame` must wrap `Frame`:

```tsx
import { Frame } from "@open-press/core";
import type { ReactNode } from "react";

export function SlideFrame({
  frameKey,
  variant,
  title,
  children,
}: {
  frameKey: string;
  variant: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Frame
      frameKey={frameKey}
      role="canvas.slide"
      chrome={false}
      className={`op-slide op-slide--${variant}`}
      data-page-title={title}
    >
      <div className="op-slide__surface">
        <div className="op-slide__grid" aria-hidden="true" />
        <main className="op-slide__content">{children}</main>
      </div>
    </Frame>
  );
}
```

Initial template components:

- `TitleSlide`
- `SectionSlide`
- `AgendaSlide`
- `ContentSlide`
- `TwoColumnSlide`
- `QuoteSlide`
- `ImageSlide`
- `ClosingSlide`

Use `Text` from `@open-press/core` for source-backed text where inspector/comment editing should work.

## 7. Deck Structure Rules

Common roles:

| Role | Purpose |
| --- | --- |
| Cover | Title, subtitle, strong visual identity. |
| Agenda | Three to five promised sections. |
| Section | Chapter divider. |
| Content | One idea with 2-5 bullets or one visual. |
| Comparison | Two-column before/after or A/B. |
| Quote | Pull quote and attribution. |
| Image | One concrete visual with minimal text. |
| Closing | CTA, thank you, next step, or contact. |

One idea per slide. If a slide needs both a paragraph and a long bullet list, split it.

## 8. Slide Authoring Rules

- Design against a fixed 1920 x 1080 canvas.
- Use absolute pixel thinking for type, spacing, and image slots.
- Use 100-160 px content padding unless a slide is deliberately full-bleed.
- Keep body text large enough for projection.
- Do vertical budget math before writing dense slides.
- Never use scrollable slide content.
- Keep one coherent visual direction across the deck.
- Prefer explicit repeated component instances over `array.map` when inspector editability matters.
- Use real assets only when required by the deck topic.
- Static decks are valid. Use motion sparingly and keep one transition family if motion is used.

## 9. Theme Rules

Write or update:

```txt
press/slides/theme/tokens.css
press/slides/theme/slides.css
press/slides/components/
press/design.md or press/slides/design.md
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

## 10. Verify

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
- generated slide components
- theme paths written
- assets required from the user
- verification commands and results

## Do Not

- Do not route slide creation to deleted lifecycle skills.
- Do not use `npx @open-press/cli init` as an upgrade/migration tool.
- Do not edit generated output.
- Do not publish.
- Do not install dependencies for slide authoring.
