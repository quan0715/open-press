# Workbench Canvas-First Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the permanent Workbench right column while preserving export, zoom, document information, and extension panels as on-demand controls.

**Architecture:** `HtmlWorkbench` becomes a two-surface layout composed of left navigation and canvas. The existing export and viewport controllers stay in `Workbench`; their controls move to the toolbar and canvas. Low-frequency information uses a dialog, while registered extension panels use a portal-backed overlay drawer that never participates in the shell grid.

**Tech Stack:** React 19, TypeScript, Radix UI primitives, Tailwind CSS v4 utility classes, Vitest, Playwright.

## Global Constraints

- Preserve existing PDF, PNG, Word, presentation, deployment, theme-token, and per-Press zoom behavior.
- Render exactly one floating zoom dock in normal and Focus modes.
- Do not reserve canvas width for document information or extension tools.
- Keep the engine generic; no workspace-specific content or paths.
- Add one `@open-press/core` patch changeset.

---

### Task 1: Canvas-first Workbench and toolbar export

**Files:**
- Modify: `packages/core/tests/e2e/reader-workbench-toolbar.spec.ts`
- Modify: `packages/core/src/openpress/workbench/Workbench.tsx`
- Modify: `packages/core/src/openpress/workbench/actions/ExportControl.tsx`

**Interfaces:**
- Consumes: `useDeploymentWorkbench`, `PageZoomDock`, and the current `ExportControl` export handlers.
- Produces: `ExportControl` props `onOpenPresentation?: () => void` and `placement?: "panel" | "toolbar"`.

- [ ] **Step 1: Write failing canvas and toolbar tests**

Add assertions to the desktop Workbench E2E suite:

```ts
await page.goto("/reader/preview");
await expect(page.locator("[data-openpress-right-panel]")).toHaveCount(0);
await expect(page.locator('[data-openpress-page-zoom-dock="floating"]')).toBeVisible();
await expect(page.locator('[data-openpress-page-zoom-dock="panel"]')).toHaveCount(0);

const main = page.locator("[data-openpress-main-content]");
expect((await main.boundingBox())?.x + (await main.boundingBox())!.width)
  .toBeGreaterThanOrEqual(1279);

await page.locator("[data-openpress-export-control]").click();
await expect(page.getByRole("menuitem", { name: "PDF" })).toBeVisible();
await expect(page.getByRole("menuitem", { name: "Word DOCX" })).toBeVisible();
await expect(page.getByRole("menuitem", { name: "PNG 圖片" })).toBeVisible();
```

Update the Focus test to assert the same floating dock DOM element remains represented by a single locator before and after toggling Focus.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm --filter @open-press/core exec playwright test \
  --config playwright.reader.config.ts \
  tests/e2e/reader-workbench-toolbar.spec.ts \
  --project=desktop
```

Expected: FAIL because the right panel still exists, normal mode uses a panel dock, and export is not in the toolbar.

- [ ] **Step 3: Move Export and zoom without changing their controllers**

In `ExportControl.tsx`, add optional presentation and placement props:

```ts
placement?: "panel" | "toolbar";
onOpenPresentation?: () => void;
```

Render a `Play` menu item only when `onOpenPresentation` exists. Use toolbar action classes for `placement="toolbar"`; preserve the current trigger classes as the default.

In `Workbench.tsx`:

```tsx
<ExportControl
  placement="toolbar"
  pages={displayPages}
  currentPageIndex={currentDocumentPageIndex}
  pressTitle={activePressTitle}
  theme={document.theme}
  onExportPdf={deployment.handleOpenWorkbenchPdf}
  onExportWord={!isSlidePress && deployment.localDeployEnabled
    ? deployment.handleOpenWorkbenchWord
    : undefined}
  onOpenPresentation={isSlidePress && onOpenPresentation
    ? () => onOpenPresentation(currentDocumentPageIndex)
    : undefined}
/>
```

Remove the built-in output panel, omit `WorkbenchShell.RightPanel`, set `withRightPanel={false}`, and render one `PageZoomDock placement="floating"` unconditionally whenever page view is active.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the command from Step 2. Expected: all desktop Workbench toolbar tests pass.

- [ ] **Step 5: Commit Task 1**

```bash
git add packages/core/src/openpress/workbench/Workbench.tsx \
  packages/core/src/openpress/workbench/actions/ExportControl.tsx \
  packages/core/tests/e2e/reader-workbench-toolbar.spec.ts
git commit -m "[core] move workbench controls onto canvas"
```

### Task 2: On-demand document information

**Files:**
- Modify: `packages/core/tests/e2e/reader-workbench-toolbar.spec.ts`
- Modify: `packages/core/src/openpress/workbench/Workbench.tsx`

**Interfaces:**
- Consumes: current theme token helpers and document page HTML.
- Produces: a toolbar overflow trigger marked `data-openpress-workbench-more` and dialog marked `data-openpress-document-info-dialog`.

- [ ] **Step 1: Write the failing document-info test**

```ts
await page.locator("[data-openpress-workbench-more]").click();
await page.getByRole("menuitem", { name: "文件資訊" }).click();
const info = page.locator("[data-openpress-document-info-dialog]");
await expect(info).toBeVisible();
await expect(info.getByText("Template style")).toBeVisible();
await expect(info.getByText("Structure Summary")).toBeVisible();
```

- [ ] **Step 2: Run focused E2E and verify RED**

Run the Task 1 Step 2 command. Expected: FAIL because no overflow control or combined dialog exists.

- [ ] **Step 3: Convert the panel views into one toolbar-owned dialog**

Replace `WorkbenchThemePanel` with a control that renders a `MoreHorizontal` toolbar button, a dropdown item labelled `文件資訊`, and the existing theme dialog body. Add the current page/word/image statistics as the first dialog section and remove the old `Panel` wrappers. Keep token discovery gated by dialog open state.

- [ ] **Step 4: Run focused E2E and verify GREEN**

Run the Task 1 Step 2 command. Expected: all desktop Workbench toolbar tests pass.

- [ ] **Step 5: Commit Task 2**

```bash
git add packages/core/src/openpress/workbench/Workbench.tsx \
  packages/core/tests/e2e/reader-workbench-toolbar.spec.ts
git commit -m "[core] move document info on demand"
```

### Task 3: Overlay drawer for extension panels

**Files:**
- Create: `packages/core/src/openpress/workbench/panels/WorkbenchToolsControl.tsx`
- Create: `packages/core/tests/e2e/fixtures/WorkbenchToolsControlHarness.tsx`
- Modify: `packages/core/src/openpress/workbench/panels/index.ts`
- Modify: `packages/core/src/openpress/workbench/Workbench.tsx`
- Modify: `packages/core/tests/e2e/reader-workbench-toolbar.spec.ts`
- Modify: `docs/workbench.md`
- Create: `.changeset/bright-canvases-export.md`

**Interfaces:**
- Consumes: `WorkbenchPanel[]` and `WorkbenchControlPanel`.
- Produces: `WorkbenchToolsControl({ panels }: { panels: WorkbenchPanel[] })`, with `data-openpress-tools-trigger` and `data-openpress-tools-drawer` selectors.

- [ ] **Step 1: Write a failing harness test**

Mount a real `WorkbenchToolsControl` with one panel through a Vite-imported test harness, then assert:

```ts
const beforeWidth = await page.locator("[data-openpress-main-content]").evaluate((el) => el.clientWidth);
await page.locator("[data-openpress-tools-trigger]").click();
await expect(page.locator("[data-openpress-tools-drawer]")).toBeVisible();
await expect(page.getByText("Harness extension panel")).toBeVisible();
expect(await page.locator("[data-openpress-main-content]").evaluate((el) => el.clientWidth))
  .toBe(beforeWidth);
await page.keyboard.press("Escape");
await expect(page.locator("[data-openpress-tools-drawer]")).toHaveCount(0);
```

- [ ] **Step 2: Run focused E2E and verify RED**

Run the Task 1 Step 2 command. Expected: FAIL because `WorkbenchToolsControl` does not exist.

- [ ] **Step 3: Implement the portal-backed drawer**

Build the drawer with the existing Radix Dialog primitives. Position content at the right edge below the 44px toolbar, use a fixed overlay, render `WorkbenchControlPanel panels={panels}`, close on Escape or overlay click, and return focus through Radix. Return `null` when `panels.length === 0`.

Render `<WorkbenchToolsControl panels={extraControlPanels ?? []} />` in toolbar actions. Update `docs/workbench.md` to describe overlay behavior rather than fixed right-panel ordering.

Add a patch changeset:

```md
---
"@open-press/core": patch
---

Give the Workbench a canvas-first layout with toolbar export, floating zoom, on-demand document information, and overlay extension tools.
```

- [ ] **Step 4: Run focused E2E and verify GREEN**

Run the Task 1 Step 2 command. Expected: all desktop Workbench toolbar tests pass.

- [ ] **Step 5: Commit Task 3**

```bash
git add packages/core/src/openpress/workbench/panels \
  packages/core/src/openpress/workbench/Workbench.tsx \
  packages/core/tests/e2e \
  docs/workbench.md .changeset
git commit -m "[core] open extension tools on demand"
```

### Task 4: Final regression verification

**Files:**
- Verify only; modify earlier task files only if a regression is found.

**Interfaces:**
- Consumes: completed Tasks 1–3.
- Produces: a clean, release-ready patch branch.

- [ ] **Step 1: Run static and core tests**

```bash
pnpm --filter @open-press/core typecheck
pnpm --filter @open-press/core test
```

Expected: exit 0; 0 failures.

- [ ] **Step 2: Run the complete Reader E2E suite**

```bash
pnpm --filter @open-press/core test:e2e:reader
```

Expected: all runnable desktop/tablet tests pass; platform-gated skips remain skips.

- [ ] **Step 3: Inspect scope and source boundaries**

```bash
git diff --check
git status --short
git diff --stat HEAD~3..HEAD
```

Expected: no generated `public/`, `dist-react/`, `.openpress/`, or test-result files are tracked.

- [ ] **Step 4: Request review and resolve findings**

Review the complete range against `docs/superpowers/specs/2026-07-29-workbench-canvas-first-controls-design.md`. Fix all Critical and Important findings, then rerun the affected commands before reporting completion.
