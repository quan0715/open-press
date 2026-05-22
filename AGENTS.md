# open-press framework — agent contract

This repo is the **open-press** framework: engine, workbench, spec, bundled skills, and a tracked dogfood document.

**You are an agent contributing to open-press itself.** Framework code lives under packages/apps/skills; the root `document/` is the public dogfood workspace used to verify the framework with real output.

> **If you find `memory/AGENTS.md` at the workspace root, you're in a downstream workspace** (a clone of open-press being used to write a real document, not the framework repo itself). Read `memory/AGENTS.md` first for the project-specific context (deployment, naming, history), then return here for framework-level guidance. Downstream workspaces gitignore `document/` and `memory/`; framework changes you push from there only ship the engine / src / tests / skills changes, never the project's private content.

## What you may edit

- `engine/` — Node CLI + render pipeline.
- `src/` — React/Vite workbench source.
- `skills/` — Bundled agent skills (including style packs).
  - To add a new style pack: create `skills/<name>/SKILL.md` + `starter/` (the engine auto-discovers by `starter/` existence).
  - Editing an existing pack's `starter/` ships to every new workspace created from that pack.
- `document/` — tracked dogfood workspace for the OpenPress User Story Book. Use it to validate real content, style, PDF, and deploy behavior.
- `docs/superpowers/specs/` — Active framework specs and design documents.
- `tests/` — Framework tests (`node --test` + `vitest`).
- Root config: `vite.config.ts` / `tsconfig.json` / `index.html` / `package.json` / `openpress.config.mjs` / `README.md` / `.gitignore`.

## What you may not edit

- `packages/core/document/` — legacy local scratch path. Do not recreate it; root `document/` is the dogfood workspace.
- `node_modules/`, `public/openpress/`, `dist-react/`, `.deploy/`, `.openpress/` — generated.

The full source-vs-generated path table is owned by `skills/openpress/SKILL.md` > Source Boundary. Other skills link to that table rather than redefining it.

## Planned: framework boundary in user workspaces

Long-term direction: when a downstream workspace is initialized, framework code will live under `core/` and be treated as **read-only** from the user's perspective (any "fix the framework" request gets routed to upstream PR or escape-hatch alias). The `core/` restructure and the matching upgrade flow are tracked in `docs/superpowers/specs/2026-05-21-open-press-template-and-skill-init.md`. This repo does not have `core/` yet.

## Commit message prefixes

- `[core] ...` — framework code (`engine/`, `src/`)
- `[doc] ...` — dogfood content (`document/`, gitignored so rarely committed)
- `[skill] ...` — `skills/<pack>/` starter packs or SKILL files
- `[spec] ...` — design specs / docs
- `[test] ...` — test changes only

## Branch ownership

- **Engine code (engine/, src/)** — keep generic. No hardcoded project content, brand, or paths. All workspace-specific values flow through `openpress.config.mjs` (or `document/index.tsx` in the React pipeline).
- **Style packs (skills/<pack>/)** — opinionated. One pack expresses one design philosophy.
- **Built-in chart types** — `bar`, `line`, `donut` only. Adding a new built-in is a framework-level decision; ad-hoc chart variants belong as workspace components in `document/components/<name>/`.

## Workflow for local validation

`skills/openpress/SKILL.md` is the routing entry point. Read it first to find the right specialist (writing, hierarchy, design, diagram, deploy, style-pack, apply-comments).

Use the tracked root `document/` to validate framework changes. It should exercise real authoring, preview, PDF, and deploy flows:

```bash
# Validate the full pipeline:
npm run openpress:validate
npm run openpress:export
npm run dev:workspace    # http://127.0.0.1:5173/?dev=1
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

See `docs/superpowers/specs/2026-05-21-open-press-template-and-skill-init.md` for the template + SKILL distribution model and current framework boundary direction.
