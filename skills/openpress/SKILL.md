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
| `openpress` | CLI, inspect/search/replace, source/generated boundary, validation/export/render/PDF command choice, framework doctor/upgrade/migrate, skill routing |
| `openpress-create-pages` | Creating or adding page-based artifacts: reports, proposals, papers, books, teaching notes, page Press Tree, first-pass theme, hierarchy, prose structure, captions, portable writing skill loading |
| `openpress-create-slide` | Creating or adding slide decks: slide Press Tree, `slide-16-9` defaults, `DeckSlide`, slide layouts, reusable UI primitives, deck structure, slide theme, motion/assets discipline |
| `openpress-apply-comments` | Pending `@openpress-comment` marker workflow: list, apply, resolve, clear, verify |
| `openpress-diagram-drawing` | Diagram semantics: nodes, arrows, labels, states, figure text |
| `openpress-deploy` | Deploy config, preflight, dry run, public publish confirmation |
| Portable writing skills (`chinese-ai-writing-polish`, `teaching-notes-writing`, …) | Language, tone, genre, learner-facing rules. Loaded by `openpress-create-pages` when page content requires them. |

## Source Boundary (canonical)

Edit source, not generated output. **This list is the single authoritative version**; other skills link here.

| Layer | Paths | Edit? |
| --- | --- | --- |
| Workspace source | `press/*/press.tsx`, registered source roots/files (`press/<slug>/chapters/**` for MDX Press), `press/<slug>/components/`, `press/<slug>/theme/`, `press/<slug>/media/`, optional `press/shared/`, `press/design.md`, and the `"openpress"` field in workspace `package.json` | yes — skills |
| Skill source | `skills/<name>/SKILL.md`, `.agents/skills/<user>/`, `.claude/skills/<user>/` | yes — framework or user-authored skill rules |
| Framework source (this repo) | `packages/core/`, `packages/cli/`, `apps/web/`, root build config, framework docs/tests | yes — framework agents only |
| Framework dependency (downstream workspace) | `node_modules/@open-press/core/`, `node_modules/@open-press/cli/` | read-only during document work; fix upstream |
| Generated/cache | `public/openpress/`, `dist-react/`, `.deploy/`, `.openpress/`, `.turbo/cache/` | **never hand-edit** |

If a workspace lacks `press/*/press.tsx`, it has runtime files but no Press Tree source yet. Route to `openpress-create-pages` for page-based artifacts or `openpress-create-slide` for slide decks. Do not use the removed scaffolding command as a user-facing skill route.

If `memory/AGENTS.md` exists, read it before framework-level `AGENTS.md`; it usually marks a downstream workspace where `press/` is git-ignored project content, not source you commit upstream.

### Press Tree Render Boundary

- `press/<slug>/press.tsx` owns one rendered Press tree: `<Press>`, manuscript helpers such as `<Toc>` / `<Sections>`, and any custom frame components.
- `<Press sources>` owns MDX registration. The helper reads the registered source, not a hard-coded folder.
- `<Press componentsDir>` and `<Press mediaDir>` may be a path or path array. Defaults include folder-local `./components` / `./media` and `press/shared/*`.
- `<Frame>` is the only core page primitive. Cover, TOC, openers, content pages, and back cover are all frame instances from the engine's perspective.
- `<MdxArea>` and helper wrappers such as `<TocArea>` are measurable content slots. TOC is implemented as a generated `toc:<sourceId>` chain, not as a reader/runtime special case.
- Page chrome belongs to workspace components. Headers, footers, running titles, page numbers, and TOC page layout must be implemented in the workspace Press tree or source-tree components; the reader runtime displays final HTML and must not paginate or patch page shell after export.

## Workflow

1. Orient: read `AGENTS.md`, `memory/AGENTS.md` if present, and the relevant specialist skill.
2. Inspect before broad edits with `inspect --json`, `search --json`, or `rg`.
3. Route domain work to the owning skill instead of duplicating its rules.
4. Edit only source paths in the owning area (see boundary table).
5. Verify with the narrowest command that proves the claim.

### Hot reload boundary

Vite Hot Reload covers React UI chrome (workbench panels, navigation, inspector) and framework CSS (`packages/core/src/styles/` in this repo, or `node_modules/@open-press/core/dist/` in downstream workspaces). It does **not** regenerate `public/openpress/<slug>/document.json`. So edits to MDX content, `press/*/press.tsx`, `press/<slug>/components/**/*.tsx`, `package.json`'s `"openpress"` metadata, or any `press/<slug>/theme/**` / `press/shared/theme/**` rule that changes pagination capacity require a re-export before the workbench / public viewer shows the change:

```bash
npm run build              # validate + render (includes the export step)
# — or, for the inner export only, without the full Vite bundle step:
node engine/cli.mjs export .
# then refresh the browser
```

Pure CSS edits that don't move blocks are picked up by HMR — re-export is only required when content, pagination, or document.json metadata changes. After applying a non-CSS edit to `press/`, run `npm run build` before reporting "done"; if the user asks "why didn't my change show up?", check whether `document.json` was regenerated since the edit.

## Starting A New Workspace

Starting a new artifact is owned by `openpress-create-pages` or `openpress-create-slide`.

The global create package is the low-level workspace bootstrapper:

```bash
npm create @open-press <target> -- --type slides
```

Creation skills call that command when they need a fresh slides workspace, then add the appropriate Press Tree, theme, source folders, and components. Inside an existing workspace, slide decks are added with `open-press create <slug> --type slides`. `openpress` does not own intake for new artifacts.

Use `openpress` for system lifecycle work on existing workspaces: `doctor`, `upgrade`, `migrate`, validation, render, PDF/image export, deploy dry-runs, and source search/replace.

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
