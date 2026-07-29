# Workbench Bookmarks Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Workbench Focus mode with a persisted bookmarks-panel toggle and make the toolbar Export trigger match every other toolbar action.

**Architecture:** Use the existing `useReaderRuntime` / `usePanelState` path as the only owner of left-panel visibility and persistence. Thread that state into `WorkbenchShell` and `WorkbenchToolbarActions`, remove the separate Hide UI state, and reduce the toolbar Export trigger to the shared icon-button contract without changing its menu or export logic.

**Tech Stack:** React 19, TypeScript, Radix UI dropdowns, Tailwind CSS v4 utility classes, Playwright E2E, pnpm.

## Global Constraints

- The bookmarks control only changes the left navigation panel; Export, deploy, comments, More, Tools, color mode, and floating Zoom stay available.
- Persist the preference workspace-wide under `openpress:workspace:panels`.
- First-use default is open above `860px` and closed at `860px` or below.
- Do not reuse or migrate `openpress:workspace:hide-ui` because its semantics are incompatible.
- Toolbar Export is a fixed 44px icon action with accessible name `匯出`; menu contents and execution are unchanged.
- Non-toolbar `ExportControl` placement remains unchanged.

---

## File map

- `packages/core/src/openpress/workbench/Workbench.tsx` — configure persisted panel state, remove Hide UI state, and connect bookmark visibility to shell and toolbar.
- `packages/core/src/openpress/workbench/shell/WorkbenchToolbarActions.tsx` — render the stateful bookmarks action instead of Focus.
- `packages/core/src/openpress/workbench/shell/WorkbenchShell.tsx` — remove obsolete Hide UI layout overrides and rely on controlled panel state.
- `packages/core/src/openpress/workbench/actions/ExportControl.tsx` — use the common icon-only toolbar trigger.
- `packages/core/tests/e2e/reader-workbench-toolbar.spec.ts` — cover bookmark collapse, persistence, responsive defaults, preserved controls, and Export dimensions.
- `docs/workbench.md` — document the bookmark toggle and icon-only Export menu trigger.
- `.changeset/bright-canvases-export.md` — extend the existing unreleased patch note with the final toolbar behavior.

### Task 1: Replace Focus with persisted bookmarks-panel state

**Files:**
- Modify: `packages/core/tests/e2e/reader-workbench-toolbar.spec.ts:237`
- Modify: `packages/core/src/openpress/workbench/Workbench.tsx:238-380, 495-502, 840-1010`
- Modify: `packages/core/src/openpress/workbench/shell/WorkbenchToolbarActions.tsx:1-180`
- Modify: `packages/core/src/openpress/workbench/shell/WorkbenchShell.tsx:1-260`

**Interfaces:**
- Consumes: `useReaderRuntime({ leftPanelBreakpoint, panelStateStorageKey, initialPanelState })` and its existing `leftPanelOpen` / `toggleLeftPanel` result.
- Produces: `WorkbenchToolbarActions` props `bookmarksOpen: boolean` and `onToggleBookmarks?: () => void`; DOM selector `data-openpress-bookmarks-toggle`.

- [ ] **Step 1: Replace the Focus E2E case with a failing desktop bookmarks test**

Use the existing desktop fixture and assert the intended public behavior:

```ts
const WORKBENCH_PANEL_STORAGE_KEY = "openpress:workspace:panels";

test("collapses only bookmarks and persists the workspace preference", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the fixed desktop panel shell");
  await page.goto("/reader/preview");

  const toggle = page.locator("[data-openpress-bookmarks-toggle]");
  const panel = page.locator("[data-openpress-left-panel]");
  const main = page.locator("[data-openpress-main-content]");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "true");
  const widthBefore = (await main.boundingBox())?.width ?? 0;

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "false");
  expect((await main.boundingBox())?.width ?? 0).toBeGreaterThan(widthBefore);
  await expect(page.locator("[data-openpress-export-control]")).toBeVisible();
  await expect(page.locator("[data-openpress-workbench-more]")).toBeVisible();
  await expect(page.locator('[data-openpress-page-zoom-dock="floating"]')).toBeVisible();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), WORKBENCH_PANEL_STORAGE_KEY))
    .toContain('"leftPanelOpen":false');

  await page.reload();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "false");
  await toggle.click();
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "true");
  await expect(page.locator("[data-openpress-hide-ui-toggle]")).toHaveCount(0);
});
```

- [ ] **Step 2: Add a failing tablet default and saved-override test**

```ts
test("defaults bookmarks closed on narrow screens and honors a saved open preference", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "tablet", "Narrow default belongs to the tablet profile");
  await page.goto("/reader/preview");

  const toggle = page.locator("[data-openpress-bookmarks-toggle]");
  const panel = page.locator("[data-openpress-left-panel]");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "false");

  await page.evaluate((key) => {
    localStorage.setItem(key, JSON.stringify({ leftPanelOpen: true, rightPanelOpen: false }));
  }, WORKBENCH_PANEL_STORAGE_KEY);
  await page.reload();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "true");
});
```

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```bash
cd packages/core
pnpm exec playwright test --config playwright.reader.config.ts tests/e2e/reader-workbench-toolbar.spec.ts --grep "bookmarks"
```

Expected: both tests fail because `data-openpress-bookmarks-toggle` does not exist and Focus still owns the behavior.

- [ ] **Step 4: Configure `useReaderRuntime` as the single persisted panel-state owner**

In `Workbench.tsx`, replace the Hide UI constants/state/effects with:

```ts
const WORKBENCH_PANEL_STATE_STORAGE_KEY = "openpress:workspace:panels";
const WORKBENCH_LEFT_PANEL_BREAKPOINT = 861;

const reader = useReaderRuntime({
  pageCount: Math.max(templateModeActive ? templatePreviewPages.length : displayPages.length, 1),
  leftPanelBreakpoint: WORKBENCH_LEFT_PANEL_BREAKPOINT,
  panelStateStorageKey: WORKBENCH_PANEL_STATE_STORAGE_KEY,
  initialPanelState: {
    leftPanelOpen: !isNarrowWorkspaceViewport(),
    rightPanelOpen: false,
  },
});
```

Delete `WORKBENCH_HIDE_UI_STORAGE_KEY`, `hideUiMode`, `toggleHideUiMode`, `getInitialWorkspaceHideUiMode`, `getStoredWorkspaceHideUiMode`, `persistWorkspaceHideUiMode`, and the media-query effect that synchronizes Hide UI.

- [ ] **Step 5: Replace `HideUiToggle` with `BookmarksToggle`**

In `WorkbenchToolbarActions.tsx`, replace the Focus-specific props and component with:

```tsx
function BookmarksToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const label = open ? "收合書籤" : "展開書籤";
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={`${TOOLBAR_ACTION_CLASS} op-workspace-bookmarks-toggle`}
      data-openpress-bookmarks-toggle
      data-openpress-toolbar-active={open ? "true" : "false"}
      aria-pressed={open}
      title={label}
      aria-label={label}
      onClick={onToggle}
    >
      <Bookmark aria-hidden="true" />
      <span className={TOOLBAR_ACTION_LABEL_CLASS}>Bookmarks</span>
    </Button>
  );
}
```

Use props `bookmarksOpen` and `onToggleBookmarks`; render the control only when `onToggleBookmarks` is supplied. Remove `Focus`, `PanelsLeftRight`, `hideUiMode`, and icon-only inactive Press-tab behavior.

- [ ] **Step 6: Connect the reader state and remove shell Hide UI overrides**

Pass this toolbar state from `Workbench.tsx`:

```tsx
bookmarksOpen={reader.leftPanelOpen}
onToggleBookmarks={pageSourceEditMode ? undefined : reader.toggleLeftPanel}
```

Drive the shell with:

```tsx
leftPanelOpen={!pageSourceEditMode && reader.leftPanelOpen}
```

Remove the `hideUiMode` prop, context field, effective panel-state overrides, Hide UI classes, and `data-openpress-hide-ui-mode` attributes from `WorkbenchShell.tsx`. Keep the existing controlled panel transitions and fixed-left-only grid behavior.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run the same Playwright command from Step 3.

Expected: 2 passed, with no Focus selector remaining.

- [ ] **Step 8: Commit the bookmark behavior**

```bash
git add packages/core/src/openpress/workbench/Workbench.tsx \
  packages/core/src/openpress/workbench/shell/WorkbenchToolbarActions.tsx \
  packages/core/src/openpress/workbench/shell/WorkbenchShell.tsx \
  packages/core/tests/e2e/reader-workbench-toolbar.spec.ts
git commit -m "[core] replace focus with bookmarks toggle"
```

### Task 2: Standardize the toolbar Export trigger

**Files:**
- Modify: `packages/core/tests/e2e/reader-workbench-toolbar.spec.ts:6-27`
- Modify: `packages/core/src/openpress/workbench/actions/ExportControl.tsx:1-320`

**Interfaces:**
- Consumes: shared `TOOLBAR_ACTION_CLASS` and existing `placement: "panel" | "toolbar"`.
- Produces: an icon-only toolbar button with `aria-label="匯出"`, one SVG child, shared dimensions, and `data-openpress-toolbar-active` while its menu is open.

- [ ] **Step 1: Add failing assertions for the shared toolbar action contract**

Extend `gives the canvas the right column and keeps export in the toolbar` before opening the menu:

```ts
const exportTrigger = exportControl.getByRole("button", { name: "匯出" });
const moreTrigger = page.locator("[data-openpress-workbench-more]");
const exportBox = await exportTrigger.boundingBox();
const moreBox = await moreTrigger.boundingBox();
expect(exportBox?.width).toBe(moreBox?.width);
expect(exportBox?.height).toBe(moreBox?.height);
await expect(exportTrigger.locator("svg")).toHaveCount(1);
await expect(exportTrigger).not.toContainText("匯出");

await exportTrigger.click();
await expect(exportTrigger).toHaveAttribute("data-openpress-toolbar-active", "true");
```

- [ ] **Step 2: Run the focused Export test and verify RED**

Run:

```bash
cd packages/core
pnpm exec playwright test --config playwright.reader.config.ts tests/e2e/reader-workbench-toolbar.spec.ts --project=desktop --grep "keeps export in the toolbar"
```

Expected: failure because Export is wider than More, contains two SVGs, and renders visible `匯出` text.

- [ ] **Step 3: Use the shared icon-only toolbar class**

In `ExportControl.tsx`:

- remove `EXPORT_TOOLBAR_TRIGGER_CLASS` and `TOOLBAR_ACTION_LABEL_CLASS`;
- use `TOOLBAR_ACTION_CLASS` directly for toolbar placement;
- set `data-openpress-toolbar-active={placement === "toolbar" && dropdownOpen ? "true" : undefined}`;
- render the text and `ChevronDown` only when `placement === "panel"`:

```tsx
<FileDown aria-hidden="true" />
{placement === "panel" ? <span>匯出</span> : null}
{placement === "panel" ? <ChevronDown className={ZOOM_CHEVRON_CLASS} aria-hidden="true" /> : null}
```

Do not change dropdown items, dialogs, range selection, export handlers, or panel-placement classes.

- [ ] **Step 4: Run the focused Export test and verify GREEN**

Run the same command from Step 2.

Expected: 1 passed.

- [ ] **Step 5: Commit the Export trigger**

```bash
git add packages/core/src/openpress/workbench/actions/ExportControl.tsx \
  packages/core/tests/e2e/reader-workbench-toolbar.spec.ts
git commit -m "[core] align export toolbar action"
```

### Task 3: Document and verify the completed behavior

**Files:**
- Modify: `docs/workbench.md:10-38`
- Modify: `.changeset/bright-canvases-export.md`

**Interfaces:**
- Consumes: the final bookmark and Export behavior from Tasks 1 and 2.
- Produces: release-facing documentation and patch metadata.

- [ ] **Step 1: Update user-facing documentation and changeset**

Add a toolbar row for **Bookmarks** describing the persisted left-panel toggle. Describe **Export** as an icon menu trigger, remove any Focus wording, and update the existing changeset body to:

```md
Reclaim the workbench canvas with on-demand controls, a persisted bookmarks-panel toggle, and consistent icon-only toolbar actions for export, document information, zoom, and extension tools.
```

- [ ] **Step 2: Run formatting and source-boundary checks**

```bash
git diff --check
rg -n "data-openpress-hide-ui-toggle|Hide UI|Focus mode" packages/core/src/openpress/workbench packages/core/tests/e2e docs/workbench.md
```

Expected: `git diff --check` exits 0; `rg` returns no matches.

- [ ] **Step 3: Run full verification**

```bash
pnpm --filter @open-press/core typecheck
pnpm --filter @open-press/core test
pnpm --filter @open-press/core test:e2e:reader
```

Expected: all commands exit 0 with no failed tests.

- [ ] **Step 4: Perform live-browser QA on port 9999**

Reload `/userstory/preview`, verify the bookmark icon expands and collapses only the left panel, confirm the canvas width changes, reload to confirm persistence, and inspect that Export matches More in size and color while retaining its menu.

- [ ] **Step 5: Commit documentation and release metadata**

```bash
git add docs/workbench.md .changeset/bright-canvases-export.md
git commit -m "[core] document bookmarks toolbar controls"
```
