---
name: openpress
description: Use when operating an open-press workspace through CLI commands, discovering project status, validating/exporting/rendering/PDF output, inspecting structure/issues, searching or safely replacing source text, routing pending @openpress-comment marker work to openpress-apply-comments, upgrading the framework to a newer release, or deciding which open-press skill owns a task.
---

# open-press Core

open-press owns the tool surface and delivery boundaries. **Use this skill first** when the task involves the CLI, workspace status, generated output, framework upgrades, or deciding which specialist skill should take over.

This skill is also the **single source of truth** for the source vs generated boundary. Other skills reference this section instead of re-listing paths.

## Responsibilities

- Choose safe open-press CLI commands.
- Define the canonical source vs framework vs generated path boundary (see below).
- Inspect workspace state before broad edits.
- Open and manage the local workbench review loop.
- Route `@openpress-comment` marker work to `openpress-apply-comments`.
- Drive the release upgrade flow (pull new framework, apply migrations, verify).
- Route domain work to the owning skill.
- Require verification before declaring output ready.

## Skill Routing

| Skill | Owns |
| --- | --- |
| `openpress` | CLI, inspect/search/replace, source/generated boundary, validation/export/render/PDF command choice, framework upgrades, skill routing |
| `openpress-apply-comments` | Pending `@openpress-comment` marker workflow: list, apply, resolve, clear, verify |
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
| Skill / pack source | `skills/<name>/SKILL.md`, `skills/<pack>/starter/**`, `.agents/skills/<user>/`, `.claude/skills/<user>/` | yes — `openpress-style-pack-contributor` for bundled packs; user-authored skills for local rules |
| Framework source (this repo) | `packages/core/`, `packages/cli/`, `apps/web/`, root build config, framework docs/tests | yes — framework agents only |
| Framework snapshot (downstream workspace) | `engine/`, `src/openpress/`, `src/styles/`, `vite.config.ts`, `tsconfig.json`, `index.html` | read-only during document work; fix upstream unless the user asks for framework surgery |
| Generated/cache | `public/openpress/`, `dist-react/`, `.deploy/`, `.openpress/`, `.turbo/cache/` | **never hand-edit** |

If a workspace lacks `document/index.tsx`, it is not a current Press Tree workspace. Stop and ask whether to initialize a new workspace or manually migrate the document source.

If `memory/AGENTS.md` exists, read it before framework-level `AGENTS.md`; it usually marks a downstream document workspace where `document/` is git-ignored project content, not source you commit upstream.

### Press Tree Render Boundary

- `document/index.tsx` owns the rendered tree: `<Press>`, workspace `Cover` / `BackCover`, manuscript helpers such as `<Toc>` / `<Sections>`, and any custom frame components.
- `export const sources` owns MDX registration. Starter packs usually use `mdxSource({ preset: "section-folders", root: "chapters" })`, but the helper reads the registered source, not a hard-coded folder.
- `<Frame>` is the only core page primitive. Cover, TOC, openers, content pages, and back cover are all frame instances from the engine's perspective.
- `<MdxArea>` and helper wrappers such as `<TocArea>` are measurable content slots. TOC is implemented as a generated `toc:<sourceId>` chain, not as a reader/runtime special case.
- Page chrome belongs to workspace components. Headers, footers, running titles, page numbers, and TOC page layout must be implemented in `document/index.tsx` or `document/components/`; the reader runtime displays final HTML and must not paginate or patch page shell after export.

## Workflow

1. Orient: read `AGENTS.md`, `memory/AGENTS.md` if present, and the relevant specialist skill.
2. Inspect before broad edits with `inspect --json`, `search --json`, or `rg`.
3. Route domain work to the owning skill instead of duplicating its rules.
4. Edit only source paths in the owning area (see boundary table).
5. Verify with the narrowest command that proves the claim.

### Hot reload boundary

Vite Hot Reload covers React UI chrome (workbench panels, navigation, inspector) and framework CSS (`src/styles/` in a downstream snapshot, `packages/core/src/styles/` in this repo). It does **not** regenerate `public/openpress/document.json`. So edits to MDX content, `document/index.tsx`, `document/components/**/*.tsx`, `openpress.config.mjs` metadata, or any `document/theme/**` rule that changes pagination capacity require a re-export before the workbench / public viewer shows the change:

```bash
npm run openpress:export   # rewrites public/openpress/document.json
# then refresh the browser
```

Pure CSS edits that don't move blocks are picked up by HMR — re-export is only required when content, pagination, or document.json metadata changes. After applying a non-CSS edit to `document/`, run `npm run openpress:export` before reporting "done"; if the user asks "why didn't my change show up?", check whether `document.json` was regenerated since the edit.

## Starting A New Workspace

Always route to `openpress-init`. It owns environment preflight, target checks, intake, pack choice, init command construction, and first verification.

The CLI itself is:

```bash
npx @open-press/cli init <target> --pack <pack-name>
```

Available packs: `editorial-monograph`, `claude-document`, `academic-paper`. Run without `--pack` only when the user explicitly wants an empty skeleton.

## Updating An Existing Workspace

Use `references/upgrade.md` when the user explicitly asks to upgrade, check for a new version, respond to an update notice, or apply migration notes. Do not run upgrade commands during ordinary writing/design/deploy work.

## @openpress-comment Routing

Use `openpress-apply-comments` when the user asks to list, apply, resolve, clear, or inspect pending `@openpress-comment` markers. Keep this skill focused on the source boundary and command surface; the comment workflow lives in the dedicated workflow skill.

## When To Read References

- Read `references/cli-commands.md` when choosing commands, using search/replace, or explaining verification depth.
- Read `references/local-review.md` when opening the workbench, using the inspector / page zoom / inline source editor, or coordinating visual review before export/deploy.
- Read `references/upgrade.md` only for framework/skill upgrade work.

## Safety Rules

- Preview broad replacements before applying them.
- Do not publish without explicit user confirmation naming the target (handled by `openpress-deploy`).
- Do not claim render, PDF, or deploy readiness without fresh command output.
