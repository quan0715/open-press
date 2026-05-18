---
name: qdoc
description: Use when working in a QDoc or QDoc-like fixed-layout document workspace, especially when coordinating writing skills, design skills, validation, rendering, PDF output, or Cloudflare Pages deployment. QDoc owns boundaries and validation, not document aesthetics.
---

# QDoc Core Skill

QDoc is the orchestration layer for AI-first fixed-layout documents.

不要規定文件美學. The agent owns document and style decisions inside the workspace boundaries.

## Ownership

- Agent owns document decisions.
- QDoc owns boundaries and validation.
- User owns intent, facts, and final approval.

## Workflow

1. Discover the workspace by walking up from the current path until `qdoc.config.mjs` is found; infer additional context from existing `document/content/`, `document/theme/`, `engine/`, `src/`, and `skills/`.
2. Browse `skills/` for available skills, read each `SKILL.md` description, and load the ones whose description matches the user's task. There is no registry file gating which skills are "enabled" — discovery is by directory.
3. Identify the user request type: writing, design, structure, render, deploy, or validation.
4. Let the responsible skill make content or style decisions.
5. Run project validation before claiming completion.
6. Ask for explicit confirmation before public deploy or high-risk factual changes.

## Boundaries

QDoc may enforce:

- source files and assets exist;
- captions and numbering remain consistent;
- fixed-layout pages do not overflow;
- render and PDF output complete;
- deployment uses the configured adapter and has user approval.

QDoc must not enforce:

- a fixed visual theme;
- a fixed writing voice;
- a single component library;
- a single renderer backend.

## Q Dock MVP

Q Dock has three local workspaces:

- Document: render the current `document/content/` output.
- Design System: render `document/design-system/*.md` itself as a small public-readable QDoc preview document, backed by `document/theme/`.
- Project: inspect `document/content/`, `document/components/`, and `document/media/` inventory. Agent command helpers are deferred to a later phase and should not appear in the UI.

Do not use hard-coded React sample pages for Design. Design preview content should come from `document/design-system/Design.md`, `style-brief.md`, `tokens.md`, `components.md`, and `preview-scale.md`, then be exported into `/qdoc/design-system.json` as `previewDocument`. These files are one Design System Document shared by User preview and Agent style instructions, so future agents should read the focused chapter they need instead of expecting a second private design brief.

If the main `document/content/` is missing, empty, or too thin to preview a style, ask the user for document purpose, audience, and output target when needed, then generate normal starter files in `document/content/`.
Do not create a permanent second preview document source for main content; `document/content/` remains the canonical document source.

## Starter Document Generation

Read `spec/qdoc/usage.md` when creating or repairing initial QDoc content.

The default starter document is a complete A4 document, not a component gallery:

- `document/content/*.md` scanned by filename order; each file's frontmatter `kind:` dispatches to the right renderer
- cover page: `kind: cover` (frontmatter `title:` becomes the cover heading; engine falls back to `"Cover"` if absent)
- TOC page: `kind: toc` (engine fills the entries; frontmatter `title:` becomes the TOC heading, fallback `"Contents"`)
- two chapter files: `kind: chapter` (or omit `kind:`; chapter is the default). `chapter` and `slug` frontmatter are optional — engine auto-numbers and derives slug from filename when missing
- back cover: `kind: back-cover` (frontmatter `title:` fallback `"End"`)

Document identity (title / subtitle / organization) lives in `qdoc.config.mjs`, not in content frontmatter.

Use this starter shape when the user asks whether QDoc can generate a cover, table of contents, chapter content, and back cover. Keep normal report source in `document/content/`; keep Design Preview source in `document/design-system/*.md`; do not create sample documents under `public/qdoc/`, `dist-react/`, or the React workspace.

`document/components/<name>/` is the home for **every inline visual unit**. Each package is self-contained: data, style, optional renderer, docs — all under one directory named after the visual. The markdown call is always `<qdoc-component name="<package>" />`; the engine resolves data + renderer from inside that directory.

Two shapes:

**Workspace renderer** — the package has a `component.mjs`:

```txt
document/components/<name>/
  component.mjs              render({ attrs, data, helpers }) -> HTML string
  schema.json                JSON Schema for data.json (additionalProperties: false)
  style.css                  component-scoped CSS; auto-loaded by engine
  README.md                  purpose + markdown usage + data field reference
  data.json                  default instance data
  data.<variant>.json        optional, used when markdown passes `data="<variant>"`
```

The renderer must escape every interpolated value via `helpers.escapeHtml` / `helpers.escapeAttr`, and `style="--var: <value>"` interpolations must validate the input (clamp to a percent or whitelist `var(--token)` forms) to keep CSS injection out.

**Built-in chart** — the package has no `component.mjs`; `data.json` declares one of the engine's built-in `chartType` values (`bar`, `line`, `donut`). The engine delegates to `src/qdoc/chartRenderer.js`:

```txt
document/components/<name>/
  data.json                  required; must include "chartType": "bar|line|donut"
  style.css                  variant CSS (class hooks: chart-frame qdoc-chart qdoc-chart--<type> <name>)
  README.md                  what the variant is and where markdown calls it
```

Use this for chart variants (`cost-donut`, `exam-feedback`, `revenue-line-chart`) and for named figure treatments that belong to a single concept (`field-validation-figure`). Do not put one-off styles under `document/theme/patterns/` — that layer is reserved for shared patterns (`_chart-frame`, `figure-grid`, `table-utilities`) that any chapter can invoke.

When to extract a component:

- The block has structured sub-elements (stages, layers, phases, rows) that map cleanly to JSON.
- The block is reused with different data, or it is a single-use bespoke layout that would otherwise stay as a large inline HTML island.

When NOT to extract:

- Image grids and other layouts whose break/page behavior is owned by the reader pagination runtime — leave them inline so pagination keeps its freedom.
- Generic markdown patterns already supported by tables, lists, figures, or built-in chart packages (`<qdoc-component name="<chart-package>" />` where the package's `data.json` declares `chartType: bar|line|donut`).
- Page-surface foundations like `cover` and `back-cover`, until the design system extracts those as a coordinated batch.

QDoc engine only loads and statically expands this contract; document-specific component decisions should not move into `engine/` or `src/qdoc/`.

After content, component, media, or design edits, run:

```bash
npm run qdoc:export
npm run qdoc:validate
```

## When To Read References

- Read `references/workspace-contract.md` when setting up or checking a workspace.
- Read `references/validation-contract.md` before adding validation or declaring output safe.

## Workspace Adapter

A QDoc workspace uses this layout:

```txt
document/content/*.md
document/components/<name>/{component.mjs, schema.json, style.css, README.md, data.json}
document/theme/
document/design-system/
document/media/
engine/                  # framework
src/                     # workbench React app
dist-react/              # generated; do not hand-edit
.deploy/<project>/       # deployment staging
```

Use the Node QDoc CLI and root React/Vite QDoc app for export, preview, render, PDF, and deploy.

## Current QDoc Commands

Use npm scripts backed by `engine/cli.mjs` as the stable interface:

```bash
npm run qdoc:validate
npm run qdoc:export
npm run qdoc:render
npm run qdoc:preview
npm run qdoc:deploy
```

Default render/preview uses the root React/Vite QDoc workbench.

`npm run qdoc:export` creates `public/qdoc/document.json` from `document/content/*.md` and preserves source mapping for AI edits. Treat `document/content/*.md` as canonical; generated JSON and generated HTML should not be hand edited.

Prefer `engine/cli.mjs` for automation.
