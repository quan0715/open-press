---
name: openpress-design
description: Use when designing or revising open-press visual systems, page rhythm, print/PDF-safe CSS, figure/table/chart presentation, covers, style packs, or document component recipes.
---

# open-press Design

open-press design owns the **workspace visual system** — the CSS and components that live in a user's `document/` after a pack has been initialized. It decides how the document looks while keeping fixed-layout, mobile, and PDF output stable.

## Responsibilities

- Choose typography, color, spacing, page rhythm, covers, figures, tables, and chart treatment.
- Edit `document/theme/`, `document/design.md`, and `document/components/` in a workspace.
- Decide when dense prose should become a reusable visual component.
- Keep `document/design.md` public-readable so users and agents can review the same rules.
- Preserve React reader output as the public reading surface; PDF is an export artifact.

## Boundaries (by path, not by topic)

| Path | Owner |
| --- | --- |
| `document/theme/`, `document/components/`, `document/design.md` (workspace) | **this skill** |
| `skills/<pack>/starter/document/theme/`, `…/components/`, `…/design.md` (upstream pack) | `openpress-style-pack-contributor` |
| Framework runtime / workbench code | framework agents only; see `openpress` > Source Boundary |

Other domain skills:

- `openpress-writing` owns claims, prose, audience, and captions as language.
- `openpress-diagram-drawing` owns diagram semantics; this skill owns visual skin.
- `openpress-deploy` owns public release.

Source paths follow `openpress` > Source Boundary.

## Hard Rules

- Avoid uncontrolled overflow into headers, footers, or fixed pages.
- Do not depend on local-only fonts when public, iPad, or PDF-stable output matters.
- Keep page-surface CSS, generic patterns, and component CSS in their owning layers.

## Workflow

1. Read `document/design.md` before changing theme or components.
2. Edit source CSS/components only (see `openpress` > Source Boundary).
3. Use `openpress` to choose validation depth.
4. For renderer-sensitive changes, ask `openpress` which render/inspect/local-review verification is needed before declaring the design ready.

## When To Read References

- Read `references/theme-and-components.md` before moving CSS layers, extracting components, changing `document/design.md`, or localizing page-surface defaults.
- Read `references/pdf-safe-css.md` before changing fixed page geometry, print behavior, or overflow-sensitive CSS.
- Read `references/responsive-fixed-layout.md` before changing mobile, tablet, zoom, spread, or responsive behavior.
