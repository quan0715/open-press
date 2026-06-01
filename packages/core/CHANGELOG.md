# @open-press/core

## 1.1.4

### Patch Changes

- 408f6f4: Three improvements to large-document export:
  - **Stop letting page overflow block PDF / image export.** `waitForPrintReady` used to declare ready only when every page fit perfectly, so a single overflowing row stalled the entire export until the deadline expired and the run reported a misleading "pagination timed out". Readiness is now driven by _layout stability_ (page count and overflow signature stay unchanged for `OPENPRESS_PRINT_READY_STABLE_MS`, default 300 ms). Overflow no longer gates the export — it logs a single warning with the affected page numbers so authors can fix the source.
  - Replace the hard 30s deadline with a progress-aware idle window + hard cap. `OPENPRESS_PRINT_READY_IDLE_MS` (default 30s) and `OPENPRESS_PRINT_READY_TIMEOUT_MS` (default 5 min) tune the no-progress / total-time guards; inspection ships the equivalent `OPENPRESS_INSPECTION_IDLE_MS` / `OPENPRESS_INSPECTION_TIMEOUT_MS`. Timeout errors now include the last observed page count and overflowing-page count, so genuine stalls are easy to tell apart from a slow-but-progressing render.
  - `openpress image` accepts `--pages <selector>` to export a subset of pages: comma-separated singles, closed ranges (`3-7`), and open-ended ranges (`15-`, `-5`) are all supported. Filenames keep the original page index (e.g. `page-005.png`) so slices stay unambiguous.

## 1.1.3

### Patch Changes

- 39bbf0d: Drop the inspector / inline-edit outline chrome in the reader runtime so hovering and selecting blocks no longer paints outlines or runs transitions; the cursor (`crosshair` / `text` / `pointer`) is now the sole mode indicator, keeping the rendered page visually stable while tools are open.
- 68435a1: Document and ship the `Text` object contract, including automatic source-range mapping for literal TSX text so slide/card/canvas copy can be commented on and inline-edited without hand-written source refs.
- 2eac5df: Add slide Press presentation routing with a dedicated single-page presenter, new-tab fullscreen entry, and immersive chrome-hidden mode.

## 1.1.2

### Patch Changes

- 11dbcb1: Fix workbench routing and slide thumbnail overflow. The dev URL now opens `/workspace`, document previews use `/<press-slug>/preview`, and thumbnail navigation scrolls within the left panel without overlapping the page counter.

## 1.1.1

### Patch Changes

- Generate a package-owned TypeScript project config for workspaces that do not vendor `tsconfig.json`.

## 1.1.0

### Minor Changes

- Move OpenPress workspaces to a package-owned runtime model.

  The CLI now scaffolds a workspace that depends on `@open-press/core` and `@open-press/cli` instead of copying framework internals such as `engine/`, `src/openpress/`, `index.html`, and `vite.config.ts` into the user project. Runtime commands exposed by `open-press` delegate into `@open-press/core`, whose packaged Vite entry, browser shell, render engine, and static server are used directly from `node_modules`.

## 1.0.0

### Major Changes

- 8c528ad: 1.0 contract release. Breaking changes:
  - `<Workspace>` is now required at the root of `press/index.tsx`; `<Press>` lives as a child, and multi-Press workspaces are first-class (each `<Press>` exports to `/openpress/<slug>/document.json`).
  - Document metadata (`title` / `subtitle` / `organization` / `page` / `sources` / `captionNumbering`) moves onto `<Press>` JSX props. `export const config` and `export const sources` are removed.
  - `openpress.config.mjs` is removed. Operational settings (deploy / pdf) live in the workspace `package.json` under the `"openpress"` field; paths are convention (`press/`, `press/<slug>/chapters/`, `press/theme/`, `public/openpress/`, `dist-react/`).
  - Workspace folder renamed from `document/` → `press/`. The dogfood and starter skills are migrated.
  - Reader gains a workspace gallery for multi-Press projects, per-page PNG export, page thumbnails for canvas-style Press, and a back-to-workspace button.
  - New built-in page presets `a4`, `social-square`, `slide-16-9` and improved init metadata propagation.

## 0.8.0

### Minor Changes

- **Workbench architecture**: the monolithic `workbench.tsx` is split into a modular structure under `workbench/{shell,panels,actions,inspector,mentions,project,document}/`. New panels: `DeploymentControl`, `SearchControl`, `PendingCommentsPanel`, `DocumentPanel`, `ProjectEntryPanel`, plus `WorkbenchShell` and `InlineInspectorLayer`.
- **Module reorganization**: source tree split into typed subdirectories:
  - `app/`: `OpenPressApp`, `OpenPressRuntime` (replaces the old `App.tsx` + `renderer.tsx`)
  - `document-model/`: `anchorMap`, `documentIndexes`, `documentTypes`, `objectEntityModel`, `projectIdentity`, `reactDocumentMetadata`
  - `reader/`: `PublicReaderPage`, `ReaderNavigationPanel`, `useReaderRuntime`, registry/route/scroll/state helpers
  - `shared/`: `frameScheduler`, `runtimeMode`, `Panel`, `numberUtils`
- **Object-entity model**: `Frame` and `MdxArea` now expose `data-openpress-object-id`. New `document-model/objectEntityModel` defines the id format.
- **`MediaFigure` / `ImageFigure`**: new core primitives that accept `src/alt/caption` and resolve relative paths to `/openpress/media/...` automatically.
- **`<Sections>` default page**: `page` prop becomes optional; when omitted the built-in `DefaultSectionPage` renders the standard manuscript frame.
- **Engine helpers**: new `engine/react/{http-json,object-entities,source-edit-endpoint}.mjs` and `engine/runtime/{file-walk,path-utils}.mjs` runtime helpers. `engine/runtime/source-text-tools` exports TypeScript definitions.
- **Dev endpoints**: vite plugin wires `/__openpress/search` and `/__openpress/source-edit` middlewares for the new workbench search + inline editing flows.
- **Inline source editor**: ships the `InlineSourceEditorLayer` UI on top of `useInlineDocumentEditor` + `/__openpress/source-edit`. The hook now uses a `MutationObserver` so newly inserted blocks become editable, and routes mouse clicks through `focus()` to preserve selection on `contenteditable` boundaries. Workbench wires `sourceEditorTarget` state into the layer.
- **Table editing in the source pipeline**: table captions are emitted as standalone source blocks (`kind=element`, `name=caption`, `layout="attached"`) with `data-openpress-block-id`/`data-openpress-object-id` markers and preserved source positions; the allocator treats `layout="attached"` blocks as non-paginable. `applySourceBlockTableCellEditToText` (in `engine/runtime/source-text-tools`) accepts a `cellIndex` so the inline source editor can target a single `<td>`.
- **Reader pagination**: arrow-key pagination now defers to the user's active text selection. Shift-arrow / mouse-drag selections no longer get swallowed by the page-turn shortcut.
- **Page zoom + spread layout**: new `reader/pageViewportScaleModel` + `usePageViewportScale` hook drive a `--openpress-page-viewport-scale` CSS variable on the page container; the workbench toolbar exposes a `PageZoomControl` dropdown with fit-width / fit-page / fixed percentages plus a one-page / two-page spread toggle.
- **Inspector cell-precision comments**: `CommentDraft` gains an optional `targetObjectId` so a comment can point at a sub-block (e.g. a single table cell) while still attributing the source position to its enclosing block. `formatInspectorHint` carries the value through to the wire hint.
- **Shared `WorkbenchDialog` shell**: portal + backdrop + header (eyebrow / title / title-meta / close) + optional footer. `DeploymentControl`, `SearchControl`, and `ProjectPreviewDialog` all render through this shell now, replacing the prior per-dialog scaffolding under `openpress-deploy-dialog-*` / `openpress-search-dialog-*` / `openpress-project-preview-dialog__*`.
- **`WorkbenchControlPanel` registry**: `HtmlWorkbench` now accepts an `extraControlPanels?: WorkbenchPanel[]` prop and renders the right-side panel from a `{ id, render }` registry. Built-in panels (pending comments, project entry) ship as the first entries.
- **Workbench state hooks**: extract `useDeploymentWorkbench` and `useInspectorComments` from `HtmlWorkbench`; `useReaderRuntime` is split into focused sub-hooks (`usePanelState`, `useReaderScrollAnchor`, `useReaderHashSync`, `useReaderKeyboardNav`).
- **`InlineInspectorLayer` memoization**: now wrapped in `React.memo` with a stable `geometryVersion` prop so the geometry / event listeners no longer rebuild on every parent render.
- **Panels open lazily**: `usePanelState` now defaults both panels closed, so the reader opens with a clean stage; resize never auto-opens them.

### Patch Changes

- Inspector: fix comment-marker count and multi-target marker rendering.
- Inspector: object-entity id helpers consolidate in `document-model/objectEntityModel` instead of being duplicated inside `Frame`, `MdxArea`, manuscript `TocArea`, and `PublicReaderPage`.
- Inline editor: `useInlineDocumentEditor` exposes `onDocumentEdited`; `OpenPressApp` re-loads `/openpress/document.json` after a successful inline edit so derived indexes stay in sync.
- Dev: reset Vite optimizer cache so workspace-side dependencies are picked up.
- Workbench dialog: viewport-aware width + max-height so a big media preview doesn't blow up the dialog to full screen.
- Project composer: add `/apply-comments` to the skill mention list so pending comment resolution can be invoked from the workbench.
- Carries forward the 0.7.1 measurement + pagination fixes (font/image readiness, relative media src inlining, list-per-item paging, `OPENPRESS_DEBUG_ALLOC`, academic-paper starter body overflow).

### Breaking Changes

- `FrameContext.consumeArea(chainId)` return type changes from `ReactNode | null` to `{ indexInFrame: number; blocks: ReactNode | null }`. Custom `Frame` consumers must read `.blocks`.
- `App` export is renamed to `OpenPressApp` and now lives under `@open-press/core/app`. The old `renderer.tsx` is replaced by `OpenPressRuntime`.
- `data-openpress-mdx-area-empty` is now always emitted (`"true"` / `"false"`). Selectors that relied on the attribute being absent need updating.
- Reader `ViewMode` collapses to `"paged"` only — the legacy `"reading"` flow mode is removed. Use `usePageViewportScale` for free-scaling instead.
- Several internal module paths moved into subdirectories (`document-model/`, `reader/`, `shared/`, `workbench/...`). Consumers that deep-imported from the openpress source must switch to the new barrels.
- Shared dialog scaffolding (backdrop, container, header, close button) moved from per-dialog class families (`openpress-deploy-dialog-backdrop`, `__panel`, `__panel header`, `__close`, etc.) to the shared `openpress-workbench-dialog*` family. Per-dialog modifier classes (`openpress-deploy-dialog`, `openpress-search-dialog`, `openpress-project-preview-dialog`) are still applied for dialog-specific styling. Selectors that targeted the old scaffolding names (notably `*-backdrop` and `__panel`) need updating; selectors that combine the modifier class with new `__heading` / `__footer` / `__close` modifiers continue to work.

## 0.7.1

### Patch Changes

- Measurement pipeline + pagination fixes:
  - **Measurement**: wait on `document.fonts.ready`, image `load`/`error` + `decode()`,
    and two `requestAnimationFrame` ticks before sampling block heights so figures
    no longer under-measure on cold loads.
  - **Measurement**: inline relative `media/`, `./media/`, and `/openpress/media/`
    image sources during the SSR measurement pass (previously only the absolute
    `/openpress/media/...` form was rewritten, leaving relative refs as broken).
  - **MDX compile**: split bullet/numbered lists into per-item paginable blocks
    so long lists can break across pages without losing ordered numbering.
  - **Debug**: new `OPENPRESS_DEBUG_ALLOC` env var prints per-iteration allocator
    state (mdxArea capacities, block heights, pagination hints, warnings).
  - **Academic-paper starter**: `<MdxArea overflow="extend">` on the body and the
    single-column `.reader-page--content .page-body` override removed so content
    paginates naturally with the new allocator.

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
