# QDoc framework — agent contract

This repo is the QDoc framework: engine, workbench, spec, bundled skills. Documents written by users live in **another folder**, not this one.

**You are an agent contributing to QDoc itself**, not to a single document. Edit framework code; don't write business content.

> **If you find `memory/AGENTS.md` at the workspace root, you're in a downstream workspace** (a clone of QDoc being used to write a real document, not the framework repo itself). Read `memory/AGENTS.md` first for the project-specific context (deployment, naming, history), then return here for framework-level guidance. Downstream workspaces gitignore `document/` and `memory/`; framework changes you push from there only ship the engine / src / tests / skills changes, never the project's private content.

## What you may edit

- `engine/` — Node CLI + render pipeline
- `src/` — React/Vite workbench source
- `skills/` — Bundled agent skills (including style packs)
  - To add a new style pack: create `skills/<name>/SKILL.md` + `starter/` (the engine auto-discovers by `starter/` existence)
  - Editing an existing pack's `starter/` ships to every new workspace created from that pack
- `spec/qdoc/` — Framework specs
- `tests/` — `node --test` framework tests
- Root config: `vite.config.ts` / `tsconfig.json` / `index.html` / `package.json` / `qdoc.config.mjs` / `README.md` / `.gitignore`

## What you may not edit

- `document/` — **git-ignored**. This is the local working copy of a document populated by `qdoc init . --skill <pack>`. Treat it as scratch space for verifying framework changes; do NOT commit content from here.
- `node_modules/`, `public/qdoc/`, `dist-react/`, `.deploy/`, `.qdoc/memory/` — generated.

## Branch ownership

- **Engine code (engine/, src/)** — keep it generic. Do not hardcode any project's content, brand, or paths. All workspace-specific values flow through `qdoc.config.mjs`.
- **Style packs (skills/<pack>/)** — opinionated. A pack expresses one design philosophy. Don't make a single pack try to cover every visual register.
- **Built-in chart types** — `bar`, `line`, `donut` only. Adding a new built-in is a framework-level decision; ad-hoc chart variants belong as workspace components in the user's `document/components/<name>/`.

## Workflow for local validation

```bash
# Populate document/ from a style pack so you have something to test against
# (this repo uses a nested layout; `qdoc init <target>` is for fresh empty
# directories, not for populating document/ inside an existing checkout):
mkdir -p document
cp -r skills/editorial-monograph/starter/. document/

# Validate the full pipeline:
npm run qdoc:validate
npm run qdoc:export
npm run dev              # visit http://127.0.0.1:5173/?dev=1
npm run qdoc:pdf
npm test
```

After framework changes:

```bash
npm run typecheck
npm test
```

## Boundaries (engine philosophy)

- **Engine stays dumb**: no opinions about content, brand, voice, visual register.
- **Skills carry opinions**: style packs, writing skills, design skills.
- **User owns intent**: agents ask before adding material business numbers, legal claims, public commitments, or publishing to a public URL.
- **Validation protects delivery, not taste**: structural checks pass before render; do not police placeholder text or aesthetic choices in `validate`.

See `spec/qdoc/qdoc-v0.md` for the full engine contract and `spec/qdoc/create-qdoc-v0.md` for the user-facing init experience.
