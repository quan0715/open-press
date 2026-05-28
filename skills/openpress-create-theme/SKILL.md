---
name: openpress-create-theme
description: Use when the user wants to create a new theme, refine an existing theme, change brand colors / fonts / spacing, set up a visual identity for a document, or invokes /create-theme. Handles only document/theme/ — does not change content, components, or page geometry.
---

# open-press Create Theme SOP

Build or refresh `document/theme/` from a brand intake. The output is a fully populated theme folder following the [directory contract](../openpress-design/references/theme-and-components.md). This skill only touches `document/theme/`; everything else (content, components, page geometry) is out of scope.

## 0. Workspace Preflight

Confirm the workspace exists:

```bash
test -f document/index.tsx && test -d document/theme || echo "NOT_OPENPRESS_WORKSPACE"
```

If the workspace is missing, route to `openpress-init` / `/create-document` first.

## 1. Intake

Ask the user (one batch) for:

- **Brand colors** — at minimum a primary ink (foreground) and an accent. Hex values; `#1a1a1a` / `#2563eb` style.
- **Fonts** — body font, optional display font. Either Google Fonts names, CSS-safe family stacks, or "system default".
- **Content type** — one of `long-form` (A4 report / book / paper), `brief` (memo / proposal), `slide` (16:9 deck), `social` (1080 square). Determines the base preset.
- **Visual reference** (optional) — URL or description of a target aesthetic.

If the user already provided some answers, extract them and only ask for the missing items.

## 2. Base Preset

Pick the closest bundled pack's theme as the structural base:

| Content type | Base preset |
| --- | --- |
| `long-form` | `editorial-monograph` |
| `brief` | `claude-document` |
| `academic` | `academic-paper` |
| `slide` | `slide-deck` |
| `social` | `social-post` |

If the user wants a fully custom layout (rare), keep the long-form base and document the customizations clearly.

## 3. Generate Theme Files

Write the following into `document/theme/`:

1. `tokens.css` — populate from intake:
   - `--op-ink`, `--op-ink-strong` (from primary color)
   - `--op-paper`, `--op-paper-soft` (default to `#fff` / `#fafafa` unless brand dictates otherwise)
   - `--op-accent` (from intake)
   - `--op-hairline`, `--op-hairline-strong`
   - `--op-font-body`, `--op-font-display`, `--op-font-mono`
   - Type scale: `--op-text-xs` through `--op-text-4xl`
   - Spacing scale: `--op-space-1` through `--op-space-12`
2. `fonts.css` — `@font-face` blocks if user supplied custom webfont URLs; otherwise leave with a comment "system fonts only".
3. `base/page-contract.css`, `base/typography.css`, `base/print.css` — required floor. Copy from the chosen base preset and adjust only what the intake dictates.
4. `page-surfaces/` — copy the base preset's cover / toc / back-cover stubs. Don't synthesize new role files until the user asks.
5. `patterns/` — copy only if content type is `long-form` or `academic`. `slide` and `social` skip this folder entirely.
6. `shell/reader-controls.css` — leave empty unless the user asked for workbench chrome overrides.

Reference the [theme contract](/docs/themes) for required vs optional files.

## 4. Page Geometry

**Not this skill's job.** If the intake reveals a non-standard page size, tell the user it lives in `openpress.config.mjs`'s `page` field (see [Workspace config → Page geometry](/docs/config#page-geometry)) and do not modify CSS to set page dimensions. Geometry comes through the engine-injected `--openpress-page-*` variables.

## 5. Verify

```bash
npm run dev
```

Ask the user to open the workbench URL and confirm:

- Cover renders with the new brand colors and fonts.
- Body text is legible at the page geometry.
- No fonts fall back to system serif unexpectedly.

If the user is unhappy with a token value, edit `tokens.css` and reload — no rebuild needed for pure CSS changes.

## 6. Handoff

Report:

- which base preset was used,
- list of token values written,
- which optional folders were created (`page-surfaces/`, `patterns/`),
- next paths the user can edit directly: `document/theme/tokens.css`, `document/theme/base/typography.css`,
- next skill to route to if they want layout or component changes: `openpress-design`.

## Boundary

- Edit only files under `document/theme/`.
- Never set page dimensions in CSS — that's `openpress.config.mjs`.
- Never touch `document/components/` or `document/chapters/`.
- Never delete an existing theme without explicit user confirmation; back up to `document/theme.bak/` if a reset is requested.
- Route to `openpress-design` for advanced layout (figure grids, multi-column, custom page surfaces beyond cover/toc).

## Do Not

- Do not invent token names outside the `--op-` / `--openpress-` namespace.
- Do not write `@media print` rules that override the engine's print contract.
- Do not generate `patterns/` files unless the document actually uses utility classes.
- Do not deploy or build before the user confirms the visual in the workbench.
