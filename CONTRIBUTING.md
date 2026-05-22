# Contributing to open-press

Thanks for considering a contribution. open-press is a small, opinionated framework — the goal is a sharp, narrow tool, not a feature buffet. Before opening a PR, please skim this document.

## Project Model

open-press is distributed as a **template repository**, not (yet) as an npm package. Users clone or `degit` this repo and edit `document/` locally; the framework code lives intermixed under `engine/` and `src/` until the planned `core/` extraction lands (see `docs/superpowers/specs/2026-05-21-open-press-template-and-skill-init.md`).

This means:

- `engine/`, `src/`, `tests/`, `skills/` are upstream framework code. Changes here ship to every downstream workspace.
- `document/` and `memory/` are git-ignored. They are per-project scratch and are never committed upstream from this repo.

## Branch & PR Flow

1. Fork (external) or create a feature branch (collaborator): `git checkout -b <area>/<short-name>`.
2. Make changes. Keep one PR focused on one concern; do not bundle unrelated refactors.
3. Run local validation (see below) before pushing.
4. Open a PR against `main`. Reference any related spec under `docs/superpowers/specs/`.

The maintainer reserves the right to ask for splits, rewrites, or reductions in scope before merging.

## Commit Message Prefixes

To keep history readable across framework, content, skill, and spec changes:

| Prefix | Use for |
| --- | --- |
| `[core]` | Framework code: `engine/`, `src/`, root config |
| `[skill]` | `skills/<pack>/` starter packs, skill SKILL.md files, references |
| `[spec]` | `docs/superpowers/specs/` design documents |
| `[test]` | Test-only changes (no production code change) |
| `[doc]` | `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, other top-level docs |

Use the prefix that names the **primary** change. Mixed PRs should usually be split.

## Changeset Version Bumps

`@open-press/cli` and `@open-press/core` ship lockstep; the higher bump in any changeset applies to both. Pick the bump per change type:

| Bump | When |
| --- | --- |
| `patch` | Internal refactor, SKILL fold (rules unchanged), CLI polish, doc fix, doctor cache tweak |
| `minor` | New SKILL, new top-level CLI command, first document-level migration in this release, new style pack |
| `major` | Removed CLI command, MDX directive rename, runtime API rename, removed SKILL |

When in doubt, prefer `patch`. We can always cut a `minor` later by adding a new changeset.

## Local Validation

Before pushing, run:

```bash
npm install
npm run typecheck
npm test
```

If you touched render / pagination / layout code, also populate a workspace and run the full pipeline:

```bash
mkdir -p document
cp -R skills/editorial-monograph/starter/document/. document/

npm run openpress:validate
npm run openpress:export
npm run openpress:render
npm run openpress:pdf
```

For UI changes, start `npm run dev` and verify in a browser at `http://127.0.0.1:5173/?dev=1` — automated tests verify code correctness, not visual correctness.

## What Belongs Where

| Concern | Goes in | Owning skill (for agent contributions) |
| --- | --- | --- |
| CLI behavior, render pipeline | `engine/` | `openpress` |
| React workbench, reader runtime | `src/` | `openpress` |
| Bundled style pack | `skills/<pack>/starter/` | `openpress-style-pack-contributor` |
| Agent skill rules | `skills/<skill>/SKILL.md` | skill maintainer |
| Public design doc | `docs/superpowers/specs/` | spec author |
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
