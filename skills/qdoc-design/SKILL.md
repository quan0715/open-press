---
name: qdoc-design
description: Use when designing or revising QDoc visual systems, page rhythm, print/PDF-safe CSS, figure/table/chart presentation, covers, style packs, or document component recipes. The agent should keep high design autonomy while respecting QDoc validation boundaries.
---

# QDoc Design Skill

Agent 擁有設計決策權. QDoc design work should be expressive, document-appropriate, and stable in fixed-layout output.

## Design Freedom

You may decide:

- typography, spacing, color, rhythm, and page composition;
- figure, table, chart, cover, and back-cover treatment;
- whether to reuse a style pack or create a local component recipe;
- when to turn dense prose into a visual component.

Do not ask the user for every style detail. Ask only when the change affects brand identity, public claims, or a user-approved visual direction.

## Hard Boundaries

Every design must remain PDF-safe:

- no uncontrolled overflow into header/footer;
- no viewport-only sizing for fixed-format content;
- no missing fonts or assets;
- portable typography pairs `document/theme/tokens.css` font tokens with `document/theme/fonts.css` font loading; do not depend on local system fonts when device-stable output matters;
- captions remain readable and connected to their figures/tables;
- public output should preserve the React QDoc workbench shell and QDoc-owned DOM reader;
- PDF output may be an export artifact, but do not embed the browser PDF viewer as the main reading surface.

## Style Packs

Style packs are starting points, not cages. A pack may provide:

- tokens;
- component CSS;
- layout recipes;
- examples;
- checklist items.

The agent may override pack values unless the workspace registry marks a rule as locked.

When creating or reviewing a bundled style pack under `skills/<pack>/`, also use `qdoc-style-pack-contributor` if present. That skill owns the contributor contract: one visual philosophy per pack, runnable `starter/`, public-readable design-system docs, and validation through a copied workspace.

## Design System Workspace

When a user asks for a document style, produce design decisions in `document/design-system/` and implement the usable style in `document/theme/`.

Use the theme layers by responsibility:

- `document/theme/tokens.css`: variables only; colors, font families, type scale, spacing, chart colors, and shared numeric tokens.
- `document/theme/fonts.css` and `document/theme/fonts/`: optional font-face source copied to `/qdoc/fonts.css` and `/qdoc/fonts/`; use for webfont imports or self-hosted font files.
- `document/theme/base/`: global document rules such as page contract, global typography (headings, paragraphs, lists, figures, tables, captions, TOC), and print safeguards. Keep this layer free of page-surface or component-specific selectors.
- `document/theme/page-surfaces/`: full-page surfaces like `cover.css`, `back-cover.css`, and `toc.css`. These describe a whole-page layout that the engine routes by `kind:` frontmatter (`renderCover` / `renderBackCover` / `renderToc`), not a markdown block invoked by class name. Add a new file here when a new page kind is introduced (e.g. `divider.css` for a chapter separator), and register it in the engine's `REPORT_CSS_LAYERS`.
- `document/theme/patterns/`: **generic, document-wide visual patterns** that any chapter can invoke by class name without a renderer. Current files are `_chart-frame.css` (frame around every chart), `figure-grid.css` (image grid + triptych variant), and `table-utilities.css` (`.numeric`, `.savings-rate`, etc). Do not park one-off chart variants, one-off figure treatments, or any instance-scoped CSS here.
- `document/theme/shell/`: exported reader controls around the document. Do not put document typography or content component styles here.
- `document/components/<name>/style.css`: instance-scoped CSS. The engine auto-loads `style.css` from every subdirectory regardless of whether `component.mjs` is present, so this directory hosts both:
  - **Workspace renderer components** invoked by `<qdoc-component name="<name>" />` whose package directory contains a `component.mjs` — full layout `component.mjs` + optional `schema.json` + `style.css` + `README.md` + `data.json` (+ `data.<variant>.json` for reuse).
  - **Style-only components** invoked by `<qdoc-component name="<name>" />` whose package has no `component.mjs` (engine reads `data.chartType` and delegates to a built-in renderer) or by a bare `<figure class="<name>">` — keep `style.css` + `README.md` (+ `data.json` for chart packages). Use this shape for chart variants and named figure treatments that belong to a single concept.
  Never keep a same-named copy in `theme/patterns/`; duplicate rules will fight each other.

Do not place page-surface or component-specific CSS in `base/typography.css`. If a selector exists only for one page surface, it belongs in `theme/page-surfaces/`; if it exists only for one specimen, chart, grid, or reusable block, it belongs in `theme/patterns/` (class-based) or beside its `<qdoc-component>` (renderer-based). The engine's `REPORT_CSS_LAYERS` decides bundle order — page surfaces are loaded after `base/typography.css` and before `shell/reader-controls.css`, so they can override defaults without fighting reader chrome.

### When inline HTML becomes a `<qdoc-component>`

When you find a structured inline HTML block in a markdown source file (chart-frame variants, specimen lists, roadmap timelines, layered diagrams), prefer extracting it into a four-file component:

```txt
document/components/<name>/
  component.mjs   render({ attrs, data, helpers }) -> HTML string
  schema.json     JSON Schema for the data file
  style.css       component-scoped CSS, auto-loaded by the engine
  README.md       purpose, markdown usage, data field reference
```

Each inline visual lives in its own `document/components/<name>/` directory: `data.json` (instance data), `style.css` (component CSS), and optionally `component.mjs` + `schema.json` for a workspace renderer. Built-in chart packages (`bar` / `line` / `donut`) omit `component.mjs` and rely on `data.json`'s `chartType` field. Markdown becomes a single line: `<qdoc-component name="<package>" />` (or `data="<variant>"` to pick `data.<variant>.json` for reuse with different content). After moving the CSS rules into the new `style.css`, delete the same-named file from `theme/patterns/`.

Extract when the block has structured sub-elements (stages, layers, phases, rows) that map cleanly to JSON, or when the same block reappears with different data. Leave inline when the block is an image grid whose page-break behavior must stay under pagination control, or when it is a foundational page surface (`cover` / `back-cover`) waiting for a coordinated extraction.

The Design workspace is a document-style workspace. It should have source files, not hard-coded React sample content. The engine does not enforce a fixed file list — any `*.md` in `document/design-system/` is scanned, ordered by frontmatter `kind` (`cover` → `chapter` → `back-cover`) and `chapter` number, and rendered into the Design System Document. Add, remove, rename, or split files as the project demands.

Recommended starting shape (used by the showcase template):

- `Design.md` — `kind: cover`, entry point and style positioning for this Design System Document.
- `style-brief.md` — `kind: chapter`, chapter 1, goals, audience, use cases, user/agent roles.
- `tokens.md` — `kind: chapter`, chapter 2, typography scale, color tokens, spacing, CSS ownership.
- `components.md` — `kind: chapter`, chapter 3, page surfaces, text components, tables, figures, chart rules.
- `design-checklist.md` — `kind: back-cover`, review checklist for User and Agent.

Project-specific extensions are encouraged when they help the document: `motion.md`, `voice.md`, `accessibility.md`, `localization.md`, brand-specific chapters, etc. Use frontmatter `chapter: N` to control order; files without a chapter number sort alphabetically after numbered ones within the same kind. A workspace can also keep just `Design.md` if that is enough for the project.

Treat the design Markdown files themselves as one Design System Document. User preview and Agent design source are the same files; do not maintain a separate hidden brief, token gallery, or `document/design-system/demo/` source tree unless the user explicitly asks for a separate sandbox. The Design workspace live panel should use the preview document's bookmarks and current-page state, just like the main document workspace.

Agents may read focused chapters instead of loading the whole design system: pick the chapters whose frontmatter `slug` or `title` matches the current task (intent / tokens / components / checklist).

`tokens.md` should pair precise tables with visual specimens. Typography specimens show token name, numeric spec, and rendered sample in rows; color specimens show swatch cards with token name, hex value, and usage. Keep these specimens inside the same Design System Document so User review and Agent instructions stay aligned.

The user-facing review surface is visual and public-readable. Prefer this generated preview document over a categorized token gallery. The preview should show realistic generated content surfaces together:

- typography hierarchy;
- typography scale;
- cover, table of contents, chapter opening, and back cover direction when relevant;
- paragraphs, lists, quotes, and callouts;
- single image, image grid, and chart treatment with captions;
- table density and numeric emphasis;
- long heading, long caption, wide table, and dense paragraph stress cases.

The Design Preview can also explain how QDoc helps users generate documents. This is useful because the page lets users judge both the design style and the document-generation concept. Keep the prose coherent and user-facing: explain source files, cover, TOC, chapters, figures, tables, bookmarks, and export behavior as part of one readable document.

The preview and the real document must share the same `document/theme/` implementation. Do not create a second style system. Design Preview content lives in `document/design-system/*.md`; it must not replace the canonical report source under `document/content/`.

## Localization Defaults

QDoc engine does not embed language-specific text. Three knobs control how a document presents itself in any language:

**Page-surface titles (cover / toc / back-cover).** The engine reads `title:` from each page's frontmatter and uses it for both the visible heading and `data-page-title`. When the field is absent, the fallback is the English string `Cover` / `Contents` / `End`. A Chinese document writes `title: 目錄` etc. in `01-toc.md` to override. There is no language-aware logic in the engine itself.

**Chapter and section numbering.** Pagination assigns raw arabic counters on every chapter h2 and section h3:

```html
<h2 id="section-02" data-chapter="02">問題洞察…</h2>
<h3 data-section="2.1">核心痛點…</h3>
```

The theme's `::before` rules decide how these counters appear. The default theme (`document/theme/base/typography.css`) shows them as `02` / `2.1` via `content: attr(data-chapter)` / `attr(data-section)`. Switching to `一、二、（一）（二）` or `Chapter 1 / §1.1` is a theme-level edit using `@counter-style` — engine, markdown, and pagination stay untouched. See `document/design-system/tokens.md` → "Chapter & Section Numbering" for worked examples.

**UI chrome strings inside the React workbench.** A few labels (loading state, default project workspace title) still embed Chinese text in `src/qdoc/`. Those are application UI rather than document output, and live outside the document-style boundary; treat them as engine concerns to surface upstream when needed.

When you onboard a non-Chinese document, audit:

- frontmatter `title:` on every cover / toc / back-cover page;
- `theme/tokens.css` `--qd-font-serif` / `--qd-font-body` font stacks;
- `theme/base/typography.css` `::before content` for chapter / section numbering style.

The agent owns these decisions on a per-document basis. Do not pin a single numbering style or font family into the design skill itself.

## When To Read References

Read `references/pdf-safe-css.md` before changing renderer-sensitive CSS or fixed-layout document geometry.
Read `references/responsive-fixed-layout.md` before changing mobile, tablet, zoom, spread, or responsive behavior.
