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
| Workspace source | `openpress.config.mjs`, `document/index.tsx`, registered MDX source roots/files from `export const sources`, `document/design.md`, `document/theme/`, `document/components/`, `document/media/` | yes — domain skills |
| Skill / pack source | `skills/<pack>/SKILL.md`, `skills/<pack>/starter/**`, other skill files under `skills/` | yes — `openpress-style-pack-contributor` for packs; skill maintainers for own skill |
| Framework | `engine/`, `src/`, `tests/`, `docs/superpowers/`, `vite.config.ts`, `tsconfig.json`, `index.html` | yes — framework agents only |
| Generated | `public/openpress/`, `dist-react/`, `.deploy/`, `.openpress/` | **never hand-edit** |

If a workspace lacks `document/index.tsx`, it is not a current Press Tree workspace. Stop and ask whether to initialize a new workspace or manually migrate the document source.

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

This skill owns the framework upgrade flow (formerly the separate `openpress-update` skill, folded here in v0.4.0).

### Session warmup (do this once per conversation)

The **first time** you load this skill in a session — no matter why (routing a write, validating, deploying, anything) — do a quick stale check before responding to the user:

1. Read `.openpress/cache/doctor.json` if it exists.
2. **If cache exists and `stale: false` and `cachedAt` is within 24h** → say nothing. Continue with the user's request.
3. **If cache exists and `stale: true`** → mention to the user *once* in the current session, then continue:
   > Heads up: `open-press` reports an update is available (e.g. `@open-press/core 0.4.0 → 0.5.0`, or N pending migration note(s)). I can run `npx open-press upgrade` after we finish this task — or now if you prefer.
4. **If cache is missing or older than 24h** → run `npx open-press doctor` once silently, store the result, then apply rules 2/3.

This warmup is cheap (cache read, no network when fresh) and ensures users hear about updates even when they didn't run `open-press dev` recently. **Don't repeat the mention within the same session** — it's a one-shot signal, not a recurring nag.

### Explicit upgrade trigger

User says any of:

- "升級 open-press / 更新到最新版"
- "update open-press / upgrade to latest"
- "is there a new version" / "拉新版的 engine"
- "doc 開發環境跳出 update 提示" — `open-press dev` prints a one-line notice when the workspace falls behind; `npx open-press doctor` shows full state.
- After the user pulls a new git tag and asks to verify the workspace still works.
- After you mentioned the update during warmup and the user confirms.

### Detect

Run **`npx open-press doctor`** first. It surfaces:

- `@open-press/core` installed version vs. latest on npm (cached 24h)
- Number of skills installed under `.agents/skills/` and the `skills-lock.json` source
- Any `docs/migrations/<version>.md` notes between current and latest versions

Add `--json` for machine-readable output, `--no-cache` to force a fresh check.

Doctor is informational only and exits 0 even when stale — it is safe to call any time.

### Apply

Run **`npx open-press upgrade`** (defaults: refresh deps, refresh skills, surface pending migrations).

```bash
# Dry run — list what would happen, no changes
npx open-press upgrade --dry-run

# Default: run npm update + npx skills upgrade, print migration list
npx open-press upgrade

# Targeted variants
npx open-press upgrade --no-skills   # framework only
npx open-press upgrade --no-deps     # skills only
```

The upgrade command **does not touch `document/` content**. It surfaces `docs/migrations/<version>.md` and expects the agent to read those notes, identify document-level changes, propose edits, and apply with user confirmation.

### Agent workflow

1. Run `npx open-press doctor`. Report current vs. latest, count of pending migrations.
2. Ask the user "go ahead with upgrade?" before running. Mention what'll happen (deps, skills, migrations to read).
3. Run `npx open-press upgrade`.
4. **For each migration file printed in the output**:
   - Read `docs/migrations/<version>.md` fully.
   - Look for **"Document-level changes"** section. Each item maps to specific grep + rewrite.
   - Grep `document/` for the affected patterns. Show the user the locations.
   - Propose edits. Apply only after user confirms.
5. Re-run verification: `npm run openpress:validate && npm run openpress:render`. Fix anything broken (typecheck failures, render warnings) using the migration notes.
6. Report to the user: starting version → ending version, what was applied, anything that needed manual edit.

### Breaking change reference

| Change type | Where to look | Action |
| --- | --- | --- |
| Renamed runtime identifier (e.g. old BasePage wrappers → `Frame` / `MdxArea`) | `document/index.tsx`, `document/components/`, registered source implementation files | grep old name, rewrite at every callsite |
| Removed export | same | grep workspace; if replacement isn't obvious, ask the user |
| Changed function signature | `document/index.tsx`, `document/components/` | typecheck will surface; fix per release notes |
| CSS class rename | `document/theme/`, `document/components/` | grep and rewrite |
| Config schema change | `openpress.config.mjs` | edit per release notes |
| MDX directive change (e.g. `<Caption>` → `<TableCaption>`) | `document/chapters/**/*.mdx` | grep and rewrite |
| SKILL catalog change (skill folded / renamed) | `.agents/skills/` | `npx skills upgrade` handles it; remove any stale references in user's own SKILL.md files |

If a breaking change has no documented migration in `docs/migrations/<version>.md`, **stop and ask the user** — do not improvise.

### Upgrade do-not

- Do not skip migration notes. Undocumented breaking change = stop, ask user.
- Do not bundle new feature work with an upgrade. Land the upgrade first, commit, then start new work.
- Do not run `--force` overwrites on workspace files. If a file conflicts, surface it.
- Do not auto-deploy after a successful upgrade. `openpress-deploy` owns its own gate.
- Do not edit `document/` files without user confirmation — even when a migration note suggests an exact grep + replace.

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
