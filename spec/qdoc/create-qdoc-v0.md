# create-qdoc v0

## Purpose

`create-qdoc` initializes a package-managed QDoc document workspace in an empty folder.

The initialized project should feel like a stable human-AI collaboration environment for long-form documents, not a QDoc engine development checkout. Users should be able to open a new folder, initialize QDoc, and ask an AI agent to edit the document immediately.

Target first-run flow:

```bash
npm create qdoc@latest my-document
cd my-document
npm install
npm run dev
```

The user then works with the AI inside `my-document/`, where the editable surfaces are intentionally small and explicit.

## Product Positioning

QDoc project is an AI-editable document workspace.

QDoc engine is package-managed infrastructure.

This distinction is the core v0 decision. The default initialized project should not include the QDoc engine source files such as `src/qdoc/`, `engine/`, Chrome PDF internals, pagination internals, or deploy adapter source. Those live in packages and are treated as tools.

The initialized folder should focus the AI on:

- document writing in `content/`;
- image and file assets in `media/`;
- user-level visual customization in `theme/`;
- project-level metadata in `qdoc.config.mjs`;
- workspace instructions in `AGENTS.md`.

## Recommended Architecture

Use package-managed workspace by default:

```txt
my-document/
  AGENTS.md
  README.md
  package.json
  qdoc.config.mjs

  content/
    # files scanned by filename order
    00-cover.md
    01-what-qdoc-makes-possible.md
    02-ai-collaboration-workflow.md
    03-long-form-document-structure.md
    04-visual-components.md
    05-style-and-branding.md
    06-export-and-publish.md
    99-back-cover.md

  design-system/
    Design.md              # kind: cover
    style-brief.md         # kind: chapter, chapter 1
    tokens.md              # kind: chapter, chapter 2
    components.md          # kind: chapter, chapter 3
    design-checklist.md    # kind: back-cover

  components/
    <name>/
      style.css            # required; auto-loaded by engine
      data.json            # optional (default data)
      data.<variant>.json  # optional named variants
      component.mjs        # optional renderer (full shape)
      schema.json          # optional contract (full shape)
      README.md            # required for any non-empty component

  media/
    README.md

  theme/
    README.md
    tokens.css             # CSS variables only, incl. page-geometry tokens
    base/                  # page-contract / typography / print
    page-surfaces/         # cover.css / back-cover.css / toc.css
    patterns/              # _chart-frame.css / figure-grid.css / table-utilities.css
    shell/                 # reader-controls.css
```

Notes:

- There is no top-level `data/` directory. Data co-locates inside each component's directory.
- `theme/page-surfaces/` is an open category — add a new `<kind>.css` when introducing a new page kind (and register it in the engine's `REPORT_CSS_LAYERS`).
- `theme/patterns/` is reserved for generic, document-wide class patterns. Per-instance chart variants and one-off figure treatments live under `components/<name>/` as style-only components instead.

Runtime and engine code come from packages:

```txt
node_modules/@qdoc/cli
node_modules/@qdoc/core
node_modules/@qdoc/react
```

The package split can evolve, but the user-facing contract should stay the same: workspace source remains small, generated artifacts remain ignored, and QDoc internals remain outside normal AI edit scope.

## Init Experience

`qdoc init` (or `npm create qdoc@latest` once the create-qdoc wrapper ships) initializes a new workspace by copying a **style pack starter** into the target directory.

Non-interactive:

```bash
qdoc init my-document                              # default style pack
qdoc init my-document --skill editorial-monograph  # explicit
```

Interactive (planned, not yet implemented):

```txt
Which style do you want to start from?

> editorial-monograph (default) — quiet, hairline-driven A4 monograph
  pitch-deck                    — 16:9 slide style
  poster                        — large-format one-sheet
```

Local development commands after initialization:

```bash
npm install
npm run dev
npm run qdoc:validate
npm run qdoc:pdf
```

## Style Packs

A style pack is a skill that doubles as a workspace starter. Every style pack lives in `skills/<name>/` and contains:

```txt
skills/<style-pack>/
  SKILL.md         frontmatter declares `kind: style-pack`; body describes
                   when to use this pack, visual signature, do/don't, how
                   `qdoc init` should apply it.
  starter/         a complete workspace skeleton that `qdoc init` copies:
    qdoc.config.mjs     # placeholder title / subtitle / organization
    content/            # cover + toc + sample chapter + back-cover
    design-system/      # Design / style-brief / tokens / components / checklist
    theme/              # tokens.css + base/ + page-surfaces/ + patterns/ + shell/
    components/         # any examples (type-specimen, token-swatch-grid, …)
    media/              # README + sample assets (or empty)
```

`SKILL.md` frontmatter:

```yaml
---
name: <style-pack-slug>
description: One-line summary used in init prompts and registry hints.
---
```

Style-pack detection is **structural**: a skill is treated as a style pack iff it has a `starter/` subdirectory. `engine/init.mjs` discovers available packs by scanning `skills/*/starter/`; there is no `kind:` field to maintain and no central registry. The skill's body should describe when to use the pack, its visual signature, do/don't rules, and how `qdoc init` should apply it.

### First-party style packs

| Style pack | Status | Designed for |
| --- | --- | --- |
| `editorial-monograph` | shipped (v0 default) | A4 monographs, proposals, whitepapers, research reports |
| `pitch-deck`          | planned              | 16:9 slide-style decks |
| `poster`              | planned              | single-sheet posters / one-pagers |

### Adding a new style pack

1. Create `skills/<name>/SKILL.md` with the frontmatter above.
2. Build the `starter/` subtree. The minimum-viable starter must pass `qdoc validate` and `qdoc export` after `init`.
3. Document the pack's visual rules inside `starter/design-system/*.md` (so the rules ship with the workspace and become editable by the user, not buried inside the skill).
4. `qdoc init <target> --skill <name>` will pick it up automatically.

### What `editorial-monograph` provides

Out of the box after `qdoc init my-document --skill editorial-monograph`, the new workspace runs:

```bash
npm run qdoc:validate    # passes immediately
npm run qdoc:export      # produces a 4-page document (cover / toc / 1 chapter / back-cover)
npm run qdoc:pdf         # produces an A4 PDF
npm run dev              # serves the workbench
```

This gives the agent a valid, fully-styled structure to start editing before the user has written a single word.

## AI Collaboration Contract

Every initialized project must include an `AGENTS.md` that narrows the AI's default edit scope.

Required guidance:

```txt
You may edit:
- content/
- media/
- theme/
- qdoc.config.mjs

Do not edit:
- node_modules/
- public/qdoc/
- dist/
- .deploy/
- generated PDF files

Use:
- npm run dev
- npm run qdoc:validate
- npm run qdoc:pdf
```

`AGENTS.md` should also say:

- `content/` is the canonical document source.
- `public/qdoc/` is generated output.
- `theme/` is user-level styling. Keep variables in `tokens.css`, global document rules in `base/`, named Markdown/HTML patterns in `components/`, and exported reader chrome in `shell/`.
- QDoc engine internals are managed by packages.
- Ask the user before public deploy, deleting source material, or changing factual claims.

This is the mechanism that prevents AI attention from drifting into engine implementation.

## Workspace Files

### package.json

The initialized `package.json` should expose stable scripts:

```json
{
  "scripts": {
    "dev": "qdoc dev",
    "build": "qdoc render",
    "qdoc:validate": "qdoc validate",
    "qdoc:export": "qdoc export",
    "qdoc:render": "qdoc render",
    "qdoc:preview": "qdoc preview",
    "qdoc:pdf": "qdoc pdf",
    "qdoc:deploy": "qdoc deploy"
  },
  "dependencies": {
    "@qdoc/cli": "latest"
  }
}
```

Package names can change before publish, but script names should remain stable.

### qdoc.config.mjs

Configuration uses generic defaults; project-specific names go in user-edited fields:

```js
export default {
  title: "My QDoc Document",
  sourceDir: "content",
  mediaDir: "media",
  themeDir: "theme",
  outputDir: "dist",
  publicDir: "public/qdoc",
  pdf: {
    filename: "document.pdf"
  },
  deploy: {
    adapter: "cloudflare-pages",
    projectName: null,
    requiresConfirmation: true
  }
};
```

Defaults should work without deploy configuration.

### README.md

The initialized README should be short and operational:

```txt
npm install
npm run dev
npm run qdoc:validate
npm run qdoc:pdf
```

It should explain what to edit first:

- edit `content/` for writing;
- add images to `media/`;
- adjust `theme/` for document styling;
- ask an AI agent to use `AGENTS.md`.

### .gitignore

Initialized projects should ignore generated and private deployment artifacts:

```gitignore
node_modules/
dist/
dist-react/
public/qdoc/
.deploy/
.qdoc/tmp/
*.pdf
```

Starter `content/`, `media/`, `data/`, `theme/`, `AGENTS.md`, `README.md`, `package.json`, and `qdoc.config.mjs` should be committed.

## Privacy Model

Public QDoc package and templates must not include private user documents.

Private project content (own report, proposal, whitepaper) should never be published as a starter. Style packs that ship in `skills/<pack>/starter/` must use generic placeholder content; private text and assets stay in the downstream workspace's gitignored `document/`.

Recommended separation:

```txt
qdoc-engine-public/
  packages/
  skills/
    <style-pack>/SKILL.md
    <style-pack>/starter/      # what `qdoc init` copies

<consumer-private>/
  document/content/
  document/media/
  document/theme/
  qdoc.config.mjs
```

Private documents can depend on public QDoc packages without exposing their content.

## Generated Artifacts

Generated output should be reproducible and ignored by default:

```txt
public/qdoc/
dist/
dist-react/
.deploy/
*.pdf
```

The public package should provide commands to regenerate them. AI agents should not hand-edit them.

## Eject

`qdoc eject` is not part of v0.

An eject command is useful later as an advanced escape hatch, but it should not shape the first user experience. v0 should prove that normal document work can happen without exposing QDoc engine internals.

## v0 Acceptance Criteria

```bash
qdoc init ./scratch-doc --skill editorial-monograph
cd scratch-doc
npm install
npm run dev
npm run qdoc:validate
npm run qdoc:pdf
```

An initialized project must:

- open a working local QDoc UI;
- expose clear AI collaboration boundaries in `AGENTS.md`;
- keep editable files limited to document-level sources;
- generate a local PDF through the single QDoc PDF path;
- contain no private project text or private media in shipped templates;
- avoid requiring users to edit engine source code.

## Non-Goals

v0 does not include:

- `qdoc eject`;
- template marketplace;
- remote AI agent hosting;
- built-in account system;
- browser-based content editor persistence;
- multi-user collaboration;
- public deploy setup wizard;
- rewriting QDoc around another bundler;
- exposing engine source in every initialized project.

## Open Implementation Questions

These should be answered during the implementation plan:

- Package names: `@qdoc/cli` versus another npm scope.
- Whether the internal renderer package is split immediately or bundled inside CLI for v0.
- Whether `theme/` compiles directly or is copied into generated `theme/`.
- Whether `qdoc.config.mjs` should support TypeScript in v0.
- Whether Cloudflare deploy remains available in initialized projects or stays private until a deploy adapter setup command exists.

None of these block the product direction. They affect packaging and implementation order only.
