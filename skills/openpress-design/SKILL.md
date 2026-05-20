---
name: openpress-design
description: Use when designing or revising open-press visual systems, page rhythm, print/PDF-safe CSS, figure/table/chart presentation, covers, style packs, or document component recipes.
---

# open-press Design

open-press design owns the visual system. It decides how the document looks while keeping fixed-layout, mobile, and PDF output stable.

## Responsibilities

- Choose typography, color, spacing, page rhythm, covers, figures, tables, and chart treatment.
- Edit `document/theme/`, `document/design.md`, and `document/components/`.
- Decide when dense prose should become a reusable visual component.
- Keep `document/design.md` public-readable so users and agents can review the same rules.
- Preserve React reader output as the public reading surface; PDF is an export artifact.

## Boundaries

- `qdoc` owns CLI command choice, inspect/search/replace, and source/generated boundaries.
- `openpress-writing` owns claims, prose, audience, and captions as language.
- `openpress-diagram-drawing` owns diagram semantics; this skill owns visual skin and implementation.
- `openpress-style-pack-contributor` owns bundled starter pack structure.
- `openpress-deploy` owns public release.

## Hard Rules

- Do not hand-edit `public/qdoc/`, `dist-react/`, or `.deploy/`.
- Avoid uncontrolled overflow into headers, footers, or fixed pages.
- Do not depend on local-only fonts when public, iPad, or PDF-stable output matters.
- Keep page-surface CSS, generic patterns, and component CSS in their owning layers.

## Workflow

1. Read `document/design.md` before changing theme or components.
2. Edit source CSS/components only.
3. Use `qdoc` to choose validation depth.
4. For renderer-sensitive changes, run render or inspect the local open-press workbench before declaring the design ready.

## When To Read References

- Read `references/theme-and-components.md` before moving CSS layers, extracting components, changing `document/design.md`, or localizing page-surface defaults.
- Read `references/pdf-safe-css.md` before changing fixed page geometry, print behavior, or overflow-sensitive CSS.
- Read `references/responsive-fixed-layout.md` before changing mobile, tablet, zoom, spread, or responsive behavior.
