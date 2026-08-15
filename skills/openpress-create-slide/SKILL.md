---
name: openpress-create-slide
description: Use when creating, editing, reordering, templating, or verifying an OpenPress slide deck or presentation.
---

# OpenPress Create Slide

This skill owns slide structure, templates, theme, content, and metadata. `openpress` owns CLI lifecycle and delivery; `openpress-collaborate` owns revision mode for existing authored content.

## Delivery Shape

Use four phases for a new deck; for a narrow edit, enter at the relevant phase.

| Phase | Required output |
| --- | --- |
| TOPIC | audience, objective, core promise, constraints |
| STORY | slide plan with `id`, `kind`, `message`, `evidence`, and `template` |
| STYLE | one visual direction, theme-token plan, template registry plan |
| PRODUCE | registered templates, explicit slide source, metadata, fresh review |

Use stable semantic slide ids. Mark missing evidence instead of inventing material numbers, legal claims, or public commitments.

## OpenPress Slide Contract

- Canvas is fixed at 1920 × 1080 (`page="slide-16-9"`). Slides must not scroll.
- `press/<slug>/press.tsx` is an ordered marker-only index of self-closing `<Slide id />` entries.
- Each `slides/<id>/slide.tsx` contains explicit content plus `meta` and optional `notes`.
- Registered templates are complete slides under `slide-style/templates/` and are declared in `slide-style/manifest.json`.
- Build slides from `Slide`, nested `Frame`, `Text`, `Line`, `MediaObject`, `Media`, and `MediaCaption` from `@open-press/core`.
- Give `Frame` a stable `frameKey`; give `Text`, `Line`, and `MediaObject` stable local `label` values. Never author generated locators.
- Prefer explicit JSX children over data-prop layouts or hidden arrays so Workbench inspection and source editing target real nodes.
- Keep layout in `Slide`/`Frame`; keep type and color in theme tokens/CSS.
- Portable style lives in `slide-style/theme/default.css`; the active Press theme lives in `theme/default.css`.
- Do not add slide-local CSS by default. Use semantic `op-*` classes and the active theme.
- Use an already-installed icon library; do not add a dependency solely for slide authoring.

Read the matching references before writing these surfaces:

| Work | Reference |
| --- | --- |
| Press tree and folders | `references/press-tree.md` |
| Templates, frames, objects, CLI add | `references/layout-contract.md` |
| Theme and semantic CSS | `references/css-colocate.md` |
| Text roles | `references/typography-roles.md` |
| Icons | `references/icons.md` |

## Create And Edit

Add slides through the registered template system:

```bash
open-press slide add <id> --press <slug> --template <name>
open-press slide add <id> --press <slug> # manifest default
```

Then edit the copied `slides/<id>/slide.tsx` directly.

```bash
open-press slide reorder <id> --press <slug> --after <target-id>
open-press slide reorder --press <slug> --order <id>...
open-press slide skip <id> --press <slug>
open-press slide unskip <id> --press <slug>
```

- Reorder without renaming semantic ids.
- Convert data-prop layouts to explicit JSX before substantial editing.
- Add a template when a layout is reusable across slides or workspaces.
- Add `ui/` only for a genuinely repeated content primitive.
- Verify a new template in the Workbench template browser before using it broadly.

## Metadata

Each slide may export:

```ts
export const meta = {
  layout: "<template-or-family>",
  description: "<one sentence describing the current composition>",
  keypoints: ["<message>"],
  visuals: ["<asset filename>"],
} satisfies SlideMeta

export const notes = "<speaker notes>"
```

Write metadata from the current JSX, not from a planned layout. Do not put component names, CSS classes, or verbatim slide copy in `meta`. `notes` are Workbench-only and never render in the slide frame.

After the user confirms a slide or batch, refresh `meta` and `notes`. Present them for alignment only when confirmation or wording is still unresolved.

## Setup

OpenPress requires Node 20 or newer.

```bash
node -v
find press -mindepth 2 -maxdepth 2 -name press.tsx -print -quit 2>/dev/null | grep -q . && echo EXISTING || echo FRESH
```

- Fresh empty folder: `npm create @open-press <target> -- --type slides --title "<title>"`.
- Existing workspace: inspect sibling Presses, then run `open-press create <slug> --type slides --title "<title>"` and edit only the new Press.
- Do not force a non-empty target or use create commands for upgrades.

Framework-only scaffold work must keep `@open-press/create` and `open-press create` aligned: marker-only `press.tsx`, registered templates, portable and active theme files, and copied `slides/<id>/slide.tsx`. After scaffold changes, run both package test suites.

## Verify

Scan authored source first:

```bash
open-press search . "[TODO:" --scope all --json
open-press search . "[DRAFT:" --scope all --json
```

Refresh metadata for slides confirmed in this session, then follow `openpress` → **Review And Delivery Gate**. Inspect every affected slide in Workbench; export only the format the user requested.

Report the brief, slide plan, Press slug, geometry, templates/theme and source files touched, unresolved assets/evidence, metadata updates, and fresh verification results.

## Boundaries

- Do not edit generated output or publish from this skill.
- Do not put slide content, imports, arrays, or layout components in `press.tsx`.
- Do not create protocol layout files or empty proxy components.
- Route specialized architecture diagrams, visual kits, and external tools through `openpress-plugins`.
