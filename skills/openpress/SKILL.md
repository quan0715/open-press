---
name: openpress
description: Use when operating a open-press workspace or framework checkout through CLI commands, discovering project status, validating/exporting/rendering/PDF output, inspecting structure/issues, searching or safely replacing source text, managing pending @openpress-comment markers, or deciding which open-press skill owns a task.
---

# open-press Core

open-press owns the tool surface and delivery boundaries. **Use this skill first** when the task involves the CLI, workspace status, generated output, or deciding which specialist skill should take over.

This skill is also the **single source of truth** for the source vs generated boundary. Other skills reference this section instead of re-listing paths.

## Responsibilities

- Choose safe open-press CLI commands.
- Define the canonical source vs framework vs generated path boundary (see below).
- Inspect workspace state before broad edits.
- Open and manage the local workbench review loop.
- Manage `@openpress-comment` markers (list, apply, resolve, clear).
- Route domain work to the owning skill.
- Require verification before declaring output ready.

## Skill Routing

open-press skills fall into three categories:

1. **System operation skills**: how to operate open-press itself. `openpress` is the main entry point; lifecycle helpers cover init, update, and deploy.
2. **Writing skills**: content strategy, suggested skeletons, language, tone, genre rules. They do not own CLI commands or validation depth.
3. **Style pack skills**: reusable visual starters under `skills/<pack>/starter/`. They do not own workspace operation.

| Skill | Owns |
| --- | --- |
| `openpress` | CLI, inspect/search/replace, source/generated boundary, validation/export/render/PDF command choice, `@openpress-comment` operations, skill routing |
| `openpress-init` | First-time intake conversation, style-pack recommendation, metadata gathering, running `init`, handing off to writing/design |
| `openpress-update` | Release upgrade flow: pulling new framework, CHANGELOG-driven migrations, post-upgrade verification |
| `openpress-writing` | Reader-facing content, narrative, captions, factual boundaries, portable writing skill loading |
| `openpress-document-hierarchy` | H1/H2/H3/H4 model, TOC depth, reader outline, appendix placement |
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
node engine/cli.mjs init <target> --skill <pack-name>
```

Style packs are auto-discovered from `skills/<pack>/SKILL.md` where `starter/` exists.

## Updating An Existing Workspace

Route to `openpress-update` for release-driven upgrades.

## @openpress-comment Operations

Pending `@openpress-comment` markers are source markers, not UI-only notes. Apply them as small source edits close to the marker, then remove the marker only after the comment is resolved or explicitly cleared.

Scope:

- List, apply, resolve, clear markers.
- Edit only the source file containing the marker (paths follow the Source Boundary table above).
- Route domain-heavy rewrites to the owning skill (writing / hierarchy / design / diagram).
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
