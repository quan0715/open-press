# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Read `AGENTS.md` first — it owns the editable/non-editable path contract, commit prefixes, and engine philosophy. This file adds the architecture and command detail that requires reading multiple files to reconstruct.

## Repo identity

This is the **open-press framework monorepo** (pnpm workspaces + turbo), not a downstream OpenPress workspace. If you ever find `memory/AGENTS.md` at the root, you are in a downstream project instead — stop and read that file.

Published packages ship lockstep at one version (`fixed` in `.changeset/config.json`):

| Package | Role |
| --- | --- |
| `@open-press/core` | Engine (`engine/`, plain `.mjs`) + React runtime (`src/openpress/`, TSX). Not bundled — consumers import source through the shipped `vite.config.ts`. |
| `@open-press/cli` | `open-press` binary, built with tsup. Thin wrapper over core's engine. |
| `@open-press/create` | `npm create @open-press` scaffolder. Slide workspaces only by design. |
| `apps/web` | Astro landing site (open-press.dev). Not published. |

`press/` is the **tracked dogfood workspace** (`financial-report`, `resume`, `school-report`, `slide`, `thesis`, `userstory`). It is real committed source used to validate the pipeline — despite what `AGENTS.md` and `.gitignore` comments claim about it being ignored.

## Commands

Node 24 is pinned in CI and `.node-version` (Trusted Publishing OIDC needs npm ≥ 11.5.1). Engine runtime contract is Node ≥ 20.

```bash
pnpm install
pnpm run typecheck        # turbo → tsc per package
pnpm test                 # repo policy tests + turbo test
pnpm run build            # turbo build (validates + renders every Press)
```

In **this repo** the `open-press` binary is not built locally — always invoke the engine directly:

```bash
node packages/core/engine/cli.mjs <command> .
```

Dogfood pipeline:

```bash
pnpm run dev:workspace    # workbench at http://127.0.0.1:5173/workspace
pnpm run dev:web          # Astro landing site
pnpm run openpress:pdf
pnpm run openpress:word
pnpm run openpress:deploy:dry-run
```

### Tests

Three distinct runners live in `packages/core`; pick the right one for the file:

```bash
# node:test — tests/*.test.mjs (engine, CLI, export pipeline)
cd packages/core && node --test tests/framework-react-pagination.test.mjs

# vitest — tests/*.test.ts (React runtime, models, workbench logic)
cd packages/core && npx vitest run tests/openpress-numbering.test.ts

# playwright — tests/e2e/reader-*.spec.ts, boots a real dev server on fixture workspace
pnpm --filter @open-press/core test:e2e:reader
```

Repo-level policy tests (`tests/*.test.mjs`, run by `pnpm run test:repo`) assert the CI workflow shape, changeset config, and `press/` authoring conventions. They fail if you change `.github/workflows/ci.yml` or `.changeset/config.json` without updating them.

Playwright Chromium is required for pagination measurement:

```bash
pnpm --filter @open-press/core exec playwright install --with-deps chromium
```

## Architecture

### The export pipeline is the product

Everything renders through one orchestrator: `packages/core/engine/react/document-export.mjs` (`exportReactDocument`). Layers are numbered in the source comments:

1. **Entry load** (`react/document-entry.mjs`) — spins a Vite SSR server, loads each `press/<slug>/press.tsx` default export, reads `<Press>` props as metadata.
2. **Press tree expansion** (`react/pipeline/press-tree.mjs`) — SSR-renders the tree with `PressContext`, then discovers frames by regex-scanning the HTML for `data-openpress-frame-key`. `<Press>` itself is inert at render time; the engine reads its props.
3. **Frame measurement** (`react/pipeline/frame-measurement.mjs`) — measures block heights and `MdxArea` capacities in headless Chromium.
4. **Allocation** (`react/pipeline/allocate.mjs` → `react/pagination/allocator.mjs`) — fills regions per `chainId`, emits `hints.totalPagesPerChain` fed back into layer 2. Loops until stable, `MAX_ITERATIONS = 20`.
5. **Final render** (`react/pipeline/final-render.mjs`) — HTML with the stable allocation.
6. **Write** — `public/openpress/<slug>/document.json` per Press + `public/openpress/workspace.json` manifest.

New pagination behavior goes into the shared allocator first (with pure unit tests), then the pipeline adapter.

### Static output boundary — the most common confusion

The reader/workbench renders from **static `document.json`**, never from live MDX. Vite HMR hot-reloads React chrome and CSS, but does **not** regenerate `document.json`. After any edit to `press/**/*.mdx`, `press.tsx`, per-Press components, pagination-affecting theme CSS, or `openpress/settings.json`:

```bash
node packages/core/engine/cli.mjs export .   # JSON refresh only, fast
# or pnpm run build for the full Vite bundle
```

Pure CSS edits that don't move content are fine on HMR alone.

### Press Tree primitives

Defined in `packages/core/src/openpress/core/`. Only five things are structural — `Press`, `Frame`, `MdxArea`, `ObjectEntity`, `Text`. Covers, TOCs, section openers, slides, and social cards are all just `Frame` instances with different roles. `docs/press-tree.md` is the authoritative contract; read it before changing anything in `core/`.

Page geometry lives on `<Press page>` (preset `a4` / `social-square` / `slide-16-9`, or a custom `{ id, label, width, height }`), never in CSS constants. Sources register via `mdxSource({ preset, root })` from `@open-press/core/mdx` — those factories must stay pure (no IO at module load; resolution happens in `engine/react/sources/mdx-resolver.mjs`).

`@open-press/core/manuscript` (`Toc`, `TocArea`, `Sections`, `Chapters`) is a helper layer, not a renderer. Don't push slide- or genre-specific behavior into it.

### Config

`openpress/settings.json` is the only user-facing config (`engine/runtime/workspace-settings.mjs`, version 1: `appearance`, `page`, `captionNumbering`, `pdf`, `deploy`). Every path is a fixed convention in `engine/runtime/config.mjs` `CONVENTION` and is **not** user-overridable — `press/`, `public/openpress/`, `dist-react/`. Document title/subtitle/organization come from `<Press>` / `<Workspace>` JSX props, not settings.

### Runtime split

`packages/core/src/openpress/` is display + interaction only:

- `app/` — routing (`workspaceRoute.ts`: `/workspace`, `/workspace/settings`, `/<slug>/preview`, `/<slug>/present`) and mode selection.
- `reader/` — public viewer, print route, slide presentation.
- `workbench/` — local authoring shell: comments, change preview, inline source edit, mentions, deployment.

`/__openpress/*` endpoints are implemented twice: `packages/core/vite.config.ts` middlewares for `dev`, and `engine/output/static-server.mjs` for `preview` / thumbnail / PDF runs. The sets overlap but are not identical (`comment` and `change-preview` are dev-only) — when adding an endpoint, decide deliberately whether the static server needs it too. Both wrap mutating routes in `rejectUntrustedLocalMutationRequest` from `engine/runtime/local-mutation-guard.mjs`.

### Framework code must stay generic

No hardcoded project content, brand, or paths in `packages/core/`, `packages/cli/`, `apps/web/`. Everything workspace-specific flows through `openpress/settings.json` or `<Workspace>` / `<Press>` props. Built-in chart types are `bar`, `line`, `donut` only — ad-hoc variants belong in `press/<slug>/components/`.

## Branch and release model

`dev` is the integration branch; `main` is production-only. `CONTRIBUTING.md` still says to PR against `main` — it's stale, and CI's `release-policy` job will reject it.

```
feature/* → dev → release/<version> → main → npm publish
```

- Feature PRs target `dev`. Add a changeset (`pnpm changeset`) for anything that ships; skip it for docs/CI-only work.
- Only `release/*` branches may target `main`, must be a single non-merge commit titled `release: <version>`, must touch only package manifests + changelogs, and must have consumed all pending changesets. `.github/workflows/ci.yml` enforces all of this.
- `@open-press/{core,cli,create}` share one version. Prefer `patch` when unsure.

Commit prefixes: `[core]` framework code, `[doc]` dogfood/docs, `[skill]` `skills/`, `[spec]` specs, `[test]` tests-only.

## Skills

`skills/` holds independent agent skills (`openpress` is the routing entry point; specialists cover create-pages, create-slide, collaborate, apply-comments, deploy, upgrade, explanatory-visuals). Some carry `starter/` files that agents copy into a workspace — the CLI never fetches them, and a starter must never require engine changes. If a starter needs new behavior, add a tested core primitive first.

Skill commands have two spellings. The `open-press` binary accepts `skills update` / `skills add <alias>` and rewrites them (`packages/cli/src/cli.ts` `normalizeSkillsArgs`). The core engine only knows the colon form — so in **this** repo it is always `node packages/core/engine/cli.mjs skills:sync .` or `skills:add <alias> .`.

## Landing site

`apps/web/` is design-review territory. Validate with `pnpm --filter web build` and look at it in a browser. Do **not** add automated tests for copy, section order, layout, responsiveness, or motion.
