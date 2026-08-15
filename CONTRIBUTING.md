# Contributing to open-press

Thanks for considering a contribution. open-press is a small, opinionated framework — the goal is a sharp, narrow tool, not a feature buffet. Before opening a PR, please skim this document.

## Project Model

open-press is distributed as npm packages plus agent-readable skills. The
`@open-press/cli` package scaffolds a runtime workspace from `@open-press/core`;
opinionated starters live in independent skills that agents read, copy, and
adapt after init.

This means:

- `packages/core/` and `packages/cli/` are upstream framework code. Changes here
  ship to downstream workspaces through package releases.
- `apps/web/` is the public docs / landing site.
- `skills/` contains independent agent skills. Some include `starter/` files,
  but the CLI is not responsible for fetching those starters.
- root `press/` is the tracked dogfood workspace used to validate real output.

## Branch & PR Flow

`dev` is the integration branch. `main` is production-only and must contain
nothing but released, pre-versioned code.

```text
feature/* → dev → release/<version> → main → npm and GitHub Releases
```

1. Start from `dev`: `git switch dev && git pull --ff-only`.
2. Fork (external) or create a feature branch (collaborator): `git switch -c <area>/<short-name>`.
3. Make changes. Keep one PR focused on one concern; do not bundle unrelated refactors.
4. Run local validation (see below) before pushing.
5. Open a PR against `dev` (`gh pr create --base dev`). Reference related issues, PRs, or public docs when useful.

**Do not open feature PRs against `main`.** CI's `release-policy` job rejects any
pull request to `main` whose branch is not named `release/*`. Releases are cut by
dispatching `prepare-release.yml`, not by hand — see
[docs/release-and-deploy.md](docs/release-and-deploy.md).

The maintainer reserves the right to ask for splits, rewrites, or reductions in scope before merging.

## Commit Message Prefixes

To keep history readable across framework, content, skill, and spec changes:

| Prefix | Use for |
| --- | --- |
| `[core]` | Framework code: `packages/core/`, `packages/cli/`, `apps/web/`, root config |
| `[skill]` | Skill files, references, and starter files under `skills/` |
| `[test]` | Test-only changes (no production code change) |
| `[doc]` | `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, other top-level docs, dogfood content in `press/` |
| `[spec]` | Design specs, migration notes, and implementation plans under `docs/` |

Use the prefix that names the **primary** change. Mixed PRs should usually be split.

## Changeset Version Bumps

`@open-press/create`, `@open-press/cli`, and `@open-press/core` ship lockstep as a fixed group; the higher bump in any changeset applies to all three. Pick the bump per change type:

| Bump | When |
| --- | --- |
| `patch` | Internal refactor, SKILL fold (rules unchanged), CLI polish, doc fix, doctor cache tweak |
| `minor` | New SKILL, new top-level CLI command, first document-level migration in this release |
| `major` | Removed CLI command, MDX directive rename, runtime API rename, removed SKILL |

When in doubt, prefer `patch`. We can always cut a `minor` later by adding a new changeset.

## Local Validation

This repo uses pnpm (see `packageManager` in `package.json`); the workspace
protocol dependencies will not resolve under npm. Before pushing, run:

```bash
pnpm install
pnpm run skills:link     # link framework skills/ (SSOT) to .agents/skills/ & .claude/skills/
pnpm run typecheck
pnpm test
```

If you touched render / pagination / layout code, run the full pipeline against the tracked dogfood workspace in `press/`:

```bash
pnpm run build            # validates + renders dist-react/
pnpm run openpress:pdf
```

For UI changes, start `pnpm run dev:workspace` and verify in a browser at `http://127.0.0.1:5173/workspace` — automated tests verify code correctness, not visual correctness.

## What Belongs Where

| Concern | Goes in | Owning skill (for agent contributions) |
| --- | --- | --- |
| CLI behavior, render pipeline | `packages/core/engine/`, `packages/cli/` | `openpress` |
| React workbench, reader runtime | `packages/core/src/` | `openpress` |
| Starter-bearing skill | `skills/<name>/starter/` | owning skill maintainer |
| Agent skill rules | `skills/<skill>/SKILL.md` | skill maintainer |
| Dogfood workspace content | `press/` (tracked — commit it, prefix `[doc]`) | `openpress-collaborate` |
| Project agent memory | `memory/` (gitignored — do **not** commit) | — |

Generated paths (`public/openpress/`, `dist-react/`, `.deploy/`, `.openpress/`) are never hand-edited or committed.

## Scope Discipline

- **No new dependencies** without a clear need; this repo is small on purpose.
- **No backwards-compatibility shims** for code that has not yet been released publicly.
- **No half-finished features** behind feature flags. If it ships in a release, it works.
- **No speculative abstractions**. Three similar lines is better than a premature interface.

## Reporting Issues

Open issues at https://github.com/quan0715/open-press/issues. Useful issues include:

- A minimal reproduction (commands run, expected vs actual output);
- Your environment (OS, Node version, browser if relevant);
- A pointer to the spec or skill you think owns the area.

For agent-skill issues (wrong routing, unclear boundary, missing trigger), name the skill in the title.

## License

By contributing, you agree your contribution is licensed under the MIT License (see `LICENSE`).
