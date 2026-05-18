# QDoc v0

QDoc is an AI-first fixed-layout document workspace. It does not decide what a document should look like. It defines how a document is described, checked, rendered, and deployed.

Core ownership:

- Agent owns document decisions.
- QDoc owns boundaries and validation.
- User owns intent, facts, and final approval.

## Purpose

QDoc turns a report workspace into a stable document production system. It gives agents enough freedom to write, structure, and design, while keeping hard delivery boundaries: no missing assets, no broken captions, no unsafe public deployment, and no unverified factual claims.

A typical workspace keeps AI-editable document source under `document/` and runs the React/Vite QDoc app from the repository root:

```txt
document/content/*.md -> engine export -> public/qdoc/document.json -> React/Vite -> dist-react/ -> static host (e.g. Cloudflare Pages)
```

QDoc uses a Node-first pipeline. Daily export/render/preview/PDF/deploy commands go through `engine/cli.mjs`.

## Framework Layer

The first framework layer is intentionally small:

```txt
engine/
  cli.mjs            thin dispatcher
  commands/<name>.mjs
                     one file per CLI command (init / validate / export /
                     render / dev / preview / typecheck / pdf / deploy)
  document-export.mjs
                     content → public/qdoc/document.json export + asset sync
  validation.mjs     Node workspace validation
  static-server.mjs  local static preview server for built output
```

It exports the current report into the root React/Vite workbench and keeps deploy gated through one Node CLI.

Current command surface:

```bash
npm run qdoc:validate
npm run qdoc:export
npm run qdoc:render
npm run qdoc:preview
npm run qdoc:deploy
```

## Workspace Contract

A QDoc workspace may contain:

```txt
.qdoc/
  memory/                  # optional; agent self-managed memory
qdoc.config.mjs            # workspace marker; required
content/
  *.md                     # scanned by filename; frontmatter `kind:` dispatches
                           # cover | toc | chapter (default) | back-cover
design-system/
  *.md                     # peer renderable document about the theme
components/
  <name>/                  # instance-scoped visual units
    component.mjs          # optional renderer; if present, name="<name>"
                           # in markdown invokes it
    schema.json            # optional human-readable contract
    data.json              # default data file
    data.<variant>.json    # optional variants, name="<x>" data="<variant>"
    style.css              # auto-loaded for every <name> directory
    README.md
media/                     # binary assets
theme/
  tokens.css               # CSS variables only
  base/                    # global rules (page contract, typography, print)
  page-surfaces/           # whole-page surfaces routed by frontmatter `kind:`
                           # (cover.css, back-cover.css, toc.css, ...)
  patterns/                # generic class-based shared patterns
                           # (_chart-frame.css, figure-grid.css,
                           # table-utilities.css). _-prefix = partial.
  shell/                   # reader controls; not document typography
spec/qdoc/
  qdoc-v0.md
  create-qdoc-v0.md
engine/                    # CLI + render pipeline
skills/                    # writing/design skills
src/                       # React/Vite reader app
public/qdoc/               # generated; never hand-edit
dist-react/                # generated; never hand-edit
```

The minimum a workspace needs is `qdoc.config.mjs` (acts as the workspace marker) plus the content sources it points to — at minimum a `design-system/` directory (any `*.md` files are accepted; the engine does not enforce a fixed file list, the `qdoc-design` skill recommends a shape) and a `content/` directory containing one or more `*.md` files. Files are scanned by filename order and dispatched by frontmatter `kind:`; document identity (title / subtitle / organization) lives in `qdoc.config.mjs`, not in a manifest file. Skill availability is discovered by walking `skills/` — no `.qdoc/skill-registry.yaml` gate. Everything else is adapter-specific.

A workspace can also nest these directories under one document root (this repo does so):

```txt
document/
  qdoc.config.mjs          # the real config
  content/
  components/
  design-system/
  media/
  theme/
qdoc.config.mjs            # root pointer: { documentDir: "document" }
```

The root `qdoc.config.mjs` only points to `document/qdoc.config.mjs`. Engine, React app, generated output, deployment output, tests, docs, and skills remain at the root.

### Forward-compatible hooks

These are not implemented but the contract should leave room for them:

- **`document/components/_shared/`** — `_`-prefixed directories under `components/` are reserved as "partials": shared data files that more than one component can reference via `<qdoc-component data-src="../_shared/x.json" />`. The engine does not yet resolve `data-src`, but tools that walk `components/` must treat names starting with `_` as non-component.
- **i18n / multi-locale `content/`** — `qdoc.config.mjs:sourceDir` is currently a single path. It is expected to upgrade to `{ <locale>: <path> }` later. Engine code that reads `sourceDir` must not hard-assume single-path semantics indefinitely.
- **Page geometry tokens** — `--qd-page-width / --qd-page-height / --qd-page-margin` live in `theme/tokens.css` and are consumed by `@page`, `.reader-page`, and `print-route.css`. Swapping to Letter / B5 / 16:9 means changing these three tokens only.

## Agent Autonomy

Agents may decide:

- section order, paragraph density, headings, captions, and table shape;
- whether prose should become a figure, table, callout, or chart;
- local style, component composition, and page rhythm;
- which enabled writing and design skills to load;
- whether to create a reusable component recipe or memory note.

Agents must ask the user before:

- adding new material business numbers, legal claims, medical claims, or public commitments;
- changing the target audience or document purpose;
- replacing user-approved facts;
- publishing to a public URL;
- deleting important source material or existing user edits.

## Skill Model

QDoc uses three layers.

1. QDoc Core Skill: orchestration, boundaries, validation, render and deploy gates.
2. QDoc Design/Writing Skills: document-level decisions.
3. Portable Skill Packs: independent writing/design methods that can be loaded anywhere.

`chinese-ai-writing-polish` is portable. QDoc can load it, but should not absorb its rules into QDoc core.

## Component Interface

QDoc components are semantic document units, not app widgets. Markdown invokes them with a single tag:

```md
<qdoc-component name="<slug>" />
<qdoc-component name="<slug>" data="<variant>" />
<qdoc-component name="<built-in-chart>" />   <!-- bar | line | donut -->
```

A component lives in `document/components/<slug>/` and takes one of two shapes:

```txt
# Renderer-based (full)
components/<name>/
  component.mjs        export function render({ attrs, data, helpers }) -> string
  schema.json          optional JSON Schema (human-readable contract today;
                       engine does not validate against it yet)
  data.json            default data file
  data.<variant>.json  optional named variants
  style.css            auto-loaded into the bundle
  README.md            purpose + markdown usage + data shape

# Style-only (minimal)
components/<name>/
  style.css            auto-loaded; class is invoked via <qdoc-component name="..."> (built-in chart) or <figure class="...">
  data.json            optional, only needed if rendered via built-in chart
  README.md
```

Render resolution order in `engine/component-renderer.mjs`:

1. If `document/components/<name>/component.mjs` exists, use it (renderer-based).
2. Else if `data.json` (or the selected variant) declares `chartType: "bar" | "line" | "donut"`, fall back to the engine's built-in chart renderer.
3. Else raise an error.

The render function receives `{ attrs, data, helpers }`. `helpers` provides `escapeHtml`, `escapeAttr`, and `classNames`. The renderer must escape every interpolated value; CSS variable injections (`style="--x: <value>"`) must validate or clamp the value to keep injection out.

The current React/Vite QDoc app lives at the workspace root with source in `src/` and implements the surrounding boundary with:

- `QDocDocument`, `QDocBlock`, `QDocCaption`, and `QDocLayout` TypeScript interfaces;
- automatic figure/table caption numbering inside the renderer;
- `htmlPage` blocks with source markdown mapping;
- fixed-layout page CSS that can be replaced by design skills;
- Vite build output to `dist-react/`.

A typical workspace exports through:

```txt
document/content/*.md -> npm run qdoc:export -> public/qdoc/document.json -> React/Vite workbench
```

This makes the document visible in QDoc without changing the canonical editable source. AI edits should still patch `document/content/*.md` first, then regenerate the QDoc document model.

## Memory Model

QDoc learning is explicit and versionable. A workspace can record:

```txt
.qdoc/memory/
  user-preferences.md
  writing-style-profiles/
  design-style-profiles/
  component-recipes/
```

Memory should summarize reusable decisions, not store hidden model behavior.

Examples:

- "Status table cells use color only, no pill UI and no bold weight."
- "Figure and table captions are bottom-centered."
- "Business report prose should avoid slogan-like contrast sentences."

## Validation Boundary

QDoc validates delivery risks, not taste.

Required checks:

- all enabled skills exist;
- asset paths exist;
- captions and numbering are consistent;
- forbidden overflow is not present in rendered pages;
- PDF render succeeds when PDF output is requested;
- deploy requires user confirmation;
- public output does not contain unresolved placeholders.

QDoc should not fail a document merely because the design is unfamiliar.

## Render And Deploy

Renderers are adapters. They should not define the design language.

Useful adapters:

- browser HTML preview;
- browser HTML-to-PDF;
- Paged.js or Vivliostyle;
- React QDoc workbench with DOM-rendered fixed-layout pages;
- Cloudflare Pages deploy.

For public delivery, keep the React QDoc workbench as the public root and render document pages in QDoc-owned DOM. PDF output may be generated as an export artifact, but the browser's built-in PDF viewer must not replace the central reading surface.

## QDoc v0 Scope

Included:

- core spec;
- skill registry;
- qdoc, qdoc-writing, qdoc-design skills;
- reference contracts;
- `engine` framework package with validate/export/render/preview/deploy/update;
- export adapter from current report content into QDoc JSON;
- Root React/Vite QDoc workbench that displays the current report with source mapping.

Excluded:

- migration of all report files into a new format;
- UI for editing QDoc workspaces;
- replacing the source markdown format.
