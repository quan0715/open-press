# @open-press/core

## 0.6.0

### Minor Changes

- f8fdecd: Third bundled pack: `academic-paper`.

  A single-column A4 academic / research paper starter — serif title block, abstract band, index terms, numbered sections (I, II, III), italic sub-sections (A, B, C), `[N]` numeric references, sample chapters derived from the IEEE conference template structure (Introduction, Methods, Results & Discussion, Acknowledgment, References).

  ```bash
  npx @open-press/cli init my-paper --pack academic-paper
  ```

  Suitable for: draft / preprint / iteration. Not suitable for camera-ready IEEE / ACM submission — those still need LaTeX with the publisher's class file.

  Two-column body and other paged-document features (footnotes, cross-references with page numbers, running headers) are intentionally **out of scope for this release**. They'll be designed as a self-maintained engine evolution + multi-mode architecture in a separate spec round, rather than depending on a third-party pagination polyfill.

- c490653: `@open-press/cli init` accepts third-party style packs via `--pack github:owner/repo`.

  ```bash
  # bundled (unchanged)
  npx @open-press/cli init my-doc --pack editorial-monograph

  # third-party (new)
  npx @open-press/cli init my-thesis --pack github:quan0715/openpress-pack-nycu-thesis
  npx @open-press/cli init my-paper --pack github:foo/their-pack#v1.2
  ```

  The cli fetches `starter/document/` from the named repo (default branch, or `#ref` for a specific branch/tag) and copies it into the new workspace. If the pack repo also publishes SKILL files at `skills/<name>/`, they're installed via `npx skills add <owner>/<repo>` after the framework skills, so the agent picks them up automatically.

  Repo layout convention for third-party packs is documented in `docs/style-pack-authoring.md`. Empty-result extraction (the named repo exists but has no `starter/document/` at root) fails with a clear error pointing at the expected layout.

  The two bundled packs (`editorial-monograph`, `claude-document`) keep their current short-name behaviour; only the cli's validator widened to accept the `github:` prefix.

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

  **@open-press/core** (new): framework runtime, CLI engine, render pipeline, and document primitives. Consumed transitively by workspaces scaffolded via `@open-press/cli`. Exposes the `open-press` bin (dev / build / preview / validate / pdf / deploy / export).
