# QDoc

AI-first fixed-layout document workspace. Markdown source, React workbench, A4 PDF output.

QDoc lets you and an AI collaborate on long-form documents — proposals, whitepapers, research reports, product specs — without giving the AI free rein over an unconstrained design surface. The engine handles boundaries, validation, render and PDF output; the agent makes content and style decisions within those bounds.

> Status: v0 — usable from this repo as `file:` dep; npm packages (`@qdoc/cli` / `@qdoc/core` / `@qdoc/react`) not yet published.

## Quick start (in this repo)

```bash
npm install

# Populate document/ from the default style pack (editorial-monograph).
# document/ is git-ignored; this is your local working copy.
mkdir -p document
cp -r skills/editorial-monograph/starter/. document/

# Edit document/qdoc.config.mjs (title / subtitle / organization) and
# document/content/*.md, then preview / validate / export PDF:
npm run dev              # http://127.0.0.1:5173/?dev=1
npm run qdoc:validate
npm run qdoc:pdf
```

> The CLI `qdoc init <target>` is for **creating a new workspace in an empty directory** (e.g. `node engine/cli.mjs init ~/projects/my-doc`). For populating this repo's own `document/`, use the `cp -r` form above — this repo uses a nested layout (root `qdoc.config.mjs` points at `document/qdoc.config.mjs`) and `init` does not (yet) handle that.

If you skip populating `document/` and just run `npm run dev`, the workbench loads with an empty-state screen explaining how to populate it.

## Repository layout

```
engine/                   Node CLI + render pipeline
src/                      React/Vite workbench (the UI you see at `npm run dev`)
skills/                   Bundled agent skills, including style packs
  qdoc/                   Orchestration / boundaries skill
  qdoc-design/            Document-level design skill
  qdoc-writing/           Document-level writing skill
  chinese-ai-writing-polish/  Portable: Traditional-Chinese prose polish
  editorial-monograph/    Style pack — quiet hairline-driven A4 monograph
    SKILL.md              Activation contract
    starter/              Workspace skeleton copied by `qdoc init`
spec/qdoc/                Specs (qdoc-v0.md, create-qdoc-v0.md, usage.md, ...)
tests/                    Framework tests (node --test)
templates/                (none — style packs ship their own starters)
document/                 (git-ignored — your local working document content)
```

## The style pack model

Every QDoc workspace starts from a **style pack**: a skill that bundles design rules + a runnable `starter/`. `qdoc init <target> --skill <pack>` copies the pack's starter into the target directory, producing a workspace that immediately passes `validate` / `export` / `pdf`.

Detection is structural: any `skills/<name>/starter/` is treated as a style pack. There is no registry to maintain.

First-party packs:

| Pack | Status | For |
| --- | --- | --- |
| `editorial-monograph` | shipped (default) | A4 monographs, proposals, whitepapers, research reports |
| `pitch-deck` | planned | 16:9 slide decks |
| `poster` | planned | Single-sheet posters / one-pagers |

Add your own: drop a `skills/<name>/SKILL.md` + `starter/` and `qdoc init` picks it up.

## Workspace contract (what an initialized project looks like)

```
my-document/
  AGENTS.md                # AI edit-scope contract
  README.md
  package.json
  qdoc.config.mjs          # title / subtitle / organization / paths / deploy

  document/                # the only directory the AI normally edits
    content/               # *.md scanned by filename order; frontmatter `kind:` dispatches
    design-system/         # *.md — design rules that double as a readable document
    components/            # one directory per inline visual block
    theme/                 # tokens.css + base/ + page-surfaces/ + patterns/ + shell/
    media/                 # images and binary assets
    qdoc.config.mjs        # workspace-level config
```

## Commands

```bash
npm run dev               # workbench (http://127.0.0.1:5173/?dev=1)
npm run qdoc:validate     # structural validation
npm run qdoc:export       # write public/qdoc/document.json from content/*.md
npm run qdoc:render       # full Vite build → dist-react/
npm run qdoc:preview      # serve the production build locally
npm run qdoc:pdf          # Chrome-headless print → dist-react/<filename>.pdf
npm test                  # node --test (framework smoke + unit tests)
```

CLI direct: `node engine/cli.mjs --help`

## Specs

- `spec/qdoc/qdoc-v0.md` — engine + workspace contract
- `spec/qdoc/create-qdoc-v0.md` — init experience + style pack contract
- `spec/qdoc/usage.md` — how to write a QDoc document
- `spec/qdoc/chart-components.md` — built-in chart components
- `spec/qdoc/css-ownership.md` — CSS layering rules
- `spec/qdoc/pdf-output.md` — PDF pipeline notes
