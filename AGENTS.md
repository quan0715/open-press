# open-press framework — agent contract

This repo is the **open-press** framework: core engine/workbench packages, CLI scaffolder, bundled skills, docs, landing site, and a tracked dogfood document.

**You are an agent contributing to open-press itself.** Framework code lives under packages/apps/skills; the root `document/` is the public dogfood workspace used to verify the framework with real output.

> **If you find `memory/AGENTS.md` at the workspace root, you're in a downstream workspace** (an open-press document project, not the framework repo itself). Read `memory/AGENTS.md` first for project-specific context. Downstream workspace framework snapshots live under `engine/` and `src/openpress/`; document work should normally stay in `document/`, config, and local skills.

## What you may edit

- `packages/core/` — runtime primitives, engine, render pipeline, workbench source, tests.
- `packages/cli/` — scaffolder and template sync code.
- `apps/web/` — landing site.
- `skills/` — independent agent skills. Some skills include `starter/` files that agents can read, copy, and adapt.
- `document/` — tracked dogfood workspace for the OpenPress User Story Book. Use it to validate real content, style, PDF, and deploy behavior.
- `docs/` — user-facing docs, migration notes, active specs, and implementation plans.
- Root config: `vite.config.ts` / `tsconfig.json` / `index.html` / `package.json` / `openpress.config.mjs` / `README.md` / `.gitignore`.

## What you may not edit

- `packages/core/document/` — legacy local scratch path. Do not recreate it; root `document/` is the dogfood workspace.
- `node_modules/`, `public/openpress/`, `dist-react/`, `.deploy/`, `.openpress/`, `.turbo/cache/` — generated/cache output.

The full source-vs-generated path table is owned by `skills/openpress/SKILL.md` > Source Boundary. Other skills link to that table rather than redefining it.

## Commit message prefixes

- `[core] ...` — framework code (`packages/core/`, `packages/cli/`, `apps/web/`)
- `[doc] ...` — dogfood content (`document/`, gitignored so rarely committed)
- `[skill] ...` — skill files under `skills/`
- `[spec] ...` — design specs / docs
- `[test] ...` — test changes only

## Branch ownership

- **Framework code (`packages/core/`, `packages/cli/`, `apps/web`)** — keep generic. No hardcoded project content, brand, or paths. All workspace-specific values flow through `openpress.config.mjs` or the workspace Press tree.
- **Starter-bearing skills (`skills/<name>/starter/`)** — independent skills that include usable starter files. Keep them working, but do not make the CLI responsible for fetching them.
- **Built-in chart types** — `bar`, `line`, `donut` only. Adding a new built-in is a framework-level decision; ad-hoc chart variants belong as workspace components in `document/components/<name>/`.

## Workflow for local validation

`skills/openpress/SKILL.md` is the routing entry point. Read it first to find the right specialist (writing, hierarchy, design, diagram, deploy, apply-comments). Use `skills/openpress-apply-comments/SKILL.md` directly when the task is to resolve pending `@openpress-comment` markers.

Use the tracked root `document/` to validate framework changes. It should exercise real authoring, preview, PDF, and deploy flows:

```bash
# Validate the full pipeline:
npm run build            # validates + renders dist-react/
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
- **Skills carry opinions**: starter-bearing skills, writing skills, design skills.
- **User owns intent**: agents ask before adding material business numbers, legal claims, public commitments, or publishing to a public URL.
- **Validation protects delivery, not taste**: structural checks pass before render; do not police placeholder text or aesthetic choices in `validate`.

See `docs/superpowers/specs/2026-05-21-open-press-template-and-skill-init.md` for historical context on the template + SKILL distribution model.
