---
name: qdoc-design
description: Use when designing or revising QDoc visual systems, page rhythm, print/PDF-safe CSS, figure/table/chart presentation, covers, style packs, or document component recipes.
---

# QDoc Design

QDoc design owns the visual system. It decides how the document looks while keeping fixed-layout, mobile, and PDF output stable.

## Responsibilities

- Choose typography, color, spacing, page rhythm, covers, figures, tables, and chart treatment.
- Edit `document/theme/`, `document/design-system/`, and `document/components/`.
- Decide when dense prose should become a reusable visual component.
- Keep design-system source public-readable so users and agents can review the same rules.
- Preserve React reader output as the public reading surface; PDF is an export artifact.

## Boundaries

- `qdoc` owns CLI command choice, inspect/search/replace, and source/generated boundaries.
- `qdoc-writing` owns claims, prose, audience, and captions as language.
- `qdoc-diagram-drawing` owns diagram semantics; this skill owns visual skin and implementation.
- `qdoc-style-pack-contributor` owns bundled starter pack structure.
- `qdoc-deploy` owns public release.

## Hard Rules

- Do not hand-edit `public/qdoc/`, `dist-react/`, or `.deploy/`.
- Avoid uncontrolled overflow into headers, footers, or fixed pages.
- Do not depend on local-only fonts when public, iPad, or PDF-stable output matters.
- Keep page-surface CSS, generic patterns, and component CSS in their owning layers.

## Workflow

1. Read relevant design-system source before changing theme or components.
2. Edit source CSS/components only.
3. Use `qdoc` to choose validation depth.
4. For renderer-sensitive changes, run render or inspect the local QDoc workbench before declaring the design ready.

## When To Read References

- Read `references/theme-and-components.md` before moving CSS layers, extracting components, changing design-system source, or localizing page-surface defaults.
- Read `references/pdf-safe-css.md` before changing fixed page geometry, print behavior, or overflow-sensitive CSS.
- Read `references/responsive-fixed-layout.md` before changing mobile, tablet, zoom, spread, or responsive behavior.
