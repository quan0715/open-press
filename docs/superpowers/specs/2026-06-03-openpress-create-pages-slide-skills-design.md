# OpenPress Create Pages / Create Slide Skill Split Design

## Summary

OpenPress will replace the current user-facing skill split around `openpress-init`, `openpress-writing`, `openpress-design`, and `openpress-create-theme` with two creation-oriented entry points:

- `openpress-create-pages`
- `openpress-create-slide`

The old skill files and their routing references will be removed from the repository. Their useful responsibilities will move into the two new create skills. Theme creation will not remain a standalone skill; both create skills will include the relevant theme intake and generation rules for their own output mode.

This is a product and authoring model change, not a core runtime rewrite. `Frame`, `Press`, and `Workspace` remain the underlying OpenPress primitives.

## Goals

- Make the user-facing entry point match the artifact the user wants to create: pages or slides.
- Remove skill routing that asks agents to choose between abstract lifecycle phases (`init`, `writing`, `design`) before choosing an output mode.
- Give page-based Press and slide-based Press their own Press Tree generation rules.
- Make slide creation generate a reusable template component system, not only a loose list of `<Frame>` elements.
- Fold first-pass theme creation into each create skill so theme decisions happen in the same workflow as structure decisions.
- Preserve existing system skills such as `openpress`, `openpress-deploy`, `openpress-apply-comments`, and specialist portable skills where they still make sense.

## Non-Goals

- Do not change the core meaning of `<Frame>`, `<Press>`, or `<Workspace>`.
- Do not add a new core package surface such as `@open-press/core/slide` in this phase.
- Do not port the `open-slide` runtime into OpenPress.
- Do not keep `openpress-create-theme` as a separate public skill.
- Do not preserve compatibility references that route users to deleted skills.

## Current State

OpenPress already supports multiple Press types:

- `<Press type="pages" page="a4">` for page-based documents.
- `<Press type="slides" page="slide-16-9">` for explicit slide decks.

The dogfood workspace already demonstrates a slide Press using:

```tsx
<Press slug="slide" title="Hello, slide" type="slides" page="slide-16-9">
  <SlidePlaceholder />
</Press>
```

Each slide is currently a `Frame` with `role="canvas.slide"`, `chrome={false}`, and a local `SlideFrame` helper. This validates the intended architecture: `Frame` is the engine primitive, while slide authoring wants a higher-level workspace component.

## Lifecycle Ownership

`@open-press/cli init` remains the low-level workspace scaffolder. `openpress-create-pages` and `openpress-create-slide` are the user-facing artifact creation workflows that may call `init` for fresh workspaces.

`openpress` owns existing-workspace lifecycle operations: `doctor`, `upgrade`, `migrate`, validation, render, PDF/image export, deploy dry-runs, search/replace, and source/generated boundaries.

## New Skill Catalog

### Keep

| Skill | Responsibility |
| --- | --- |
| `openpress` | CLI, validation, rendering, PDF/image export, deploy dry-run support, search/replace, upgrades, source/generated boundaries. |
| `openpress-create-pages` | Create page-based Press outputs and their first-pass theme, structure, source tree, and page components. |
| `openpress-create-slide` | Create slide-based Press outputs and their first-pass theme, deck structure, slide components, and slide authoring rules. |
| `openpress-deploy` | Public deploy workflow. |
| `openpress-apply-comments` | Apply workbench comments. |
| Portable content skills | Specialist language or genre rules, loaded by the create skills when applicable. |

### Remove

| Skill | Replacement |
| --- | --- |
| `openpress-init` | `openpress-create-pages` or `openpress-create-slide`, depending on target artifact. |
| `openpress-writing` | Pages writing rules move into `openpress-create-pages`; slide narrative rules move into `openpress-create-slide`. |
| `openpress-design` | Page visual rules move into `openpress-create-pages`; slide visual rules move into `openpress-create-slide`. |
| `openpress-create-theme` | Theme intake and generation move into both create skills. |

## `openpress-create-pages`

`openpress-create-pages` owns page-based artifacts such as reports, proposals, papers, books, teaching notes, and long-form documents.

### Branches

- Fresh directory: run environment preflight, gather required intake, run `npx @open-press/cli init <target> --title "<title>"`, then replace or extend the starter Press as needed.
- Existing OpenPress workspace: add a page-based `<Press>` under the existing `<Workspace>`.

### Intake

- Artifact type.
- Audience.
- Primary language.
- Title.
- Page geometry, defaulting by artifact type.
- Optional brand/theme inputs: colors, fonts, reference aesthetic.
- Optional domain skill or starter-bearing skill.

### Generated Structure

Default page-based Press should use a source-driven MDX tree:

```tsx
<Press
  slug="report"
  title="..."
  type="pages"
  page="a4"
  sources={[mdxSource({ id: "report", preset: "section-folders", root: "report/chapters" })]}
>
  ...
</Press>
```

For a single-Press workspace, slug can be omitted only if no second Press exists. Adding a second Press promotes every Press to explicit slug mode.

### Internalized Writing Rules

The pages skill owns:

- Audience and document purpose.
- H2/H3/H4 hierarchy.
- TOC depth.
- Appendix placement.
- Table and figure caption placement.
- Factual boundaries and `[TODO: ...]` markers.
- Loading portable writing skills when language or genre requires it.

### Internalized Design Rules

The pages skill owns:

- `press/theme/` first pass.
- Page rhythm and fixed-layout CSS.
- Cover, TOC, chapter, content, and back-cover components.
- PDF-safe layout rules.
- `press/design.md` as the shared user/agent design source.

## `openpress-create-slide`

`openpress-create-slide` owns slide decks.

### Branches

- Fresh directory: run environment preflight, gather slide intake, scaffold workspace, then create a slide Press.
- Existing OpenPress workspace: add a slide Press with explicit slug, page geometry, theme, and components.

### Intake

- Topic and audience.
- Page count bracket.
- Text density.
- Static vs subtle motion vs richer motion.
- Visual direction or theme inputs.
- Required assets such as screenshots, logos, photos, charts.

### Generated Press

Slide Press defaults:

```tsx
<Press slug="slides" title="..." type="slides" page="slide-16-9" componentsDir="./slides/components">
  <Deck />
</Press>
```

The skill should use `page="slide-16-9"` unless the user explicitly requests another slide geometry.

### Slide Component Contract

`Frame` remains the engine contract. The create-slide skill generates workspace-level authoring components that wrap `Frame`.

Recommended generated paths:

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
press/slides/theme/
```

The root `press/index.tsx` imports the deck component from `press/slides/index.tsx`.

### `SlideFrame`

`SlideFrame` is the low-level workspace component for one slide page:

```tsx
<SlideFrame frameKey="slide-01" variant="title" title="Opening">
  ...
</SlideFrame>
```

It should render:

```tsx
<Frame
  frameKey={frameKey}
  role="canvas.slide"
  chrome={false}
  className={`op-slide op-slide--${variant}`}
  data-page-title={title}
>
  ...
</Frame>
```

`SlideFrame` owns:

- The `Frame` wrapper.
- Shared background and grid.
- Header/footer shell.
- Brand mark.
- Page chip or page number.
- Common content region.

### Template Slide Components

Initial slide components should be explicit and boring enough for agents to use reliably:

- `TitleSlide`
- `SectionSlide`
- `AgendaSlide`
- `ContentSlide`
- `TwoColumnSlide`
- `QuoteSlide`
- `ImageSlide`
- `ClosingSlide`

Each component should accept concrete props and render source-backed `Text` objects where inspector/comment editing should work. Repeated visual items should use small components with explicit instances instead of `array.map` over data arrays when inspector editability matters.

### Slide Authoring Rules

The slide skill should internalize these rules, adapted from the `open-slide` authoring model:

- Design against a fixed 1920 x 1080 canvas.
- One idea per slide.
- Use absolute pixel thinking for type and spacing.
- Keep 100-160 px content padding unless the slide type has a deliberate full-bleed visual.
- Do vertical budget math before writing dense slides.
- Avoid scrollable slide content.
- Keep body text large enough for presentation.
- Keep one coherent visual direction across the deck.
- Use concrete slide components instead of loose ad hoc JSX.
- Use real assets only when they are needed by the topic; otherwise use typography, layout, and generated visual systems.
- Use motion sparingly; static decks are valid.

## Theme Integration

Theme creation is no longer a separate skill.

### Pages Theme

`openpress-create-pages` writes or updates:

- `press/theme/tokens.css`
- `press/theme/fonts.css`
- `press/theme/base/page-contract.css`
- `press/theme/base/typography.css`
- `press/theme/base/print.css`
- `press/theme/page-surfaces/*`
- `press/design.md`

### Slide Theme

`openpress-create-slide` writes or updates:

- `press/slides/theme/tokens.css`
- `press/slides/theme/slides.css`
- slide component CSS if the generated components use class-based styling
- a slide-oriented section in `press/design.md` or `press/slides/design.md`

If the workspace has both pages and slides, shared brand tokens may live in `press/theme/tokens.css`, but slide-specific layout rules should stay under the slide Press folder unless the user asks for a shared theme.

## Migration Scope

Implementation must update references in:

- `README.md`
- `AGENTS.md`
- `docs/skills.md`
- `packages/core/AGENTS.md`
- `packages/core/README.md`
- `packages/cli/README.md`
- `packages/cli/src/init.ts` next-step text if it mentions old skills
- starter skill docs and starter content that mention `openpress-init`, `openpress-writing`, `openpress-design`, or `openpress-create-theme`
- `skills-lock.json` references if present
- tests or fixtures that assert skill names or routing text

The deletion should be real: old skill directories should not remain as wrappers or aliases.

## Verification

After implementation:

- `rg "openpress-init|openpress-writing|openpress-design|openpress-create-theme|/create-theme" . -g '!**/node_modules/**'` should only find migration notes or changelog entries that intentionally preserve history.
- `pnpm test` should pass.
- `pnpm build` should pass.
- A generated slide Press should render in the workbench and presenter route.
- A generated pages Press should render and validate.

## Risks

- Removing old skill names is a breaking change for installed workspaces and docs. Release notes must say this clearly.
- Existing external starter-bearing skills may still mention `openpress-writing` or `openpress-design`. The repo can update bundled starters, but external repos need follow-up.
- If `openpress-create-slide` becomes too broad, it may become hard to maintain. Keep it workflow-oriented and make the component contract concrete.
- If slide components become core APIs too early, OpenPress may freeze the wrong abstraction. Keep them generated in workspaces first.

## Decision

Proceed with the split:

- Delete the old lifecycle-oriented skills.
- Add `openpress-create-pages`.
- Add `openpress-create-slide`.
- Fold theme creation into both create skills.
- Generate Frame-based slide components for slide decks.
- Keep `Frame` as the core primitive and treat generated page/slide components as authoring contracts.
