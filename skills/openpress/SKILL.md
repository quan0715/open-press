---
name: openpress
description: Use when operating a open-press workspace or framework checkout through CLI commands, discovering project status, validating/exporting/rendering/PDF output, inspecting structure/issues, searching or safely replacing source text, or deciding which open-press skill owns a task.
---

# open-press Core

open-press owns the tool surface and delivery boundaries. Use this skill first when the task involves the CLI, workspace status, generated output, or deciding which specialist skill should take over.

## Responsibilities

- Choose safe open-press CLI commands.
- Keep source files separate from generated output.
- Inspect workspace state before broad edits.
- Open and manage the local workbench review loop.
- Route writing, design, hierarchy, deploy, and style-pack tasks to the owning skill.
- Require verification before declaring output ready.

## Boundaries

| Skill | Owns |
| --- | --- |
| `openpress` | CLI, inspect/search/replace, source/generated boundary, validation/export/render/PDF command choice |
| `openpress-apply-comments` | pending inspector comments, `@openpress-comment` marker apply/resolve/clear flow |
| `openpress-writing` | reader-facing content, narrative, captions, factual boundaries |
| `openpress-document-hierarchy` | H1/H2/H3/H4 model, TOC depth, reader outline, appendix placement |
| `openpress-design` | visual system, theme CSS, components, PDF-safe layout |
| `openpress-diagram-drawing` | diagram semantics: nodes, arrows, labels, states, figure text |
| `openpress-deploy` | deploy config, preflight, dry run, public publish confirmation |
| `openpress-style-pack-contributor` | bundled style-pack structure and scratch-workspace validation |
| portable writing skills | genre, tone, language, and teaching-specific writing rules |

## Source Boundary

Edit source, not generated output.

- Source: `openpress.config.mjs`, `document/index.tsx`, `document/chapters/`, `document/design.md`, `document/theme/`, `document/components/`, `document/media/`, `skills/`. If a workspace lacks `document/index.tsx`, run `migrate-to-react` before broad structural rewrites.
- Framework: `engine/`, `src/`, `tests/`, `docs/superpowers/`.
- Generated: `public/openpress/`, `dist-react/`, `.deploy/`; do not hand-edit these.

If `memory/AGENTS.md` exists, read it before framework-level `AGENTS.md`; it usually marks a downstream document workspace.

## Workflow

1. Orient: read `AGENTS.md`, `memory/AGENTS.md` if present, and the relevant specialist skill.
2. Inspect before broad edits with `inspect --json`, `search --json`, or `rg`.
3. Route domain work to the owning skill instead of duplicating its rules.
4. Edit only source files in the owning area.
5. Verify with the narrowest command that proves the claim.

## When To Read References

- Read `references/cli-commands.md` when choosing commands, using search/replace, or explaining verification depth.
- Read `references/local-review.md` when opening the workbench, using Document/Design System/Project views, or coordinating visual review before export/deploy.
- Use `openpress-apply-comments` when `@openpress-comment` markers exist or the user asks to apply/resolve inspector comments.

## Safety Rules

- Preview broad replacements before applying them.
- Do not publish without explicit user confirmation naming the target.
- Do not claim render, PDF, or deploy readiness without fresh command output.
