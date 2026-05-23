# @open-press/core

## 0.7.0

### Minor Changes

- 718d2d1: **Press Tree render architecture** — full refresh of the React export pipeline (clean break, no v0.5 compatibility).

  The render kernel no longer knows about `cover`, `toc`, `chapter`, or `back-cover` as built-in concepts. Workspaces describe their document as a React tree using three primitives:

  - `Press` — root composition boundary.
  - `Frame` — a single fixed-layout surface (replaces `BasePage` and friends).
  - `MdxArea` — a measurable slot consuming a content chain, with `overflow="extend|truncate|error"` control.

  Sources are now declarative descriptors:

  ```tsx
  export const sources = {
    story: mdxSource({ preset: "section-folders", root: "chapters" }),
  };

  export default function MyPress() {
    return (
      <Press>
        <Cover />
        <Toc source="story" />
        <Sections source="story" page={Page} />
        <BackCover />
      </Press>
    );
  }
  ```

  Three `mdxSource()` presets: `section-folders` (existing convention), `section-files` (flat file-per-section), `file-list` (explicit ordering).

  Manuscript helpers (`Toc`, `Sections`, `Chapters` alias) ship in `@open-press/core/manuscript`. `mdxSource()` lives in `@open-press/core/mdx`. Subpath exports keep the public surface tight without committing to separate npm packages.

  `Toc` is implemented as a manuscript helper, not a core kernel special case. Registered sources generate a synthetic `toc:<sourceId>` chain; `TocArea` consumes it with the same allocation path as `MdxArea`.

  Reader-side pagination is removed. The export pipeline writes final frame HTML into `document.json`; the reader displays that HTML and no longer mutates headings/captions, injects footers, or reflows pages at runtime. Page shell belongs to workspace components.

  MDX source resolution now derives manuscript TOC entries from actual `##` / `###` headings, not folder slugs. Heading numbering is written during export as `data-chapter="01"` / `data-section="1.1"` attributes so themes can render numbering with CSS without reader-side mutation.

  **Removed (no compatibility layer):**

  - `BasePage`, `BaseCoverPage`, `BaseTocPage`, `BaseContentPage`, `BaseBackCoverPage`.
  - Legacy named exports (`cover`, `toc`, `backCover`) from `document/index.tsx`.
  - The `migrate-to-react` CLI command.
  - Implicit chapter discovery as the only source mechanism.
  - Legacy `chapter.tsx` meta/opener auto-discovery. Section openers are explicit workspace components in the Press tree.

  The top-level purity gate remains: `config` must be data, `sources` must be pure `mdxSource()` descriptors, and filesystem/network/process side effects are rejected before module execution. Default-exported function bodies can contain normal React component logic, including hooks and `.map()`.

  All `<Frame>` instances require a stable `frameKey`; source roots and file-list entries must stay inside `document/`.

  **Workspace data attributes:**

  - `data-frame-role` (new, opaque role like `"manuscript.content"`).
  - `data-page-kind` (derived from role's last segment — reader CSS keeps using this).
  - `data-section-id` replaces `data-chapter-slug` for section-scoped CSS.

  **Migration:** Workspaces written for v0.5.x must rewrite `document/index.tsx` to default-export a Press component. Pre-1.0 minor bump is acceptable per repo policy; no production deployments exist to break.

  See `docs/superpowers/specs/2026-05-23-press-tree-render-architecture-design.md` for full design rationale.

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
