---
name: openpress-update
description: Use when updating or upgrading an existing open-press workspace to a newer framework release, pulling new engine/runtime changes, applying release migration notes, or handling breaking changes between versions.
---

# open-press Update

This skill owns the **release update flow** for an existing workspace: pulling new framework code, applying migration notes, handling breaking changes, and verifying nothing broke.

It does not own first-time setup (that is `openpress-init`) and does not own content/design changes (those are domain skills).

## When To Enter

Activate when the user says any of:

- "升級 open-press / 更新到最新版"
- "update open-press / upgrade to latest"
- "拉新版的 engine"
- "看一下這版有什麼破壞性改動"
- After the user pulls a new git tag and asks to verify the workspace still works.

## Pre-Flight Check

Before touching anything, confirm:

1. **Workspace state is clean**: `git status` shows no uncommitted document changes that an upgrade might overwrite.
2. **Current version is known**: read `package.json` `version` field; compare to target version.
3. **CHANGELOG has been read**: locate the project's CHANGELOG (currently in `docs/superpowers/specs/` migration notes; future: top-level `CHANGELOG.md`). Identify every breaking change between current and target version.

If any of these are missing, surface to the user before proceeding.

## Current Update Surface (pre-`core/`)

Until the `core/` folder restructure ships (tracked in `docs/superpowers/specs/2026-05-21-open-press-template-and-skill-init.md`), framework code lives intermixed with workspace code in this repo. Update means:

1. `git pull` (or merge / rebase the new framework tag).
2. `npm install` to refresh dependencies.
3. `npm run typecheck` — first signal of API-shape breakage.
4. `npm test` — second signal of behavior breakage.
5. `npm run openpress:validate && npm run openpress:render` against current `document/`.
6. For each failure, check the CHANGELOG entry for the breaking change and apply the documented migration.

## Future Update Surface (post-`core/`)

When `core/` exists (planned, see spec):

1. Backup user-edited escape-hatch files under `src/` (workspace overrides via vite alias).
2. Overwrite `core/` wholesale from the new release.
3. Re-apply codemods listed in the release migration notes.
4. Verify with `typecheck` + `test` + `validate` + `render`.

This skill will own the codemod runner once it exists.

## Breaking Change Handling

For each breaking change in the CHANGELOG:

| Change type | Action |
| --- | --- |
| Renamed identifier (e.g. `BaseReportPage` → `BaseContentPage`) | grep workspace for old name; rewrite at every callsite |
| Removed export | grep workspace; ask user if replacement is acceptable |
| Changed function signature | typecheck will surface; fix per release notes |
| CSS class rename | grep `document/theme/` and `document/components/`; rewrite |
| Config schema change | edit `openpress.config.mjs` per release notes |
| Markdown / MDX directive change | grep `document/chapters/`; rewrite per release notes |

If a breaking change has no documented migration in the CHANGELOG, **stop and ask the user** — do not improvise.

## Workflow

1. Pre-flight (clean tree, version delta, CHANGELOG read).
2. Pull the new code.
3. Run `typecheck` / `test` / `validate` / `render` in that order; stop at the first failure.
4. For each failure: find the CHANGELOG entry, apply the migration, re-run the failing command.
5. After all gates pass, run `npm run openpress:pdf` to sanity-check PDF output.
6. Report to the user: starting version, ending version, list of migrations applied, anything that needed manual intervention.

## Boundaries

- `openpress` owns the CLI and the source/generated boundary. This skill uses those commands.
- `openpress-deploy` is **not** part of update; do not auto-deploy after a successful update.
- Domain skills (`openpress-writing` / `openpress-design`) handle non-mechanical content rewrites that the user wants to do alongside the upgrade.

## Do Not

- Do not skip CHANGELOG reading. An undocumented breaking change is a sign to stop, not a sign to guess.
- Do not bundle new feature work with an update. Land the update first, commit, then start new work.
- Do not run `--force` overwrites on workspace files. If a file conflicts, surface it.
