# Workspace Settings, Toolbar Hierarchy, and Resizable Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent Workspace appearance settings page, reduce visible workbench actions, and make the simplified left navigation panel resizable.

**Architecture:** A shared appearance hook owns storage migration, system-mode resolution, and root data attributes. `OpenPressApp` gains a lightweight Workspace settings destination while the existing gallery renders the shared Workspace shell. Workbench overflow actions use controlled dialogs, and `WorkbenchShell` owns an opt-in persisted resize separator so document content remains layout-agnostic.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Tailwind CSS 4 utility classes, Radix/shadcn primitives, Vitest 4 pure-model tests, Playwright 1.60 reader E2E.

## Global Constraints

- Workspace appearance must not modify Press theme tokens, rendered pages, the public Web reader, PDF, Word, or slide output.
- Supported mode preferences are exactly `system`, `dark`, and `light`.
- Supported accents are exactly `amber`, `blue`, `emerald`, `violet`, and `rose`; arbitrary colors are out of scope.
- Left-panel width is Workspace-wide, browser-local, and clamped to `240px` through `480px`.
- Do not add a routing dependency, account storage, server synchronization, toolbar customization, or per-Press panel widths.
- Existing `/workspace`, `/<slug>/preview`, and `/<slug>/present` routes must retain their meaning.
- Use test-first changes and preserve export, comments, deployment, inline editing, zoom, and bookmark behavior.

---

## File Map

- Create `packages/core/src/openpress/app/workspaceAppearance.ts`: appearance types, storage parsing/migration, system resolution, and React hook.
- Create `packages/core/tests/openpress-workspace-appearance.test.ts`: pure appearance parsing and resolution tests.
- Modify `packages/core/src/styles/openpress/workspace.css`: accent token families for both resolved color modes.
- Create `packages/core/src/openpress/app/workspaceRoute.ts`: pure Workspace route parsing/building.
- Create `packages/core/tests/openpress-workspace-route.test.ts`: route unit tests.
- Modify `packages/core/src/openpress/app/OpenPressApp.tsx`: Documents/Settings/Press state transitions and callbacks.
- Modify `packages/core/src/openpress/app/WorkspaceGalleryPage.tsx`: shared Documents/Settings shell and Appearance controls.
- Modify `packages/core/src/openpress/app/OpenPressRuntime.tsx`: pass Settings navigation into the workbench.
- Create `packages/core/src/openpress/workbench/actions/WorkbenchOverflowControl.tsx`: one More menu plus controlled Deployment and Tools surfaces.
- Modify `packages/core/src/openpress/workbench/actions/DeploymentControl.tsx`: export reusable controlled deployment dialog content.
- Modify `packages/core/src/openpress/workbench/panels/WorkbenchToolsControl.tsx`: export a reusable controlled tools drawer.
- Modify `packages/core/src/openpress/workbench/actions/index.ts` and `packages/core/src/openpress/workbench/panels/index.ts`: export new reusable controls.
- Modify `packages/core/src/openpress/workbench/Workbench.tsx`: toolbar composition, Info trigger, header removal, Settings callback.
- Modify `packages/core/src/openpress/workbench/shell/WorkbenchToolbarActions.tsx`: move Bookmarks into the left group.
- Create `packages/core/src/openpress/workbench/shell/workbenchPanelWidth.ts`: storage-safe width parsing and clamping.
- Create `packages/core/tests/openpress-workbench-panel-width.test.ts`: width model tests.
- Modify `packages/core/src/openpress/workbench/shell/WorkbenchShell.tsx`: opt-in resize handle and persisted CSS width.
- Modify `packages/core/tests/e2e/reader-workbench-toolbar.spec.ts`: route, settings, toolbar-order, overflow, and resize regression coverage.
- Modify `docs/workbench.md`: user-facing Settings, toolbar, and resize behavior.

### Task 1: Shared Workspace Appearance Model

**Files:**
- Create: `packages/core/src/openpress/app/workspaceAppearance.ts`
- Create: `packages/core/tests/openpress-workspace-appearance.test.ts`
- Modify: `packages/core/src/styles/openpress/workspace.css`

**Interfaces:**
- Produces: `WorkspaceColorModePreference`, `WorkspaceColorMode`, `WorkspaceAccent`, `readWorkspaceAppearance(storage)`, `resolveWorkspaceColorMode(preference, prefersLight)`, and `useWorkspaceAppearance()`.
- `useWorkspaceAppearance()` returns `{ colorModePreference, resolvedColorMode, accent, setColorModePreference, setAccent }`.

- [ ] **Step 1: Write failing pure-model tests**

```ts
import { describe, expect, it } from "vitest";
import { readWorkspaceAppearance, resolveWorkspaceColorMode } from "../src/openpress/app/workspaceAppearance";

it("migrates the existing color-mode key and defaults the accent", () => {
  const storage = new Map([["openpress:workspace:color-mode", "light"]]);
  expect(readWorkspaceAppearance({ getItem: (key) => storage.get(key) ?? null })).toEqual({
    colorModePreference: "light",
    accent: "amber",
  });
});

it("rejects invalid persisted values", () => {
  const values = new Map([
    ["openpress:workspace:color-mode", "sepia"],
    ["openpress:workspace:accent", "orange"],
  ]);
  expect(readWorkspaceAppearance({ getItem: (key) => values.get(key) ?? null })).toEqual({
    colorModePreference: "dark",
    accent: "amber",
  });
});

it("resolves system mode without changing explicit modes", () => {
  expect(resolveWorkspaceColorMode("system", true)).toBe("light");
  expect(resolveWorkspaceColorMode("system", false)).toBe("dark");
  expect(resolveWorkspaceColorMode("dark", true)).toBe("dark");
});
```

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `pnpm --filter @open-press/core exec vitest run tests/openpress-workspace-appearance.test.ts`

Expected: FAIL because `workspaceAppearance.ts` does not exist.

- [ ] **Step 3: Implement the model and hook**

Implement exact unions and guarded storage functions. The hook must listen to `matchMedia("(prefers-color-scheme: light)")` only while mounted, persist explicit setters, and apply:

```ts
document.documentElement.dataset.openpressWorkspaceColorMode = resolvedColorMode;
document.documentElement.dataset.openpressWorkspaceAccent = accent;
```

Keep the legacy mode key `openpress:workspace:color-mode`; add `openpress:workspace:accent`. Missing `matchMedia` resolves System to dark. Remove only data attributes owned by the final unmount cleanup.

- [ ] **Step 4: Add five contrast-safe CSS token families**

Add selectors for `data-openpress-workspace-accent="amber|blue|emerald|violet|rose"` under both dark and light Workspace scopes. Each selector must set `--op-workspace-accent`, `--op-workspace-accent-hover`, `--op-workspace-accent-surface`, and `--op-workspace-accent-border`; retain Amber's current values.

- [ ] **Step 5: Run tests and typecheck**

Run:

```bash
pnpm --filter @open-press/core exec vitest run tests/openpress-workspace-appearance.test.ts
pnpm --filter @open-press/core typecheck
```

Expected: appearance tests and typecheck PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/openpress/app/workspaceAppearance.ts packages/core/src/styles/openpress/workspace.css packages/core/tests/openpress-workspace-appearance.test.ts
git commit -m "[core] add workspace appearance preferences"
```

### Task 2: Workspace Settings Destination and Screen

**Files:**
- Create: `packages/core/src/openpress/app/workspaceRoute.ts`
- Create: `packages/core/tests/openpress-workspace-route.test.ts`
- Modify: `packages/core/src/openpress/app/OpenPressApp.tsx`
- Modify: `packages/core/src/openpress/app/WorkspaceGalleryPage.tsx`
- Modify: `packages/core/src/openpress/app/OpenPressRuntime.tsx`

**Interfaces:**
- Consumes: `useWorkspaceAppearance()` from Task 1.
- Produces: `WorkspaceDestination = { kind: "documents" } | { kind: "settings" } | { kind: "press"; slug: string; mode: OpenPressRuntimeMode }`, `parseWorkspaceDestination(pathname)`, and `buildWorkspaceDestination(destination)`.
- `WorkspaceGalleryPage` receives `view: "documents" | "settings"`, `onOpenDocuments`, and `onOpenSettings` in addition to the existing manifest and Press selection.
- `OpenPressRuntime` and `HtmlWorkbench` receive optional `onOpenWorkspaceSettings: () => void`.

- [ ] **Step 1: Write failing route tests**

```ts
expect(parseWorkspaceDestination("/workspace")).toEqual({ kind: "documents" });
expect(parseWorkspaceDestination("/workspace/settings")).toEqual({ kind: "settings" });
expect(parseWorkspaceDestination("/reader/preview")).toEqual({ kind: "press", slug: "reader", mode: "preview" });
expect(buildWorkspaceDestination({ kind: "settings" })).toBe("/workspace/settings");
```

Also assert unknown paths fall back to Documents and presentation routes remain unchanged.

- [ ] **Step 2: Run the targeted route test and verify RED**

Run: `pnpm --filter @open-press/core exec vitest run tests/openpress-workspace-route.test.ts`

Expected: FAIL because the route model does not exist.

- [ ] **Step 3: Implement pure route parsing/building**

Move pathname normalization out of `OpenPressApp.tsx`. Keep page hashes and `?fullscreen=1` construction in the existing Press navigation helper; the new model owns pathnames only.

- [ ] **Step 4: Add Settings state transitions in `OpenPressApp`**

Replace the gallery-only state with a Workspace state carrying `view: "documents" | "settings"`. Resolve Settings before the single-Press auto-entry rule. Add callbacks that push History API paths and either show Settings, show Documents, or load the sole Press. Pass `onOpenWorkspaceSettings` through `OpenPressRuntime` to `HtmlWorkbench` for both single- and multi-Press workspaces.

- [ ] **Step 5: Render the shared Workspace Settings screen**

In `WorkspaceGalleryPage.tsx`, add a Settings navigation item separated from All/Pages/Slides. For `view === "settings"`, replace the card grid with one Appearance form containing:

```ts
const modeOptions = ["system", "dark", "light"] as const;
const accentOptions = ["amber", "blue", "emerald", "violet", "rose"] as const;
```

Use buttons with `aria-pressed`, visible labels, `data-openpress-workspace-mode-option`, and `data-openpress-workspace-accent-option`. Apply changes immediately through `useWorkspaceAppearance()`.

- [ ] **Step 6: Run targeted tests and typecheck**

Run:

```bash
pnpm --filter @open-press/core exec vitest run tests/openpress-workspace-route.test.ts tests/openpress-workspace-appearance.test.ts
pnpm --filter @open-press/core typecheck
```

Expected: tests and typecheck PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/openpress/app/OpenPressApp.tsx packages/core/src/openpress/app/OpenPressRuntime.tsx packages/core/src/openpress/app/WorkspaceGalleryPage.tsx packages/core/src/openpress/app/workspaceRoute.ts packages/core/tests/openpress-workspace-route.test.ts
git commit -m "[core] add workspace appearance settings"
```

### Task 3: Workbench Toolbar Progressive Disclosure

**Files:**
- Create: `packages/core/src/openpress/workbench/actions/WorkbenchOverflowControl.tsx`
- Modify: `packages/core/src/openpress/workbench/actions/DeploymentControl.tsx`
- Modify: `packages/core/src/openpress/workbench/actions/index.ts`
- Modify: `packages/core/src/openpress/workbench/panels/WorkbenchToolsControl.tsx`
- Modify: `packages/core/src/openpress/workbench/panels/index.ts`
- Modify: `packages/core/src/openpress/workbench/shell/WorkbenchToolbarActions.tsx`
- Modify: `packages/core/src/openpress/workbench/Workbench.tsx`
- Test: `packages/core/tests/e2e/reader-workbench-toolbar.spec.ts`

**Interfaces:**
- Consumes: optional `onOpenWorkspaceSettings` from Task 2.
- Produces: `DeploymentDialog({ open, onOpenChange, info, status, onDeploy })`, `WorkbenchToolsDrawer({ open, onOpenChange, panels })`, and `WorkbenchOverflowControl` with Settings, MDX, Deployment, and Tools inputs.

```ts
interface DeploymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  info: DeploymentInfo;
  status: DeployStatus;
  onDeploy: () => void | Promise<void>;
}

interface WorkbenchToolsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panels: WorkbenchPanel[];
}

interface WorkbenchOverflowControlProps {
  onOpenWorkspaceSettings?: () => void;
  mdx?: { active: boolean; onToggle: () => void };
  deployment?: { info: DeploymentInfo; status: DeployStatus; onDeploy: () => void | Promise<void> };
  panels: WorkbenchPanel[];
}
```

- [ ] **Step 1: Write a failing toolbar hierarchy E2E test**

Assert on `/reader/preview` that:

```ts
await expect(page.locator(
  '[aria-label="Workspace navigation"] [data-openpress-back-to-workspace] + [data-openpress-bookmarks-toggle]',
)).toBeVisible();
await expect(page.locator("[data-openpress-color-mode-toggle]")).toHaveCount(0);
await expect(page.locator('[aria-label="Workspace actions"] > *').last()).toHaveAttribute("data-openpress-document-info", "");
```

Open More and verify Workspace Settings, Deployment when enabled, and extension tools are discoverable there rather than as standalone toolbar buttons.

- [ ] **Step 2: Run the desktop toolbar test and verify RED**

Run: `pnpm --filter @open-press/core exec playwright test tests/e2e/reader-workbench-toolbar.spec.ts --config playwright.reader.config.ts --project=desktop --grep "toolbar hierarchy"`

Expected: FAIL because Bookmarks is still on the right, color mode is visible, and Info is not a dedicated final action.

- [ ] **Step 3: Extract controlled Deployment and Tools surfaces**

Keep existing toolbar wrappers for compatibility, but move their dialog/drawer bodies into exported controlled components. `open` and `onOpenChange` must be owned by the caller; Deployment closes before invoking `onDeploy`. Do not place a dialog owner beneath dropdown content that unmounts on selection.

- [ ] **Step 4: Implement `WorkbenchOverflowControl`**

Render one More icon trigger. Its menu order is Settings, MDX when available, Deployment when locally available, then Tools when panels exist. Menu selection closes More before opening controlled Deployment/Tools surfaces. Settings navigates; MDX invokes the existing toggle. Keep stable selectors:

```tsx
data-openpress-workbench-more
data-openpress-overflow-settings
data-openpress-overflow-mdx
data-openpress-overflow-deployment
data-openpress-overflow-tools
```

- [ ] **Step 5: Recompose the toolbar**

Move `BookmarksToggle` immediately after Home inside the Workspace navigation group. Keep Comments and Export visible. Replace standalone MDX, Deployment, Tools, and color mode controls with `WorkbenchOverflowControl`. Change `WorkbenchDocumentInfoControl` to use an Info icon trigger with `data-openpress-document-info`, and render it after More.

- [ ] **Step 6: Run the toolbar E2E test and typecheck**

Run:

```bash
pnpm --filter @open-press/core exec playwright test tests/e2e/reader-workbench-toolbar.spec.ts --config playwright.reader.config.ts --project=desktop --grep "toolbar hierarchy"
pnpm --filter @open-press/core typecheck
```

Expected: hierarchy test and typecheck PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/openpress/workbench packages/core/tests/e2e/reader-workbench-toolbar.spec.ts
git commit -m "[core] simplify workbench toolbar actions"
```

### Task 4: Simplified and Resizable Left Navigation

**Files:**
- Create: `packages/core/src/openpress/workbench/shell/workbenchPanelWidth.ts`
- Create: `packages/core/tests/openpress-workbench-panel-width.test.ts`
- Modify: `packages/core/src/openpress/workbench/shell/WorkbenchShell.tsx`
- Modify: `packages/core/src/openpress/workbench/Workbench.tsx`
- Modify: `packages/core/tests/e2e/reader-workbench-toolbar.spec.ts`

**Interfaces:**
- Produces: `MIN_LEFT_PANEL_WIDTH = 240`, `MAX_LEFT_PANEL_WIDTH = 480`, `clampLeftPanelWidth(value)`, `readLeftPanelWidth(storage)`, and storage key `openpress:workspace:left-panel-width`.
- `WorkbenchShell` gains `resizableLeftPanel?: boolean`; resize behavior remains disabled for public readers.

- [ ] **Step 1: Write failing width-model tests**

```ts
expect(clampLeftPanelWidth(120)).toBe(240);
expect(clampLeftPanelWidth(360)).toBe(360);
expect(clampLeftPanelWidth(900)).toBe(480);
expect(readLeftPanelWidth({ getItem: () => "invalid" })).toBeNull();
expect(readLeftPanelWidth({ getItem: () => "420" })).toBe(420);
```

- [ ] **Step 2: Run the width test and verify RED**

Run: `pnpm --filter @open-press/core exec vitest run tests/openpress-workbench-panel-width.test.ts`

Expected: FAIL because the width model does not exist.

- [ ] **Step 3: Implement storage-safe width helpers**

Parse only finite numeric values. Return `null` for missing/invalid storage and clamp valid values. Export exact constants so the separator's ARIA values and tests cannot diverge.

- [ ] **Step 4: Write a failing resize E2E test**

Verify the identity header is absent, the separator is present on desktop, ArrowRight changes its `aria-valuenow`, the grid/canvas width changes, local storage receives the value, reload restores it, double-click clears the stored override, and switching Presses retains the same width.

Add a tablet scenario that preloads `480`, confirms the resize separator is hidden, confirms the panel uses its compact responsive width, and confirms local storage still contains `480` for a later wide viewport.

- [ ] **Step 5: Remove the duplicate identity header**

Delete `WORKBENCH_LEFT_IDENTITY_*` and viewport-summary constants and JSX from `Workbench.tsx`. Keep `LeftPanelSearch`, bookmark/thumbnail content, slide tabs, and `CurrentPagePanel`. Remove imports/helpers made unused only by this block.

- [ ] **Step 6: Add the resize separator in `WorkbenchShell`**

When `resizableLeftPanel` and the panel is visible, render an absolutely positioned separator on its right edge. Use pointer capture and update `--op-workspace-left-width` continuously. Set `document.body.style.userSelect = "none"` only during a drag and restore the previous value on pointer up, pointer cancel, and unmount. Implement ArrowLeft/ArrowRight in 8px steps, Shift in 24px steps, and double-click reset.

Hide the handle at the compact breakpoint and ignore the stored override there without deleting it. Pass `resizableLeftPanel` only from `HtmlWorkbench`.

- [ ] **Step 7: Run targeted tests and typecheck**

Run:

```bash
pnpm --filter @open-press/core exec vitest run tests/openpress-workbench-panel-width.test.ts
pnpm --filter @open-press/core exec playwright test tests/e2e/reader-workbench-toolbar.spec.ts --config playwright.reader.config.ts --project=desktop --grep "resiz"
pnpm --filter @open-press/core typecheck
```

Expected: width model, resize E2E, and typecheck PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/openpress/workbench/Workbench.tsx packages/core/src/openpress/workbench/shell/WorkbenchShell.tsx packages/core/src/openpress/workbench/shell/workbenchPanelWidth.ts packages/core/tests/openpress-workbench-panel-width.test.ts packages/core/tests/e2e/reader-workbench-toolbar.spec.ts
git commit -m "[core] resize workspace navigation panel"
```

### Task 5: Settings and Appearance Browser Coverage

**Files:**
- Modify: `packages/core/tests/e2e/reader-workbench-toolbar.spec.ts`
- Modify: `docs/workbench.md`

**Interfaces:**
- Consumes: all user-facing selectors and routes from Tasks 1–4.
- Produces: end-to-end regression coverage and user-facing documentation.

- [ ] **Step 1: Add failing Settings route and persistence scenarios**

Cover direct `/workspace/settings`, Documents/Settings navigation, browser back/forward, each mode option, all five accent options, refresh persistence, legacy `light` migration, and Settings opened from the workbench More menu. Assert Workspace data attributes change while `.reader-page` theme variables remain unchanged.

- [ ] **Step 2: Run Settings scenarios and verify any uncovered behavior fails**

Run: `pnpm --filter @open-press/core exec playwright test tests/e2e/reader-workbench-toolbar.spec.ts --config playwright.reader.config.ts --project=desktop --grep "workspace settings|appearance"`

Expected before final fixes: at least one new assertion FAILS, proving the scenarios exercise new behavior rather than only existing paths.

- [ ] **Step 3: Fix integration gaps only**

Correct route/history synchronization, data-attribute application, focus return, storage guards, or responsive selectors exposed by Step 2. Do not add settings beyond Appearance or new accent choices.

- [ ] **Step 4: Update workbench documentation**

Document `/workspace/settings`, System/Dark/Light, five Workspace-only accents, the new toolbar grouping, More contents, Info placement, Bookmarks placement, and left-panel resize/reset/persistence behavior.

- [ ] **Step 5: Run the complete targeted E2E file**

Run: `pnpm --filter @open-press/core exec playwright test tests/e2e/reader-workbench-toolbar.spec.ts --config playwright.reader.config.ts`

Expected: all desktop/tablet scenarios PASS or retain only their existing conditional skips.

- [ ] **Step 6: Commit**

```bash
git add packages/core/tests/e2e/reader-workbench-toolbar.spec.ts docs/workbench.md
git commit -m "[core] verify workspace appearance controls"
```

### Task 6: Full Regression and Manual QA

**Files:**
- Modify only files required by a discovered regression; do not broaden scope.

**Interfaces:**
- Consumes: completed Tasks 1–5.
- Produces: release-ready verification evidence.

- [ ] **Step 1: Run static and unit verification**

```bash
pnpm --filter @open-press/core typecheck
pnpm --filter @open-press/core test:node
pnpm --filter @open-press/core test:unit
```

Expected: typecheck, all Node tests, and all Vitest tests PASS.

- [ ] **Step 2: Run complete reader E2E**

Run: `pnpm --filter @open-press/core test:e2e:reader`

Expected: all reader projects PASS with only documented conditional skips.

- [ ] **Step 3: Run repository build**

Run: `pnpm run build`

Expected: every tracked Press validates and renders successfully; chunk-size warnings are non-blocking only if unchanged.

- [ ] **Step 4: Perform manual browser QA**

At the local workspace URL, verify all five accents in Dark and Light, change the OS/browser media preference while System is selected, enter Settings from More, use browser Back, overflow Press tabs, deploy/export/info dialogs, collapse and resize Bookmarks, refresh, switch Presses, and inspect a compact viewport. Confirm output pages retain their Press theme.

- [ ] **Step 5: Review diff and working tree**

Run:

```bash
git diff --check
git status --short
git log --oneline -8
```

Expected: no whitespace errors, no generated artifacts, and only intended source/test/doc changes.

- [ ] **Step 6: Commit any verification-only fix**

If Step 1–5 required a scoped correction, commit only that correction with:

```bash
git add -u packages/core/src packages/core/tests docs/workbench.md
git commit -m "[core] harden workspace appearance controls"
```

If no correction was required, do not create an empty commit.
