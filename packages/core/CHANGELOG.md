# @open-press/core

## 0.5.0

### Minor Changes

- 0169cba: Agent-driven upgrade flow.

  **New commands:**

  - `npx open-press doctor` — diagnose workspace against latest framework state. Reports `@open-press/core` version vs npm latest, installed skill count, and any pending `docs/migrations/<version>.md` notes between current and latest. `--json` for machine-readable output, `--no-cache` to bypass the 24h cache. Always exits 0 (informational only).

  - `npx open-press upgrade` — orchestrate the upgrade. Runs `npm update @open-press/core` (when the workspace declares the dep) and `npx skills upgrade`, then surfaces the list of migration notes for the agent to read. **Does not auto-edit `document/` content** — the agent reads the surfaced `docs/migrations/<version>.md` notes and proposes edits to the user with confirmation. Use `--dry-run` to preview, `--no-deps` / `--no-skills` to target one layer.

  **Dev startup notice:**

  `open-press dev` now runs `doctor` before starting Vite. When the workspace is behind, a single line prints: `○ open-press: @open-press/core 0.4.0 → 0.5.0 · 1 migration note(s) — run npx open-press doctor for details.` Cached for 24h, network failure is silent, never blocks dev.

  **Migration docs:**

  - New `docs/migrations/_template.md` — each release with breaking changes ships a `docs/migrations/<version>.md` file with sections the agent reads.
  - New `docs/migrations/0.4.0.md` — backfilled. Documents the SKILL fold (no document or CLI changes).

  **SKILL update:**

  `openpress` skill's "Updating An Existing Workspace" section rewritten around the new commands: detect (`doctor`), apply (`upgrade`), interpret migration notes, propose document edits with user confirmation. Concrete agent workflow + breaking-change reference table.

### Patch Changes

- 931d4ac: Support framework root dogfood workspaces and correct CLI script paths outside the core package root.

## 0.4.0

### Minor Changes

- 3cb4939: Consolidate internal skills (13 → 11).

  - `openpress-update` folded into `openpress` as an "Updating An Existing Workspace" section. The release-upgrade flow, pre-flight checks, breaking-change reference, and do-not list are now part of the system-operation skill where they naturally belong.
  - `openpress-document-hierarchy` folded into `openpress-writing` as a "Hierarchy" section. Hierarchy decisions (H2/H3/H4 model, TOC depth, appendix placement, H4 granularity) and prose decisions happen in the same workflow; one skill, one routing decision.
  - `references/data-structures-outline.md` moved from the hierarchy skill into `openpress-writing/references/`.

  Lower maintenance surface: 2 fewer SKILL.md files to keep in sync, ~5 fewer cross-references to police. No content lost — same rules, fewer files.

  User impact: agents already in workspaces with `openpress-update` or `openpress-document-hierarchy` SKILL files installed should run `npx skills upgrade` to refresh the catalog.

## 0.3.0

### Minor Changes

- Initial monorepo release of `@open-press/cli` and `@open-press/core` on npm.

  **@open-press/cli** (new): scaffolder for open-press workspaces. Run `npx @open-press/cli init <target> --pack <pack>` to create a fixed-layout document workspace from a bundled template. Supports `editorial-monograph` and `claude-document` style packs, metadata flags, and AI-agent skill installation under `.claude/skills/` and `.agents/skills/`.

  **@open-press/core** (new): framework runtime, CLI engine, render pipeline, and base page primitives (BasePage, BaseCoverPage, BaseTocPage, BaseBackCoverPage, BaseFigure, BaseCallout). Consumed transitively by workspaces scaffolded via `@open-press/cli`. Exposes the `open-press` bin (dev / build / preview / validate / pdf / deploy / export).
