# QDoc

QDoc is an **AI-first fixed-layout document workspace**.

It helps you create long-form documents with stable visual structure: proposals, reports, whitepapers, study notes, manuals, and other documents that need consistent pages, figures, tables, PDF output, and public preview.

QDoc is designed for human + AI collaboration:

- you provide the goal, facts, constraints, and final judgment;
- the agent edits source files, structure, design, and components;
- QDoc provides the CLI, validation, preview, render, PDF, and deploy boundaries.

> Status: v0. This repository is currently a source checkout. npm packages such as `@qdoc/cli`, `@qdoc/core`, and `@qdoc/react` are not published yet.

Showcase: [qdoc-showcase.pages.dev](https://qdoc-showcase.pages.dev)

## When To Use QDoc

Use QDoc when a document will keep changing, but the output format needs to stay stable.

Good fits:

- proposals, business plans, and tenders;
- whitepapers, research reports, and product specs;
- books, handbooks, course notes, and study guides;
- technical reports and internal knowledge documents;
- editorial long-form publications and branded reports.

QDoc is less useful for one-off notes, chat answers, or documents where free-form manual layout is the main goal.

## Quick Start

Current recommended workflow is to use this repository as the framework checkout and keep your working document under `document/`.

```bash
git clone https://github.com/quan0715/qdoc.git
cd qdoc
npm install

mkdir -p document
cp -r skills/editorial-monograph/starter/. document/

npm run qdoc:validate
npm run dev
```

Then open the local URL printed by Vite, usually:

```txt
http://127.0.0.1:5173/?dev=1
```

The workbench has three useful views:

- **Document**: the reader-facing document.
- **Design System**: the style rules and visual specimens.
- **Project**: source inventory, components, media, and status.

## Work With An AI Agent

QDoc works best when your agent understands the bundled skills in `skills/`.

The entry skill is named **`qdoc`** on purpose. It matches the CLI/package name and tells the agent how to use QDoc tools, inspect/search/replace source text, validate output, and route work to specialist skills.

Start by asking your agent to load `qdoc`:

```txt
Use the qdoc skill. Inspect this workspace, explain the current document status,
and tell me which commands you will use before editing.
```

For document writing:

```txt
Use qdoc and qdoc-writing. Turn my notes into an 8-page proposal for investors.
Preserve confirmed facts. Mark missing facts as [TODO: ...].
After editing, run validate and render.
```

For a teaching note:

```txt
Use qdoc, qdoc-writing, qdoc-document-hierarchy, and teaching-notes-writing.
Reorganize this into learner-facing course notes with examples, practice, and an answer appendix.
```

For visual design:

```txt
Use qdoc and qdoc-design. Adjust the theme, page rhythm, and components so the document
matches the editorial-monograph style. Do not hand-edit generated output.
```

For local review:

```txt
Use qdoc. Start the local workbench and open the Document, Design System,
and Project views for review before deploy.
```

For deployment:

```txt
Use qdoc-deploy. Check the Cloudflare Pages deploy config and run a dry run.
Do not publish until I confirm the target project name.
```

## Skills

QDoc uses small, focused skills instead of one giant instruction file.

| Skill | Use When |
| --- | --- |
| `qdoc` | Operating the QDoc CLI, inspecting status, searching/replacing source text, validating/exporting/rendering, local workbench review, and choosing which specialist skill owns the task. |
| `qdoc-writing` | Planning, drafting, rewriting, or restructuring document content. |
| `qdoc-document-hierarchy` | Designing H1/H2/H3/H4 structure, TOC depth, reader outline, chapters, and appendices. |
| `qdoc-design` | Revising page rhythm, theme CSS, components, covers, figures, tables, charts, and PDF-safe layout. |
| `qdoc-diagram-drawing` | Designing diagram semantics: nodes, arrows, labels, state changes, and what belongs inside a figure. |
| `qdoc-deploy` | Preparing deploy config, running preflight/dry-run, and publishing only after explicit confirmation. |
| `qdoc-style-pack-contributor` | Creating or improving a bundled style pack under `skills/<pack>/starter/`. |
| `editorial-monograph` | Starting from the built-in A4 editorial report style. |
| `teaching-notes-writing` | Writing learner-facing notes, examples, practice questions, and answer appendices. |
| `chinese-ai-writing-polish` | Polishing Traditional Chinese professional writing and removing AI-like phrasing. |

If your agent does not automatically discover skills, point it at:

```txt
skills/qdoc/SKILL.md
```

## Common CLI Commands

Use npm scripts in this framework checkout:

```bash
npm run dev                 # start local workbench
npm run qdoc:validate       # validate workspace structure and delivery gates
npm run qdoc:export         # generate public/qdoc/document.json
npm run qdoc:render         # build dist-react/
npm run qdoc:preview        # preview production build
npm run qdoc:pdf            # generate PDF
npm run qdoc:deploy:dry-run # test deploy workflow without publishing
npm run qdoc:deploy -- --confirm # publish after explicit confirmation
```

The CLI can also be called directly:

```bash
node engine/cli.mjs --help
node engine/cli.mjs inspect . --json
node engine/cli.mjs search . "keyword" --json
node engine/cli.mjs replace . "old" "new" --json
node engine/cli.mjs replace . "old" "new" --apply
```

Safety notes:

- `replace` previews by default and writes only with `--apply`.
- `search` and `replace` default to document content.
- Generated folders such as `public/qdoc/`, `dist-react/`, and `.deploy/` should not be hand-edited.
- Public deploys should always go through `qdoc-deploy` and explicit user confirmation.

## Workspace Layout

In this framework checkout, the active document usually lives in `document/`:

```txt
document/
  qdoc.config.mjs
  content/          # Markdown source for the public document
  design.md         # single design brief: tokens, components, CSS responsibilities
  components/       # document-specific visual components
  media/            # images and other assets
  theme/            # CSS tokens, typography, page surfaces, print rules
```

Framework code lives at the repository root:

```txt
engine/             # Node CLI and render pipeline
src/                # React/Vite workbench
skills/             # bundled agent skills and style packs
spec/qdoc/          # framework specs
tests/              # tests
```

`document/` is git-ignored in this framework repo so local user content does not accidentally ship with framework changes.

## Content Page Kinds

QDoc scans Markdown files in filename order. Each file can declare a `kind` in frontmatter:

| Kind | Use For |
| --- | --- |
| `cover` | opening identity page; no footer |
| `toc` | generated table of contents placeholder; no footer |
| `chapter-opener` | optional chapter mini-cover for books, manuals, and teaching notes; no footer |
| `chapter` | normal content pages split by `##`; footer and page number are shown |
| `back-cover` | closing page; no footer |

`kind` defaults to `chapter`. Use `chapter-opener` only when the document benefits from a book-like chapter divider; formal reports and thesis-style documents can omit it.

## Style Packs

A style pack is an opinionated starting point for a document. It includes design rules, theme files, starter content, and optional components.

Currently bundled:

| Pack | Best For |
| --- | --- |
| `editorial-monograph` | A4 proposals, reports, whitepapers, product specs, and long-form editorial documents. |

Style pack shape:

```txt
skills/<pack>/
  SKILL.md
  starter/
    qdoc.config.mjs
    content/
    design.md
    theme/
    components/
    media/
```

Ask an agent to create or improve a style pack like this:

```txt
Use qdoc-style-pack-contributor. Create a QDoc style pack for formal technical whitepapers.
Define the visual philosophy, starter workspace, design.md brief, theme tokens,
component rules, and validation workflow.
```

## Deployment

QDoc can deploy the React reader to static hosting such as Cloudflare Pages.

Deployment settings live in `qdoc.config.mjs`, not in a hidden frontend button. A deploy flow should always show the target project, output source, and confirmation state before publishing.

Recommended agent prompt:

```txt
Use qdoc-deploy. Inspect qdoc.config.mjs, check the Cloudflare Pages target,
run the deploy dry run, and stop before publishing until I confirm.
```

## Framework Development

If you are contributing to QDoc itself, read [AGENTS.md](AGENTS.md) first.

Framework contributors usually edit:

- `engine/`
- `src/`
- `skills/`
- `spec/qdoc/`
- `tests/`
- root config files

After framework changes, run:

```bash
npm run typecheck
npm test
npm run qdoc:validate
npm run qdoc:render
```

Do not commit generated output such as `public/qdoc/`, `dist-react/`, `.deploy/`, or local document content under `document/`.
