# open-press framework — agent contract

This repo is the **open-press** framework: core engine/workbench packages, CLI scaffolder, bundled skills, docs, landing site, and a tracked dogfood workspace.

**You are an agent contributing to open-press itself.** Framework code lives under packages/apps/skills; the root `press/` is the public dogfood workspace used to verify the framework with real output.

> **If you find `memory/AGENTS.md` at the workspace root, you're in a downstream workspace** (an open-press project, not the framework repo itself). Read `memory/AGENTS.md` first for project-specific context. Downstream workspaces consume `@open-press/core` from npm; document work should normally stay in `press/`, `package.json` (the `"openpress"` field), and local skills.

## What you may edit

- `packages/core/` — runtime primitives, engine, render pipeline, workbench source, tests.
- `packages/cli/` — scaffolder and template sync code.
- `apps/web/` — landing site.
- `skills/` — independent agent skills. Some skills include `starter/` files that agents can read, copy, and adapt.
- `press/` — tracked dogfood workspace. Hosts `press/userstory/` (the OpenPress User Story Book) plus minimal `social` and `slide` Press for multi-Press verification. Use it to validate real content, style, PDF, deploy, and gallery routing.
- `docs/` — user-facing docs, migration notes, active specs, and implementation plans.
- Root config: `vite.config.ts` / `tsconfig.json` / `index.html` / `package.json` (workspace operational settings live in its `"openpress"` field) / `README.md` / `.gitignore`.

## What you may not edit

- `packages/core/document/` — legacy local scratch path. Do not recreate it; root `press/` is the dogfood workspace.
- `node_modules/`, `public/openpress/`, `dist-react/`, `.deploy/`, `.openpress/`, `.turbo/cache/` — generated/cache output.

The full source-vs-generated path table is owned by `skills/openpress/SKILL.md` > Source Boundary. Other skills link to that table rather than redefining it.

## Commit message prefixes

- `[core] ...` — framework code (`packages/core/`, `packages/cli/`, `apps/web/`)
- `[doc] ...` — dogfood content (`press/`, gitignored so rarely committed)
- `[skill] ...` — skill files under `skills/`
- `[spec] ...` — design specs / docs
- `[test] ...` — test changes only

## Branch ownership

- **Framework code (`packages/core/`, `packages/cli/`, `apps/web`)** — keep generic. No hardcoded project content, brand, or paths. All workspace-specific values flow through `package.json`'s `"openpress"` field or `<Workspace>` / `<Press>` JSX props.
- **Starter-bearing skills (`skills/<name>/starter/`)** — independent skills that include usable starter files. Keep them working, but do not make the CLI responsible for fetching them.
- **Built-in chart types** — `bar`, `line`, `donut` only. Adding a new built-in is a framework-level decision; ad-hoc chart variants belong as per-Press components in `press/<slug>/components/<name>/`.

## Workflow for local validation

`skills/openpress/SKILL.md` is the routing entry point. Read it first to find the right specialist (writing, hierarchy, design, diagram, deploy, apply-comments). Use `skills/openpress-apply-comments/SKILL.md` directly when the task is to resolve pending `@openpress-comment` markers.

Use the tracked root `press/` to validate framework changes. It should exercise real authoring, preview, PDF, and deploy flows:

```bash
# Validate the full pipeline:
npm run build            # validates + renders every Press into dist-react/ + public/openpress/<slug>/
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
