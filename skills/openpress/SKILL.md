---
name: openpress
description: Use when an OpenPress task involves CLI lifecycle, workspace inspection, generated output, PDF/image/Word export, source boundaries, or routing to another OpenPress skill.
---

# OpenPress

Use this skill first for OpenPress CLI and delivery work. Keep authored source, generated output, review, and publishing as separate stages.

## Route

| Need | Skill |
| --- | --- |
| Page artifact creation | `openpress-create-pages` |
| Slide creation or editing | `openpress-create-slide` |
| Authored-content analysis, proposal, or revision | `openpress-collaborate` |
| Pending `@openpress-comment` markers | `openpress-apply-comments` |
| Diagrams | `openpress-diagram-drawing` |
| Package upgrade or migration | `openpress-upgrade` |
| Deploy or publish | `openpress-deploy` |

Load portable language or genre skills only when the content requires them.

## Source Boundary

| Layer | Paths | Rule |
| --- | --- | --- |
| Workspace source | `press/*/press.tsx`, registered MDX/TSX sources, `press/<slug>/{components,theme,media}/`, optional `press/shared/`, `press/design.md`, `openpress/settings.json` | editable |
| Skill source | `skills/`, `.agents/skills/`, `.claude/skills/` | editable for skill work |
| Framework source | `packages/core/`, `packages/cli/`, `apps/web/`, root config/docs/tests | framework work only |
| Review handoff | `.openpress/review/current.json` | `openpress-collaborate` may replace or delete; never deliver or commit |
| Installed framework | `node_modules/@open-press/{core,cli}/` | read-only; fix upstream |
| Generated/cache | `public/openpress/`, `dist-react/`, `.deploy/`, other `.openpress/`, `.turbo/cache/` | never hand-edit |

`openpress/settings.json` owns workspace Appearance, page defaults, caption
numbering, PDF filename, and deploy configuration. Press visual design remains
in `press/design.md` and each Press theme.

If `memory/AGENTS.md` exists, read it first; it identifies a downstream workspace and its project rules.

## Workflow

1. Read workspace instructions and the owning specialist skill.
2. Inspect before broad edits with `inspect --json`, `search --json`, or `rg`.
3. Use `openpress-collaborate` for authored-content interaction; use the format skill for content judgment.
4. Edit only source paths.
5. Follow the review gate below before claiming visual or delivery readiness.

## Review And Delivery Gate

After content, layout, component, Press Tree, or pagination-sensitive theme changes:

```bash
npm run build
npm run dev              # downstream workspace
# npm run dev:workspace  # framework dogfood repo
```

Open the Vite `/workspace` URL and inspect the affected Press. Review is complete only after rendered pages have been checked for page count, overflow/cropping, pagination, typography/media, and pending comments. Fix source and repeat the gate when needed.

Generate a delivery artifact only when the user requests that format or the task explicitly requires its readiness:

```bash
npm run openpress:pdf
npm run openpress:image
npm run openpress:word
```

Run only the requested formats. PDF/image/Word export does not replace Workbench review.

## Refresh Boundary

Vite HMR does not regenerate `public/openpress/<slug>/document.json`. After MDX, Press Tree, component, metadata, or pagination-sensitive theme edits, run `npm run build` before reviewing. For a faster inner loop, run `open-press export .` and refresh the browser. Pure CSS edits that do not move content may use HMR alone.

## CLI And References

- Prefer package scripts. Downstream commands without a wrapper use `open-press`; the framework repo uses `node packages/core/engine/cli.mjs` because its binary is not built locally.
- Read `references/cli-commands.md` only for commands not shown above, source search/replace, inspect, or nonstandard verification depth.
- Read `references/local-review.md` whenever the review gate applies or Workbench controls are needed.
- Read `references/render-boundary.md` only for framework work that changes the Press Tree/runtime contract, not ordinary workspace authoring.
- New artifacts are owned by `openpress-create-pages` or `openpress-create-slide`; do not use create commands as upgrade tools.

## Safety

- Preview broad replacements before applying them.
- Do not publish without explicit confirmation naming the target; use `openpress-deploy`.
- Do not claim render, PDF, image, Word, or deploy readiness without fresh output from the relevant command.
