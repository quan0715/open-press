---
name: openpress-create-slide
description: Use when creating, editing, reordering, or verifying an OpenPress slide deck or presentation.
---

# open-press Create Slide

Create a slide deck as a sequence of direct, editable slide sources. Each slide owns its composition; the Press owns only deck registration, theme, and genuinely shared UI.

## First principles

- Start with the audience, the single message of each slide, and the evidence that supports it.
- Keep one visual idea per slide. Prefer a diagram, image, comparison, or large number over dense prose.
- New slides begin as direct source files, never through a registry or preselected layout asset.
- Reuse a local component only after a visual primitive is genuinely repeated. Keep it in `press/<slug>/ui/` or `press/<slug>/components/`.

## Read before changing source

1. Read the deck `press/<slug>/press.tsx`, the active `theme/default.css`, and nearby slides.
2. State the deck's visual direction in a short `STYLE` note: type scale, palette, spacing, and intended visual language.
3. For a new or restructured deck, write a compact delivery shape:

   ```text
   AUDIENCE: who must understand what
   STORY:
   - id | composition | one message | evidence or visual
   PRODUCE: direct slide sources, active theme, only proven shared UI
   ```

4. Preserve the existing slide order and IDs unless the user asks to change them.

## Source contract

- `press/<slug>/press.tsx` registers slide IDs with marker-only `<Slide id="…" />` entries.
- Each `press/<slug>/slides/<id>/slide.tsx` explicitly imports and composes the objects it needs.
- The deck canvas is fixed at 1920 × 1080. Keep a single `<Slide>` root, a predictable `<Frame>` boundary, and literal `meta`.
- `layout` in `meta` describes the composition for readers; it does not select source or generate a slide.
- Put deck tokens in `press/<slug>/theme/default.css`. Keep slide-specific CSS beside that slide or in the active theme when it is shared across the deck.
- Use `@open-press/core` objects where they clarify geometry, semantic structure, or responsive constraints. Use normal TSX and CSS for authored detail.

Read `references/layout-contract.md` before creating a slide. Read `references/css-colocate.md` when changing styles and `references/press-tree.md` when adding files.

## Add and edit slides

Create a blank slide source with:

```bash
open-press slide add <id> --press <slug>
```

Then edit `press/<slug>/slides/<id>/slide.tsx` directly. The generated placeholder is intentionally minimal: replace it with the slide's actual composition rather than preserving boilerplate.

For a new visual treatment:

1. Build the composition in the slide source.
2. Extract a local primitive only after the same structure has a second real use.
3. Name shared components for their role (`EvidenceGrid`, `SectionKicker`), not for a generic layout category.
4. Keep the content and metadata literal enough for source inspection and reader navigation.

## Reordering and removal

Use the CLI to preserve registration and folder consistency:

```bash
open-press slide move <id> <position> --press <slug>
open-press slide remove <id> --press <slug>
open-press slide status --press <slug>
```

## Review checklist

- Does every slide communicate one claim at speaking pace?
- Are images, charts, and diagrams legible at presentation distance?
- Is the slide source self-contained and directly editable?
- Are shared components justified by real reuse rather than anticipated reuse?
- Does the active theme provide the spacing and contrast the deck needs?
- Do navigation, slide order, notes, source view, and focus state still behave correctly?

Verify source changes with:

```bash
npm run typecheck
npm test
npm run build
```

For visual work, also run `npm run dev:workspace` and inspect the affected Press in the Workbench before reporting completion.
