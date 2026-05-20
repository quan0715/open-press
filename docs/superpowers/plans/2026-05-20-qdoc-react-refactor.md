# QDoc React Architecture Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild QDoc from the current Markdown/custom-element/component.mjs pipeline into the React/MDX/BaseX architecture described in `docs/superpowers/specs/2026-05-20-qdoc-react-architecture-design.md`.

**Architecture:** Build the new React pipeline in engine-owned modules first, keeping the current reader contract (`public/qdoc/document.json` with HTML page blocks) as the integration seam until the dogfood document is migrated. The cutover is still hard from a user-facing product perspective: once the new pipeline is complete, the current `document/content/*.md` and `component.mjs` contract is migrated rather than maintained as a public compatibility mode.

**Tech Stack:** Node ESM CLI, Vite SSR for TSX/MDX loading, React 19 SSR, TypeScript compiler checks, Playwright/Puppeteer measurement, Vitest/React Testing Library, Node `node:test`.

---

## Work Packages

| Wave | Area | Output | Parallelism |
|---|---|---|---|
| 1 | Core contracts | BaseX primitives, manifest types, document entry loader, chapter/component discovery | 3 workers, disjoint files |
| 2 | MDX compile | MDX compiler, auto-import scope, block-id bridge, chapter-scoped CSS transform | 2 workers after Wave 1 |
| 3 | Pagination prototype | Build-time Chromium measurement, AST/tree split, overflow warnings | 1-2 workers after Wave 2 |
| 4 | Reader/runtime delta | Consume pre-paginated blocks, inspector hook/UI, dev comment endpoint | 2 workers after document.json metadata stabilizes |
| 5 | Validation + migration | New validation tiers, `migrate-to-react`, apply-comments skill, starter pack rewrite | 3 workers after Wave 1 contracts |
| 6 | Dogfood migration | Convert current `document/` to `index.tsx` + `chapters/**` + TSX components | 2 workers after Wave 2 |
| 7 | Final integration | Typecheck, node/react/e2e tests, render/PDF/deploy verification | controller-owned |

## Constraints

- Treat the spec as the source of truth, including v1 `use client` support.
- Preserve current user edits; do not revert unrelated changes.
- Use tests-first for each behavior.
- Keep worker write scopes disjoint.
- Do not extract/publish `@qdoc/core` as an npm package in Wave 1. Implement a local core module and alias path first; package extraction is a later mechanical split.
- The current reader JSON shape remains the bridge until the new renderer can produce equivalent page blocks.

---

## Wave 1 Task A: BaseX Primitives And Public Types

**Files:**
- Create: `src/qdoc/core/index.tsx`
- Create: `src/qdoc/core/basePages.tsx`
- Create: `src/qdoc/core/types.ts`
- Create: `tests/qdoc-core-primitives.react.test.tsx`

- [x] **Step 1: Write failing React tests**

Add tests that render `BaseCoverPage`, `BaseTocPage`, `BaseReportPage`, `BaseBackCoverPage`, `BaseFigure`, and `BaseCallout`.

Required assertions:
- page primitives render `<section class="reader-page ...">`
- `BaseCoverPage`, `BaseTocPage`, and `BaseBackCoverPage` set `data-page-footer="false"`
- `BaseReportPage` accepts `pageIndex`, `totalPages`, `chapterSlug`, `chapterTone`, and `children`
- `BaseFigure` wraps children in a `<figure>` with caption outside the body
- `BaseCallout` renders a block-level element with `data-callout-kind`

Run:

```bash
npx vitest run tests/qdoc-core-primitives.react.test.tsx
```

Expected: fail because `src/qdoc/core/index.tsx` does not exist.

- [x] **Step 2: Implement minimal primitives**

Create small React components only. They should not read browser globals and should be safe for SSR.

- [x] **Step 3: Verify**

Run:

```bash
npx vitest run tests/qdoc-core-primitives.react.test.tsx
npm run typecheck
```

Expected: both pass.

---

## Wave 1 Task B: React Document Entry Loader

**Files:**
- Create: `engine/react/document-entry.mjs`
- Create: `tests/framework-react-entry.test.mjs`
- Modify: `vite.config.ts`
- Modify: `tsconfig.json`

- [x] **Step 1: Write failing loader tests**

Create a temporary fixture with:

```tsx
// document/index.tsx
import type { QDocManifest } from "@qdoc/core";

export const config: QDocManifest = {
  title: "Fixture Doc",
  publicDir: "public/qdoc",
  outputDir: "dist",
};

export const cover = <div data-fixture-cover>Cover</div>;
export const toc = <div data-fixture-toc>TOC</div>;
export const backCover = <div data-fixture-back-cover>Back</div>;
```

Required assertions:
- `loadReactDocumentEntry(root)` returns normalized config merged with QDoc defaults.
- shell exports are returned as React elements.
- missing `document/index.tsx` returns `null` rather than breaking legacy workspaces.
- top-level side-effect detection rejects obvious `console.log(...)` in `document/index.tsx`.

Run:

```bash
node --test tests/framework-react-entry.test.mjs
```

Expected: fail because `engine/react/document-entry.mjs` does not exist.

- [x] **Step 2: Implement loader through Vite SSR**

Use a temporary Vite SSR server in middleware mode to load TSX. Configure aliases:
- `@qdoc/core` -> local `src/qdoc/core/index.tsx`
- `@/components` -> `<workspace>/document/components`

Keep the server lifecycle contained and closed after load.

- [x] **Step 3: Add local aliases**

Update Vite and TS config so document TSX can import:
- `@qdoc/core`
- `@/components`

- [x] **Step 4: Verify**

Run:

```bash
node --test tests/framework-react-entry.test.mjs
npm run typecheck
```

Expected: both pass.

---

## Wave 1 Task C: Chapter And Component Discovery

**Files:**
- Create: `engine/react/workspace-discovery.mjs`
- Create: `tests/framework-react-discovery.test.mjs`

- [x] **Step 1: Write failing discovery tests**

Create a temporary fixture with:

```text
document/
  components/
    Cover.tsx
    NodeDiagram/
      index.tsx
      NodeShape.tsx
  chapters/
    04-linked-list/
      chapter.tsx
      content/
        01-list-and-node.mdx
      components/
        LinkedListVisual.tsx
    05-tree/
      content/
        01-tree.mdx
```

Required assertions:
- global components discover `Cover` and `NodeDiagram`
- `NodeDiagram/NodeShape.tsx` is not auto-imported
- chapter order follows numeric prefix
- chapter without `chapter.tsx` gets slug from folder name
- chapter-local components shadow global components by name
- returned records include absolute paths and document-relative paths

Run:

```bash
node --test tests/framework-react-discovery.test.mjs
```

Expected: fail because `engine/react/workspace-discovery.mjs` does not exist.

- [x] **Step 2: Implement discovery**

Read only filesystem structure; do not compile TSX in this task.

- [x] **Step 3: Verify**

Run:

```bash
node --test tests/framework-react-discovery.test.mjs
npm run typecheck
```

Expected: both pass.

---

## Wave 2 Preview

Wave 2 starts only after Wave 1 is green:

- [x] MDX compiler module with no-import validation.
- [x] Auto-import map generation from Wave 1 discovery output.
- [x] `data-qdoc-block-id` injection for pagination.
- [x] Shell JSX SSR for cover/toc/backCover.
- [x] Minimal React export path that produces `document.json` for a tiny MDX fixture.
- [x] Block-only MDX validation for inline JSX anti-patterns.
- [x] Chapter-scoped CSS transform.
- [x] Persist block-id map/source location metadata for the pagination prototype.

## Wave 3 Prototype

Wave 3 turns the Wave 2 block-id bridge into a build-time pagination prototype. This is still opt-in and does not replace the legacy render path.

- [x] Build-time Chromium measurement module for `[data-qdoc-block-id]` block heights.
- [x] Measurement-to-page grouping that preserves atomic blocks.
- [x] Overflow warning records for blocks taller than the page safe area.
- [x] MDX subtree rerender by selected `data-qdoc-block-id` groups.
- [x] React export opt-in pagination path that writes page-level blockMap metadata.
- [x] Dogfood document pagination parity gate against the current Markdown pipeline.
- [x] Real theme CSS/font loading for production measurement.
- [x] Validation command integration for `block-overflows-page` warnings.

## Wave 4 Reader Runtime Delta

Wave 4 starts moving the reader from browser-owned pagination/inspection behavior toward React-owned state. This wave remains non-destructive until the dogfood document has fully moved to React/MDX output.

- [x] Add React/MDX document metadata helpers for source type, block map, and build-time pagination detection.
- [x] Add `useQDocInspector` state hook with persisted mode, selected block state, and block-id click lookup.
- [x] Add workbench inspector toggle UI that displays selected source path/line.
- [x] Let inspector clicks take precedence over internal anchor navigation.
- [x] Bypass browser runtime pagination when `document.json` declares build-time block measurement pagination.
- [x] Move dev comment submission endpoint into the React inspector flow.
- [x] Persist inspector comments as `@qdoc-comment` source markers and warn on pending markers during validation.
- [x] Add a dedicated comments workspace tab with pending marker list and clear operations.
- [ ] Replace legacy runtime pagination after dogfood React/MDX migration proves parity.

## Wave 5 Validation And Migration Tooling

Wave 5 hardens the React source workflow around validation, migration, and agent-operable editing tools.

- [x] Add React source validation for pending `@qdoc-comment` markers.
- [x] Add QDoc Apply Comments skill for marker-local apply/resolve/clear workflow.
- [x] Add `migrate-to-react` command for legacy workspaces.
- [x] Rewrite starter pack onto React/MDX authoring once dogfood output is stable.

## Wave 6 Dogfood Migration

Wave 6 moves the local data-structure note workspace onto the React/MDX authoring layout while keeping runtime pagination as the reader fallback until build-time pagination reaches visual parity on the real document.

- [x] Add `document/index.tsx` with side-effect-free config, cover, TOC, and back-cover exports.
- [x] Add document-owned React page shell components that preserve the current CSS contract (`cover`, `toc`, `report-page`, `chapter-opener`, `back-cover`).
- [x] Move dogfood prose into `document/chapters/**/content/*.mdx`.
- [x] Add chapter-level `chapter.tsx` opener exports for Linked List, Tree, Appendix A, and Appendix B.
- [x] Add MDX bridge for legacy `<qdoc-component>` tags so existing diagrams render inside React export.
- [x] Escape TeX braces in dollar math before MDX evaluation so formulas do not become JSX expressions.
- [x] Make the default `exportQDocDocument()` prefer React export when `document/index.tsx` exists.
- [x] Inject static TOC entries from rendered React/MDX headings.
- [x] Keep build-time pagination opt-in for now; dogfood default uses React source pages plus existing reader runtime pagination.
- [x] Add an active source workspace abstraction so CLI tools can prefer `document/index.tsx` + React/MDX chapters when present.
- [x] Update `validate` to check React chapter `.mdx` sources instead of requiring legacy `content/*.md`.
- [x] Update `search` / `replace` content scope to operate on React chapter `.mdx` files, and include React entry/chapter implementation files in `--scope all`.
- [x] Update `inspect` source scanning and component usage summaries to read the active React/MDX source tree.
- [x] Replace legacy `document/content/*.md` only after build-time pagination and validation cover the React chapter source directory.
- [x] Convert legacy `component.mjs` diagrams into first-class TSX components.

## Verification Gate For Wave 1

Before moving to Wave 2:

```bash
npm run typecheck
npm run test:node
npm run test:react
```

Expected: all pass. Legacy render may still use the old Markdown pipeline at this point.
