# open-press

open-press is an **AI-first fixed-layout document workspace**.

It helps you create long-form documents with stable visual structure: proposals, reports, whitepapers, study notes, manuals, and other documents that need consistent pages, figures, tables, PDF output, and public preview.

open-press is designed for human + AI collaboration:

- you provide the goal, facts, constraints, and final judgment;
- the agent edits source files, structure, design, and components;
- open-press provides the CLI, validation, preview, render, PDF, and deploy boundaries.

> Status: v0. This repository is currently a source checkout. npm packages such as `@openpress/cli`, `@openpress/core`, and `@openpress/react` are not published yet.

Showcase: [openpress-showcase.pages.dev](https://openpress-showcase.pages.dev)

## When To Use open-press

Use open-press when a document will keep changing, but the output format needs to stay stable.

Good fits:

- proposals, business plans, and tenders;
- whitepapers, research reports, and product specs;
- books, handbooks, course notes, and study guides;
- technical reports and internal knowledge documents;
- editorial long-form publications and branded reports.

open-press is less useful for one-off notes, chat answers, or documents where free-form manual layout is the main goal.

## Quick Start

Current recommended workflow is to use this repository as the framework checkout and keep your working document under `document/`.

```bash
git clone https://github.com/quan0715/openpress.git
cd openpress
npm install

mkdir -p document
cp -R skills/editorial-monograph/starter/document/. document/

npm run openpress:validate
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

open-press works best when your agent understands the bundled skills in `skills/`.

The entry skill is named **`openpress`** on purpose. It matches the CLI/package name and tells the agent how to use open-press tools, inspect/search/replace source text, validate output, and route work to specialist skills.

Start by asking your agent to load `openpress`:

```txt
Use the openpress skill. Inspect this workspace, explain the current document status,
and tell me which commands you will use before editing.
```

For document writing:

```txt
Use openpress and openpress-writing. Turn my notes into an 8-page proposal for investors.
Preserve confirmed facts. Mark missing facts as [TODO: ...].
After editing, run validate and render.
```

For a teaching note:

```txt
Use openpress, openpress-writing, openpress-document-hierarchy, and teaching-notes-writing.
Reorganize this into learner-facing course notes with examples, practice, and an answer appendix.
```

For visual design:

```txt
Use openpress and openpress-design. Adjust the theme, page rhythm, and components so the document
matches the editorial-monograph style. Do not hand-edit generated output.
```

For local review:

```txt
Use openpress. Start the local workbench and open the Document, Design System,
and Project views for review before deploy.
```

For deployment:

```txt
Use openpress-deploy. Check the Cloudflare Pages deploy config and run a dry run.
Do not publish until I confirm the target project name.
```

## Skills

open-press uses small, focused skills instead of one giant instruction file.

| Skill | Use When |
| --- | --- |
| `openpress` | Operating the open-press CLI, inspecting status, searching/replacing source text, validating/exporting/rendering, local workbench review, and choosing which specialist skill owns the task. |
| `openpress-writing` | Planning, drafting, rewriting, or restructuring document content. |
| `openpress-document-hierarchy` | Designing H1/H2/H3/H4 structure, TOC depth, reader outline, chapters, and appendices. |
| `openpress-design` | Revising page rhythm, theme CSS, components, covers, figures, tables, charts, and PDF-safe layout. |
| `openpress-diagram-drawing` | Designing diagram semantics: nodes, arrows, labels, state changes, and what belongs inside a figure. |
| `openpress-deploy` | Preparing deploy config, running preflight/dry-run, and publishing only after explicit confirmation. |
| `openpress-style-pack-contributor` | Creating or improving a bundled style pack under `skills/<pack>/starter/`. |
| `editorial-monograph` | Starting from the built-in A4 editorial report style. |
| `teaching-notes-writing` | Writing learner-facing notes, examples, practice questions, and answer appendices. |
| `chinese-ai-writing-polish` | Polishing Traditional Chinese professional writing and removing AI-like phrasing. |

If your agent does not automatically discover skills, point it at:

```txt
skills/openpress/SKILL.md
```

## Common CLI Commands

Use npm scripts in this framework checkout:

```bash
npm run dev                 # start local workbench
npm run openpress:validate       # validate workspace structure and delivery gates
npm run openpress:export         # generate public/openpress/document.json
npm run openpress:render         # build dist-react/
npm run openpress:preview        # preview production build
npm run openpress:pdf            # generate PDF
npm run openpress:deploy:dry-run # test deploy workflow without publishing
npm run openpress:deploy -- --confirm # publish after explicit confirmation
```

The CLI can also be called directly:

```bash
node engine/cli.mjs --help
node engine/cli.mjs inspect . --json
node engine/cli.mjs search . "keyword" --json
node engine/cli.mjs replace . "old" "new" --json
node engine/cli.mjs replace . "old" "new" --apply
node engine/cli.mjs migrate-to-react . --dry-run
```

Safety notes:

- `replace` previews by default and writes only with `--apply`.
- `search` and `replace` default to document content.
- Generated folders such as `public/openpress/`, `dist-react/`, and `.deploy/` should not be hand-edited.
- Public deploys should always go through `openpress-deploy` and explicit user confirmation.

## Workspace Layout

In this framework checkout, the active document usually lives in `document/`:

```txt
document/
  openpress.config.mjs
  index.tsx         # document config plus cover, TOC, and back-cover JSX
  chapters/         # chapter folders
    01-example/
      chapter.tsx   # optional opener/meta for this chapter
      content/
        01-start.mdx
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
  docs/superpowers/  # implementation specs and plans
tests/              # tests
```

`document/` is git-ignored in this framework repo so local user content does not accidentally ship with framework changes.

## React/MDX Authoring

open-press now treats `document/index.tsx` and `document/chapters/**/content/*.mdx` as the canonical authoring surface.

| Source | Use For |
| --- | --- |
| `document/index.tsx` | document config plus `cover`, `toc`, and `backCover` named JSX exports |
| `document/chapters/<NN-slug>/chapter.tsx` | optional chapter `meta` and `opener` named JSX export |
| `document/chapters/<NN-slug>/content/*.mdx` | reader-facing prose, tables, figures, and MDX components |
| `document/components/` | shared document components |
| `document/theme/` | visual tokens, page surfaces, typography, and print rules |

Legacy flat Markdown workspaces can be converted with:

```bash
node engine/cli.mjs migrate-to-react . --dry-run
node engine/cli.mjs migrate-to-react .
```

Use chapter openers only when the document benefits from a book-like divider; formal reports and thesis-style documents can omit them.

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
    openpress.config.mjs
    document/
      openpress.config.mjs
      index.tsx
      chapters/
      design.md
      theme/
      components/
      media/
```

Ask an agent to create or improve a style pack like this:

```txt
Use openpress-style-pack-contributor. Create a open-press style pack for formal technical whitepapers.
Define the visual philosophy, starter workspace, design.md brief, theme tokens,
component rules, and validation workflow.
```

## Deployment

open-press can deploy the React reader to static hosting such as Cloudflare Pages.

Deployment settings live in `openpress.config.mjs`, not in a hidden frontend button. A deploy flow should always show the target project, output source, and confirmation state before publishing.

Recommended agent prompt:

```txt
Use openpress-deploy. Inspect openpress.config.mjs, check the Cloudflare Pages target,
run the deploy dry run, and stop before publishing until I confirm.
```

## Framework Development

If you are contributing to open-press itself, read [AGENTS.md](AGENTS.md) first.

Framework contributors usually edit:

- `engine/`
- `src/`
- `skills/`
- `docs/superpowers/`
- `tests/`
- root config files

After framework changes, run:

```bash
npm run typecheck
npm test
npm run openpress:validate
npm run openpress:render
```

Do not commit generated output such as `public/openpress/`, `dist-react/`, `.deploy/`, or local document content under `document/`.
