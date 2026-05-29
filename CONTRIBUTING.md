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
- root `document/` is the tracked dogfood workspace used to validate real output.

## Branch & PR Flow

1. Fork (external) or create a feature branch (collaborator): `git checkout -b <area>/<short-name>`.
2. Make changes. Keep one PR focused on one concern; do not bundle unrelated refactors.
3. Run local validation (see below) before pushing.
4. Open a PR against `main`. Reference related issues, PRs, or public docs when useful.

The maintainer reserves the right to ask for splits, rewrites, or reductions in scope before merging.

## Commit Message Prefixes

To keep history readable across framework, content, skill, and spec changes:

| Prefix | Use for |
| --- | --- |
| `[core]` | Framework code: `packages/core/`, `packages/cli/`, root config |
| `[skill]` | Skill files, references, and starter files under `skills/` |
| `[test]` | Test-only changes (no production code change) |
| `[doc]` | `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, other top-level docs |

Use the prefix that names the **primary** change. Mixed PRs should usually be split.

## Changeset Version Bumps

`@open-press/cli` and `@open-press/core` ship lockstep; the higher bump in any changeset applies to both. Pick the bump per change type:

| Bump | When |
| --- | --- |
| `patch` | Internal refactor, SKILL fold (rules unchanged), CLI polish, doc fix, doctor cache tweak |
| `minor` | New SKILL, new top-level CLI command, first document-level migration in this release |
| `major` | Removed CLI command, MDX directive rename, runtime API rename, removed SKILL |

When in doubt, prefer `patch`. We can always cut a `minor` later by adding a new changeset.

## Local Validation

Before pushing, run:

```bash
npm install
npm run typecheck
npm test
```

If you touched render / pagination / layout code, also populate a workspace from a representative skill-owned starter and run the full pipeline:

```bash
npm run build            # validates + renders dist-react/
npm run openpress:pdf
```

For UI changes, start `npm run dev` and verify in a browser at `http://127.0.0.1:5173/?dev=1` — automated tests verify code correctness, not visual correctness.

## What Belongs Where

| Concern | Goes in | Owning skill (for agent contributions) |
| --- | --- | --- |
| CLI behavior, render pipeline | `packages/core/engine/`, `packages/cli/` | `openpress` |
| React workbench, reader runtime | `packages/core/src/` | `openpress` |
| Starter-bearing skill | `skills/<name>/starter/` | owning skill maintainer |
| Agent skill rules | `skills/<skill>/SKILL.md` | skill maintainer |
| Workspace content | `document/` (gitignored — do **not** commit) | — |
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
