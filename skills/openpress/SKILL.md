---
name: openpress
description: Use when operating an open-press workspace through CLI commands, discovering project status, validating/exporting/rendering/PDF output, inspecting structure/issues, searching or safely replacing source text, managing pending @openpress-comment markers, upgrading the framework to a newer release, or deciding which open-press skill owns a task.
---

# open-press Core

open-press owns the tool surface and delivery boundaries. **Use this skill first** when the task involves the CLI, workspace status, generated output, framework upgrades, or deciding which specialist skill should take over.

This skill is also the **single source of truth** for the source vs generated boundary. Other skills reference this section instead of re-listing paths.

## Responsibilities

- Choose safe open-press CLI commands.
- Define the canonical source vs framework vs generated path boundary (see below).
- Inspect workspace state before broad edits.
- Open and manage the local workbench review loop.
- Manage `@openpress-comment` markers (list, apply, resolve, clear).
- Drive the release upgrade flow (pull new framework, apply migrations, verify).
- Route domain work to the owning skill.
- Require verification before declaring output ready.

## Skill Routing

| Skill | Owns |
| --- | --- |
| `openpress` | CLI, inspect/search/replace, source/generated boundary, validation/export/render/PDF command choice, `@openpress-comment` operations, framework upgrades, skill routing |
| `openpress-init` | First-time intake conversation, style-pack recommendation, metadata gathering, running `init`, handing off to writing/design |
| `openpress-writing` | Reader-facing content, narrative, captions, factual boundaries, H1/H2/H3/H4 structure, portable writing skill loading |
| `openpress-design` | Workspace visual system: `document/theme/`, `document/components/`, PDF-safe layout |
| `openpress-diagram-drawing` | Diagram semantics: nodes, arrows, labels, states, figure text |
| `openpress-deploy` | Deploy config, preflight, dry run, public publish confirmation |
| `openpress-style-pack-contributor` | Bundled packs under `skills/<pack>/starter/` (the upstream design, not workspace consumption) |
| Portable writing skills (`chinese-ai-writing-polish`, `teaching-notes-writing`, …) | Language, tone, genre, learner-facing rules. Loaded via `openpress-writing` |

## Source Boundary (canonical)

Edit source, not generated output. **This list is the single authoritative version**; other skills link here.

| Layer | Paths | Edit? |
| --- | --- | --- |
| Workspace source | `openpress.config.mjs`, `document/index.tsx`, `document/chapters/`, `document/design.md`, `document/theme/`, `document/components/`, `document/media/` | yes — domain skills |
| Skill / pack source | `skills/<pack>/SKILL.md`, `skills/<pack>/starter/**`, other skill files under `skills/` | yes — `openpress-style-pack-contributor` for packs; skill maintainers for own skill |
| Framework | `engine/`, `src/`, `tests/`, `docs/superpowers/`, `vite.config.ts`, `tsconfig.json`, `index.html` | yes — framework agents only |
| Generated | `public/openpress/`, `dist-react/`, `.deploy/`, `.openpress/` | **never hand-edit** |

If a workspace lacks `document/index.tsx`, run `node engine/cli.mjs migrate-to-react` before broad structural rewrites.

If `memory/AGENTS.md` exists, read it before framework-level `AGENTS.md`; it usually marks a downstream document workspace where `document/` is git-ignored project content, not source you commit upstream.

## Workflow

1. Orient: read `AGENTS.md`, `memory/AGENTS.md` if present, and the relevant specialist skill.
2. Inspect before broad edits with `inspect --json`, `search --json`, or `rg`.
3. Route domain work to the owning skill instead of duplicating its rules.
4. Edit only source paths in the owning area (see boundary table).
5. Verify with the narrowest command that proves the claim.

## Starting A New Workspace

Route to `openpress-init` for the intake conversation. The CLI itself is:

```bash
npx @open-press/cli init <target> --pack <pack-name>
```

Available packs: `editorial-monograph`, `claude-document`. Run without `--pack` for an empty skeleton.

## Updating An Existing Workspace

The release-upgrade flow lives in this skill (formerly `openpress-update`).

### When to enter the upgrade flow

User says any of:

- "升級 open-press / 更新到最新版"
- "update open-press / upgrade to latest"
- "拉新版的 engine" / "看一下這版有什麼破壞性改動"
- After the user pulls a new git tag and asks to verify the workspace still works.

### Pre-flight

Before touching anything, confirm:

1. **Workspace state is clean**: `git status` shows no uncommitted document changes that an upgrade might overwrite.
2. **Current version is known**: read `package.json` `version` field; compare to target version.
3. **CHANGELOG has been read**: locate the project's CHANGELOG (top-level `CHANGELOG.md`). Identify every breaking change between current and target version.

If any of these are missing, surface to the user before proceeding.

### Upgrade workflow

1. Pull the new code (`git pull`, or merge / rebase the new framework tag).
2. `npm install` to refresh dependencies.
3. `npm run typecheck` — first signal of API-shape breakage.
4. `npm run test` if available — second signal of behavior breakage.
5. `npm run openpress:validate && npm run openpress:render` against current `document/`.
6. For each failure, check the CHANGELOG entry for the breaking change and apply the documented migration.
7. After all gates pass, `npm run openpress:pdf` to sanity-check PDF.
8. Refresh agent skills: `npx skills upgrade` (re-reads `skills-lock.json` and fetches latest).
9. Report to the user: starting version, ending version, list of migrations applied, anything that needed manual intervention.

### Breaking change reference

| Change type | Action |
| --- | --- |
| Renamed identifier (e.g. `BaseReportPage` → `BaseContentPage`) | grep workspace for old name; rewrite at every callsite |
| Removed export | grep workspace; ask user if replacement is acceptable |
| Changed function signature | typecheck will surface; fix per release notes |
| CSS class rename | grep `document/theme/` and `document/components/`; rewrite |
| Config schema change | edit `openpress.config.mjs` per release notes |
| Markdown / MDX directive change | grep `document/chapters/`; rewrite per release notes |

If a breaking change has no documented migration in the CHANGELOG, **stop and ask the user** — do not improvise.

### Upgrade do-not

- Do not skip CHANGELOG reading. An undocumented breaking change is a sign to stop, not to guess.
- Do not bundle new feature work with an update. Land the upgrade first, commit, then start new work.
- Do not run `--force` overwrites on workspace files. If a file conflicts, surface it.
- Do not auto-deploy after a successful upgrade. `openpress-deploy` owns its own gate.

## @openpress-comment Operations

Pending `@openpress-comment` markers are source markers, not UI-only notes. Apply them as small source edits close to the marker, then remove the marker only after the comment is resolved or explicitly cleared.

Scope:

- List, apply, resolve, clear markers.
- Edit only the source file containing the marker (paths follow the Source Boundary table above).
- Route domain-heavy rewrites to the owning skill (writing / design / diagram).
- Do not rewrite unrelated sections while resolving one comment.

Operations:

| Need | Action |
| --- | --- |
| See pending comments | `rg "@openpress-comment" document -n` |
| Apply one comment | Edit nearby source, then delete that marker line |
| Clear one without applying | Delete that marker line only after the user asks |
| Clear all comments | Use the comments tab or delete all marker lines only after explicit confirmation |
| Comment is ambiguous | Ask for clarification and leave the marker in place |

After applying, run `npm run openpress:validate`; also run `npm run openpress:render` when layout, visual output, or React/MDX structure changed.

Common mistakes: do not clear a marker just because it was read; do not batch unrelated rewrites under one comment.

## When To Read References

- Read `references/cli-commands.md` when choosing commands, using search/replace, or explaining verification depth.
- Read `references/local-review.md` when opening the workbench, using Document/Design System/Project views, or coordinating visual review before export/deploy.

## Safety Rules

- Preview broad replacements before applying them.
- Do not publish without explicit user confirmation naming the target (handled by `openpress-deploy`).
- Do not claim render, PDF, or deploy readiness without fresh command output.
