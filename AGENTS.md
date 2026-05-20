# open-press framework — agent contract

This repo is the **open-press** framework: engine, workbench, spec, bundled skills. Documents written by users live in **another folder**, not this one.

**You are an agent contributing to open-press itself**, not to a single document. Edit framework code; don't write business content.

> **If you find `memory/AGENTS.md` at the workspace root, you're in a downstream workspace** (a clone of open-press being used to write a real document, not the framework repo itself). Read `memory/AGENTS.md` first for the project-specific context (deployment, naming, history), then return here for framework-level guidance. Downstream workspaces gitignore `document/` and `memory/`; framework changes you push from there only ship the engine / src / tests / skills changes, never the project's private content.

## Framework boundary in user workspaces

When this framework is installed in a user's workspace (via the `openpress-init` skill), the framework code lives under `core/` and is treated as **read-only** from the user's perspective. The boundary rules are:

- AI does **not** modify `core/` in user workspaces. Any "fix the framework" request gets routed to upstream PR or escape-hatch alias (`src/` + vite alias).
- `openpress-upgrade` skill overwrites `core/` wholesale on framework upgrades.
- This framework repo itself does not have the `core/` folder yet — the directory restructure is a migration task tracked in `docs/superpowers/specs/2026-05-21-open-press-template-and-skill-init.md`.

## What you may edit (in this repo)

- `engine/` — Node CLI + render pipeline (will move to `core/engine/` after migration)
- `src/` — React/Vite workbench source (will move to `core/runtime/` + `core/primitives/`)
- `skills/` — Bundled agent skills (including style packs)
  - To add a new style pack: create `skills/<name>/SKILL.md` + `starter/` (the engine auto-discovers by `starter/` existence)
  - Editing an existing pack's `starter/` ships to every new workspace created from that pack
- `docs/superpowers/specs/` — Framework specs and design documents
- `tests/` — `node --test` framework tests
- Root config: `vite.config.ts` / `tsconfig.json` / `index.html` / `package.json` / `qdoc.config.mjs` / `README.md` / `.gitignore`

## What you may not edit

- `document/` — **git-ignored**. This is the local working copy of a document populated by `openpress init . --skill <pack>`. Treat it as scratch space for verifying framework changes; do NOT commit content from here.
- `node_modules/`, `public/qdoc/`, `dist-react/`, `.deploy/`, `.qdoc/memory/` — generated.

## Commit message prefixes

To keep history readable across framework / dogfood / skill changes:

- `[core] ...` — framework code (`engine/`, `src/`, will become `core/`)
- `[doc] ...` — dogfood content (`document/`, gitignored so rarely committed)
- `[skill] ...` — starter packs / SKILL files
- `[spec] ...` — design specs / docs
- `[test] ...` — test changes only

## Branch ownership

- **Engine code (engine/, src/)** — keep it generic. Do not hardcode any project's content, brand, or paths. All workspace-specific values flow through `qdoc.config.mjs` (or `document/index.tsx` in the React pipeline).
- **Style packs (skills/<pack>/)** — opinionated. A pack expresses one design philosophy. Don't make a single pack try to cover every visual register.
- **Built-in chart types** — `bar`, `line`, `donut` only. Adding a new built-in is a framework-level decision; ad-hoc chart variants belong as workspace components in the user's `document/components/<name>/`.

## Workflow for local validation

For CLI usage and skill routing, read `skills/qdoc/SKILL.md` first (note: skills will be renamed to `openpress-*` during migration). It owns inspect/search/replace, local workbench review, source/generated boundaries, and which specialist skill should handle writing, hierarchy, design, deploy, or style-pack work.

```bash
# Populate document/ from a style pack so you have something to test against
# (this repo uses a nested layout; `openpress init <target>` is for fresh empty
# directories, not for populating document/ inside an existing checkout):
mkdir -p document
cp -r skills/editorial-monograph/starter/. document/

# Validate the full pipeline:
npm run openpress:validate
npm run openpress:export
npm run dev              # visit http://127.0.0.1:5173/?dev=1
npm run openpress:pdf
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

See `docs/superpowers/specs/2026-05-20-qdoc-react-architecture-design.md` for the React/MDX architecture and `docs/superpowers/specs/2026-05-21-open-press-template-and-skill-init.md` for the template + SKILL distribution model.
