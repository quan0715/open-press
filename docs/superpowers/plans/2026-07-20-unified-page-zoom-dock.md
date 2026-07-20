# Unified Page Zoom Dock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Reader and Workbench zoom dropdowns with one panel-native zoom dock that supports minus/plus stepping, quick fit and fixed choices, custom 25–200% values, persistence, and stable reading position.

**Architecture:** Keep scale state, local persistence, scale calculation, and viewport anchoring in `usePageViewportScale`. Add pure custom-mode helpers to `pageViewportScaleModel.ts`, then build a controlled `PageZoomDock` that consumes the hook output. Compose that dock as a Workbench right-panel footer and as a Public Reader floating canvas control without teaching `WorkbenchShell` about zoom.

**Tech Stack:** React 19, TypeScript, Tailwind v4 utility classes, Radix Dropdown Menu, lucide-react, Vitest, Playwright.

## Global Constraints

- Custom zoom is an integer from 25% through 200%.
- Minus and plus change the resolved percentage by exactly 10 percentage points.
- Workbench renders one unboxed footer row with only a top divider; no title, card, or nested section.
- Public Reader renders the same controls in one compact raised row, bottom-right on desktop and bottom-center on narrow screens.
- Reader and Workbench retain separate local-storage keys.
- All zoom changes continue through `usePageViewportScale` so page-relative anchor restoration remains active.
- Remove user-facing toolbar/output zoom and spread controls, but retain low-level `PageLayoutMode` compatibility in this patch.
- Do not release from this branch.

---

### Task 0: Preserve the verified persistence and anchor foundation

**Files:**
- Modify: `packages/core/src/openpress/reader/usePageViewportScale.ts`
- Modify: `packages/core/src/openpress/reader/PublicReaderPage.tsx`
- Modify: `packages/core/src/openpress/workbench/Workbench.tsx`
- Modify: `packages/core/tests/e2e/reader-public-toolbar.spec.ts`
- Create: `packages/core/tests/e2e/reader-workbench-toolbar.spec.ts`
- Create: `.changeset/calm-readers-stay.md`

**Interfaces:**
- Produces: `usePageViewportScale({ scaleModeStorageKey })` with safe persistence and page-relative viewport-anchor restoration.
- Consumes: existing `PageViewportScaleMode`, stage ref, and page-container ref contracts.

- [ ] **Step 1: Re-run the existing focused regression suite**

Run:

```bash
pnpm --dir packages/core exec playwright test --config playwright.reader.config.ts \
  tests/e2e/reader-public-toolbar.spec.ts tests/e2e/reader-workbench-toolbar.spec.ts
```

Expected: Public Reader persistence and anchor tests pass on desktop/tablet; Workbench persistence passes on desktop and is intentionally skipped on tablet.

- [ ] **Step 2: Verify the current foundation diff is isolated**

Run:

```bash
git diff --check
git status --short
```

Expected: only the six foundation source/test/changeset files listed above are uncommitted.

- [ ] **Step 3: Commit the verified foundation**

```bash
git add .changeset/calm-readers-stay.md \
  packages/core/src/openpress/reader/usePageViewportScale.ts \
  packages/core/src/openpress/reader/PublicReaderPage.tsx \
  packages/core/src/openpress/workbench/Workbench.tsx \
  packages/core/tests/e2e/reader-public-toolbar.spec.ts \
  packages/core/tests/e2e/reader-workbench-toolbar.spec.ts
git commit -m "[core] persist zoom and preserve reader position"
```

---

### Task 1: Generalize the page scale model for custom percentages

**Files:**
- Modify: `packages/core/tests/openpress-page-viewport-scale.test.ts`
- Modify: `packages/core/src/openpress/reader/pageViewportScaleModel.ts`
- Modify: `packages/core/src/openpress/reader/usePageViewportScale.ts`

**Interfaces:**
- Produces: `pageViewportScaleModeFromPercent(percent: number): PageViewportScaleMode`.
- Produces: `parsePageViewportScaleMode(value: string): PageViewportScaleMode | null`.
- Produces: `stepPageViewportScale(scale: number, deltaPercent: -10 | 10): PageViewportScaleMode`.
- Consumes: `PageViewportScaleMode = "fit-width" | "fit-page" | \`scale-${number}\``.

- [ ] **Step 1: Write failing model tests**

Add these imports and cases to `packages/core/tests/openpress-page-viewport-scale.test.ts`:

```ts
import {
  PAGE_VIEWPORT_SCALE_OPTIONS,
  formatPageViewportScaleLabel,
  pageViewportScaleModeFromPercent,
  parsePageViewportScaleMode,
  resolvePageViewportScale,
  stepPageViewportScale,
  type PageViewportScaleMode,
} from "../src/openpress/reader";

it("creates and resolves arbitrary integer fixed zoom modes", () => {
  expect(pageViewportScaleModeFromPercent(137)).toBe("scale-137");
  expect(resolvePageViewportScale({ mode: "scale-137", fitWidthScale: 0.4, fitPageScale: 0.3 })).toBe(1.37);
  expect(formatPageViewportScaleLabel("scale-137", 1.37)).toBe("137%");
});

it("clamps custom fixed zoom modes to the supported range", () => {
  expect(pageViewportScaleModeFromPercent(10)).toBe("scale-25");
  expect(pageViewportScaleModeFromPercent(245)).toBe("scale-200");
});

it("parses persisted custom modes and rejects malformed values", () => {
  expect(parsePageViewportScaleMode("scale-137")).toBe("scale-137");
  expect(parsePageViewportScaleMode("fit-width")).toBe("fit-width");
  expect(parsePageViewportScaleMode("scale-20")).toBeNull();
  expect(parsePageViewportScaleMode("scale-137.5")).toBeNull();
  expect(parsePageViewportScaleMode("other")).toBeNull();
});

it("steps from the resolved displayed percentage", () => {
  expect(stepPageViewportScale(1.25, -10)).toBe("scale-115");
  expect(stepPageViewportScale(1.25, 10)).toBe("scale-135");
  expect(stepPageViewportScale(0.466, 10)).toBe("scale-57");
});
```

- [ ] **Step 2: Run the model test and confirm RED**

Run:

```bash
pnpm --dir packages/core exec vitest run tests/openpress-page-viewport-scale.test.ts
```

Expected: FAIL because the three new helpers are not exported and `scale-137` is not accepted by the current type.

- [ ] **Step 3: Implement the custom-mode helpers**

Replace the fixed literal union and add the helpers in `pageViewportScaleModel.ts`:

```ts
export type PageViewportScaleMode = "fit-width" | "fit-page" | `scale-${number}`;

export const MIN_FIXED_PAGE_VIEWPORT_PERCENT = 25;
export const MAX_FIXED_PAGE_VIEWPORT_PERCENT = 200;

export function pageViewportScaleModeFromPercent(percent: number): PageViewportScaleMode {
  const rounded = Number.isFinite(percent) ? Math.round(percent) : 100;
  const clamped = Math.min(
    Math.max(rounded, MIN_FIXED_PAGE_VIEWPORT_PERCENT),
    MAX_FIXED_PAGE_VIEWPORT_PERCENT,
  );
  return `scale-${clamped}`;
}

export function parsePageViewportScaleMode(value: string): PageViewportScaleMode | null {
  if (value === "fit-width" || value === "fit-page") return value;
  const match = /^scale-(\d+)$/.exec(value);
  if (!match) return null;
  const percent = Number.parseInt(match[1] ?? "", 10);
  if (percent < MIN_FIXED_PAGE_VIEWPORT_PERCENT || percent > MAX_FIXED_PAGE_VIEWPORT_PERCENT) return null;
  return `scale-${percent}`;
}

export function stepPageViewportScale(
  scale: number,
  deltaPercent: -10 | 10,
): PageViewportScaleMode {
  return pageViewportScaleModeFromPercent(Math.round(scale * 100) + deltaPercent);
}
```

Update fixed-value resolution to parse the generalized mode:

```ts
function scaleModeToFixedValue(mode: PageViewportScaleMode) {
  const match = /^scale-(\d+)$/.exec(mode);
  const percent = Number.parseInt(match?.[1] ?? "100", 10);
  return clampPageViewportScale(percent / 100, MAX_FIXED_PAGE_VIEWPORT_SCALE);
}
```

Replace the option-list-only storage validator in `usePageViewportScale.ts`:

```ts
import {
  formatPageViewportScaleLabel,
  formatPageViewportScaleValue,
  parsePageViewportScaleMode,
  resolvePageViewportScale,
  type PageLayoutMode,
  type PageViewportScaleMode,
} from "./pageViewportScaleModel";

const stored = window.localStorage.getItem(storageKey);
return stored ? parsePageViewportScaleMode(stored) ?? fallback : fallback;
```

Delete the private `isPageViewportScaleMode` helper and its `PAGE_VIEWPORT_SCALE_OPTIONS` import.

- [ ] **Step 4: Run model tests and typecheck for GREEN**

```bash
pnpm --dir packages/core exec vitest run tests/openpress-page-viewport-scale.test.ts
pnpm --filter @open-press/core typecheck
```

Expected: all page-scale model tests pass and core typecheck exits 0.

- [ ] **Step 5: Commit the generalized model**

```bash
git add packages/core/tests/openpress-page-viewport-scale.test.ts \
  packages/core/src/openpress/reader/pageViewportScaleModel.ts \
  packages/core/src/openpress/reader/usePageViewportScale.ts
git commit -m "[core] support custom page zoom percentages"
```

---

### Task 2: Build the shared dock and integrate Public Reader

**Files:**
- Create: `packages/core/src/openpress/workbench/actions/PageZoomDock.tsx`
- Modify: `packages/core/src/openpress/workbench/actions/index.ts`
- Modify: `packages/core/src/openpress/reader/PublicReaderPage.tsx`
- Modify: `packages/core/src/openpress/reader/publicViewerClasses.ts`
- Modify: `packages/core/src/openpress/workbench/shell/WorkbenchShell.tsx`
- Modify: `packages/core/tests/e2e/reader-public-toolbar.spec.ts`

**Interfaces:**
- Consumes: `pageViewportScaleModeFromPercent`, `stepPageViewportScale`, `PageViewportScaleMode` from Task 1.
- Produces: `PageZoomDock({ scaleMode, scale, scaleLabel, placement, onScaleModeChange })`.
- Produces data hooks: `data-openpress-page-zoom-dock`, `data-openpress-zoom-decrease`, `data-openpress-zoom-value`, `data-openpress-zoom-increase`, `data-openpress-custom-zoom`.

- [ ] **Step 1: Rewrite Public Reader E2E expectations for the dock**

Replace old toolbar/spread interactions with these behavioral assertions:

```ts
test("uses the floating zoom dock without toolbar or spread controls", async ({ page }) => {
  await page.goto("/");
  await expectPublishedReader(page);

  const dock = page.locator('[data-openpress-page-zoom-dock="floating"]');
  await expect(dock).toBeVisible();
  await expect(page.locator("[data-openpress-page-zoom]")).toHaveCount(0);
  await expect(page.locator("[data-openpress-page-layout-option]")) .toHaveCount(0);

  await dock.locator("[data-openpress-zoom-value]").click();
  await page.locator('[data-openpress-zoom-option="scale-125"]').click();
  await expect(dock.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "scale-125",
  );

  await dock.locator("[data-openpress-zoom-increase]").click();
  await expect(dock.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "scale-135",
  );

  await dock.locator("[data-openpress-zoom-value]").click();
  await page.locator('[data-openpress-zoom-option="fit-width"]').click();
  await expect(dock.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "fit-width",
  );
});

test("applies and persists a custom zoom percentage", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((key) => localStorage.removeItem(key), READER_ZOOM_STORAGE_KEY);
  await page.reload();

  const value = page.locator("[data-openpress-zoom-value]");
  await value.click();
  const input = page.locator("[data-openpress-custom-zoom]");
  await input.fill("137");
  await input.press("Enter");
  await expect(value).toHaveAttribute("data-openpress-scale-mode", "scale-137");
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), READER_ZOOM_STORAGE_KEY))
    .toBe("scale-137");

  await page.reload();
  await expect(page.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "scale-137",
  );
});
```

In the existing anchor test, replace each old zoom-button interaction with:

```ts
const zoomValue = page.locator("[data-openpress-zoom-value]");
await zoomValue.click();
await page.locator('[data-openpress-zoom-option="scale-125"]').click();
await expect(zoomValue).toHaveAttribute("data-openpress-scale-mode", "scale-125");

// After positioning the viewport and recording `before`:
await zoomValue.click();
await page.locator('[data-openpress-zoom-option="scale-150"]').click();
await expect(zoomValue).toHaveAttribute("data-openpress-scale-mode", "scale-150");
```

- [ ] **Step 2: Run Public Reader E2E and confirm RED**

```bash
pnpm --dir packages/core exec playwright test --config playwright.reader.config.ts \
  tests/e2e/reader-public-toolbar.spec.ts --project=desktop
```

Expected: FAIL because the floating dock and custom input do not exist.

- [ ] **Step 3: Create `PageZoomDock`**

Implement the controlled component with this public signature and event flow:

```tsx
import { useEffect, useState } from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import {
  MAX_FIXED_PAGE_VIEWPORT_PERCENT,
  MIN_FIXED_PAGE_VIEWPORT_PERCENT,
  PAGE_VIEWPORT_SCALE_OPTIONS,
  pageViewportScaleModeFromPercent,
  stepPageViewportScale,
  type PageViewportScaleMode,
} from "../../reader";
import { Button } from "@/openpress/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/openpress/ui/dropdown-menu";

const PANEL_ZOOM_DOCK_CLASS = [
  "grid grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-1",
  "border-t border-[var(--op-workspace-border-muted)] bg-[var(--op-workspace-panel-bg)] px-3 py-2",
].join(" ");
const FLOATING_ZOOM_DOCK_CLASS = [
  "absolute bottom-[calc(16px+env(safe-area-inset-bottom))] right-4 z-20",
  "grid grid-cols-[32px_minmax(72px,1fr)_32px] items-center gap-1",
  "rounded-[var(--op-workspace-radius-md)] border border-[var(--op-workspace-border)]",
  "bg-[var(--op-workspace-surface-raised)] p-1 shadow-[var(--op-workspace-shadow-floating)]",
  "max-[520px]:left-1/2 max-[520px]:right-auto max-[520px]:-translate-x-1/2",
].join(" ");
const ZOOM_DOCK_ICON_BUTTON_CLASS = "h-8 w-8 rounded-[var(--op-workspace-radius-sm)] p-0";
const ZOOM_DOCK_VALUE_CLASS = [
  "h-8 min-w-0 justify-center gap-1.5 rounded-[var(--op-workspace-radius-sm)] px-2",
  "text-[11px] font-[650] [font-family:var(--openpress-font-mono)]",
].join(" ");
const ZOOM_DOCK_MENU_CLASS = [
  "op-ui-menu w-[220px] rounded-[10px] border border-[var(--op-workspace-border)]",
  "bg-[var(--op-workspace-surface-raised)] p-2 shadow-[var(--op-workspace-shadow-popover)]",
].join(" ");
const ZOOM_DOCK_MENU_ITEM_CLASS = "min-h-8 rounded-[var(--op-workspace-radius-sm)] px-2 text-xs";
const ZOOM_DOCK_CUSTOM_CLASS = [
  "grid grid-cols-[minmax(0,1fr)_64px_auto] items-center gap-2 px-2 py-1.5",
  "text-xs text-[var(--op-workspace-text-muted)]",
].join(" ");
const ZOOM_DOCK_CUSTOM_INPUT_CLASS = [
  "h-8 w-full rounded-[var(--op-workspace-radius-sm)] border border-[var(--op-workspace-border)]",
  "bg-[var(--op-workspace-surface)] px-2 text-right text-[var(--op-workspace-text)] outline-none",
  "focus:border-[var(--op-workspace-accent-border)]",
].join(" ");

const DOCK_ZOOM_OPTIONS: Array<{ value: PageViewportScaleMode; label: string }> = [
  { value: "fit-width", label: "符合頁面寬度" },
  { value: "fit-page", label: "符合全開頁面" },
  ...PAGE_VIEWPORT_SCALE_OPTIONS.filter((option) => option.value.startsWith("scale-")),
];

export interface PageZoomDockProps {
  scaleMode: PageViewportScaleMode;
  scale: number;
  scaleLabel: string;
  placement: "panel" | "floating";
  onScaleModeChange: (mode: PageViewportScaleMode) => void;
}

export function PageZoomDock({
  scaleMode,
  scale,
  scaleLabel,
  placement,
  onScaleModeChange,
}: PageZoomDockProps) {
  const [open, setOpen] = useState(false);
  const [customValue, setCustomValue] = useState(String(Math.round(scale * 100)));
  const percent = Math.round(scale * 100);

  useEffect(() => {
    if (!open) setCustomValue(String(percent));
  }, [open, percent]);

  const applyCustom = () => {
    const normalized = customValue.trim();
    if (!/^\d+$/.test(normalized)) {
      setCustomValue(String(percent));
      return;
    }
    const parsed = Number.parseInt(normalized, 10);
    const mode = pageViewportScaleModeFromPercent(parsed);
    onScaleModeChange(mode);
    setCustomValue(mode.slice("scale-".length));
    setOpen(false);
  };

  return (
    <div
      className={placement === "panel" ? PANEL_ZOOM_DOCK_CLASS : FLOATING_ZOOM_DOCK_CLASS}
      data-openpress-page-zoom-dock={placement}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={ZOOM_DOCK_ICON_BUTTON_CLASS}
        disabled={percent <= MIN_FIXED_PAGE_VIEWPORT_PERCENT}
        aria-label="縮小頁面 10%"
        data-openpress-zoom-decrease
        onClick={() => onScaleModeChange(stepPageViewportScale(scale, -10))}
      >
        <Minus aria-hidden="true" />
      </Button>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className={ZOOM_DOCK_VALUE_CLASS}
            data-openpress-zoom-value
            data-openpress-scale-mode={scaleMode}
            aria-label={`頁面縮放 ${scaleLabel}`}
          >
            <span>{scaleLabel}</span>
            <ChevronDown aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="center"
          sideOffset={8}
          className={ZOOM_DOCK_MENU_CLASS}
          data-openpress-zoom-menu
        >
          <DropdownMenuRadioGroup value={scaleMode}>
            {DOCK_ZOOM_OPTIONS.map((option) => (
                <DropdownMenuRadioItem
                  key={option.value}
                  value={option.value}
                  className={ZOOM_DOCK_MENU_ITEM_CLASS}
                  data-openpress-zoom-option={option.value}
                  onSelect={() => onScaleModeChange(option.value)}
                >
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <label className={ZOOM_DOCK_CUSTOM_CLASS} onKeyDown={(event) => event.stopPropagation()}>
            <span>自訂比例</span>
            <input
              type="number"
              min={MIN_FIXED_PAGE_VIEWPORT_PERCENT}
              max={MAX_FIXED_PAGE_VIEWPORT_PERCENT}
              step={1}
              value={customValue}
              className={ZOOM_DOCK_CUSTOM_INPUT_CLASS}
              aria-label="自訂縮放百分比"
              data-openpress-custom-zoom
              onChange={(event) => setCustomValue(event.target.value)}
              onBlur={applyCustom}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyCustom();
                }
              }}
            />
            <span aria-hidden="true">%</span>
          </label>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={ZOOM_DOCK_ICON_BUTTON_CLASS}
        disabled={percent >= MAX_FIXED_PAGE_VIEWPORT_PERCENT}
        aria-label="放大頁面 10%"
        data-openpress-zoom-increase
        onClick={() => onScaleModeChange(stepPageViewportScale(scale, 10))}
      >
        <Plus aria-hidden="true" />
      </Button>
    </div>
  );
}
```

Use the component-local class constants shown above. Export the component from `actions/index.ts` with:

```ts
export * from "./PageZoomDock";
```

- [ ] **Step 4: Integrate the floating dock into Public Reader**

In `PublicReaderPage.tsx`, remove `PageZoomControl`, page-layout state, layout callbacks, and toolbar zoom markup. Render:

```tsx
<WorkbenchShell.MainContent>
  <main className={PUBLIC_READER_STAGE_CLASS} tabIndex={-1} ref={reader.stageRef}>
    <PublicPage
      pages={displayPages}
      currentPageIndex={reader.currentPageIndex}
      sourceContainerRef={sourceContainerRef}
      registerPage={reader.registerPage}
      onInternalAnchorNavigate={selectPublicAnchor}
    />
  </main>
  <PageZoomDock
    placement="floating"
    scaleMode={pageViewport.scaleMode}
    scale={pageViewport.scale}
    scaleLabel={pageViewport.scaleLabel}
    onScaleModeChange={pageViewport.setScaleMode}
  />
</WorkbenchShell.MainContent>
```

Add `relative` to `MAIN_CONTENT_CLASS`. Increase Public Reader page-container bottom padding so the last page can clear the floating dock and safe-area offset.

- [ ] **Step 5: Run Public Reader E2E and typecheck for GREEN**

```bash
pnpm --dir packages/core exec playwright test --config playwright.reader.config.ts \
  tests/e2e/reader-public-toolbar.spec.ts
pnpm --filter @open-press/core typecheck
```

Expected: Public Reader dock, custom persistence, quick selection, stepping, and anchor tests pass on desktop/tablet; typecheck exits 0.

- [ ] **Step 6: Commit Public Reader dock integration**

```bash
git add packages/core/src/openpress/workbench/actions/PageZoomDock.tsx \
  packages/core/src/openpress/workbench/actions/index.ts \
  packages/core/src/openpress/reader/PublicReaderPage.tsx \
  packages/core/src/openpress/reader/publicViewerClasses.ts \
  packages/core/src/openpress/workbench/shell/WorkbenchShell.tsx \
  packages/core/tests/e2e/reader-public-toolbar.spec.ts
git commit -m "[core] add public reader zoom dock"
```

---

### Task 3: Integrate the panel-native Workbench footer

**Files:**
- Modify: `packages/core/tests/e2e/reader-workbench-toolbar.spec.ts`
- Modify: `packages/core/src/openpress/workbench/Workbench.tsx`

**Interfaces:**
- Consumes: `PageZoomDock` from Task 2 and the existing Workbench `pageViewport` hook result.
- Produces: a right-panel two-row composition with a fixed `data-openpress-page-zoom-dock="panel"` footer.

- [ ] **Step 1: Write failing Workbench footer tests**

Replace the old toolbar test with:

```ts
test("keeps the zoom dock attached to the workbench panel footer", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the fixed desktop panel shell");
  await page.goto("/workspace");

  const panel = page.locator("[data-openpress-right-panel]");
  const dock = panel.locator('[data-openpress-page-zoom-dock="panel"]');
  const content = panel.locator("[data-openpress-control-panel]");
  await expect(dock).toBeVisible();
  await expect(panel.locator("[data-openpress-page-zoom]")).toHaveCount(0);

  const before = await dock.boundingBox();
  await content.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  const after = await dock.boundingBox();
  expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(1);
});

test("persists a custom workbench zoom mode", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the fixed desktop panel shell");
  await page.goto("/workspace");
  await page.evaluate((key) => localStorage.removeItem(key), WORKBENCH_ZOOM_STORAGE_KEY);
  await page.reload();

  await page.locator("[data-openpress-zoom-value]").click();
  const input = page.locator("[data-openpress-custom-zoom]");
  await input.fill("137");
  await input.press("Enter");
  await expect(page.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "scale-137",
  );
  await page.reload();
  await expect(page.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "scale-137",
  );
});
```

- [ ] **Step 2: Run Workbench E2E and confirm RED**

```bash
pnpm --dir packages/core exec playwright test --config playwright.reader.config.ts \
  tests/e2e/reader-workbench-toolbar.spec.ts --project=desktop
```

Expected: FAIL because the panel footer dock does not exist.

- [ ] **Step 3: Compose the Workbench panel footer**

Remove `PageZoomControl` and all zoom/layout props from `WorkspaceOutputPanel`. Remove Workbench page-layout state and stop passing `layoutMode` to the hook or `pageLayoutMode` to `PublicPage`.

Replace the right-panel body with:

```tsx
<WorkbenchShell.RightPanel>
  <div className="grid min-h-0 h-full grid-rows-[minmax(0,1fr)_auto]">
    <WorkbenchControlPanel panels={controlPanels} />
    <PageZoomDock
      placement="panel"
      scaleMode={pageViewport.scaleMode}
      scale={pageViewport.scale}
      scaleLabel={pageViewport.scaleLabel}
      onScaleModeChange={pageViewport.setScaleMode}
    />
  </div>
</WorkbenchShell.RightPanel>
```

Keep `WorkspaceOutputPanel` focused on export and presentation actions.

- [ ] **Step 4: Run Workbench and combined Reader E2E for GREEN**

```bash
pnpm --dir packages/core exec playwright test --config playwright.reader.config.ts \
  tests/e2e/reader-workbench-toolbar.spec.ts --project=desktop
pnpm --filter @open-press/core test:e2e:reader
```

Expected: Workbench footer/custom persistence tests pass and the complete Reader suite has no failures.

- [ ] **Step 5: Commit Workbench integration**

```bash
git add packages/core/src/openpress/workbench/Workbench.tsx \
  packages/core/tests/e2e/reader-workbench-toolbar.spec.ts
git commit -m "[core] move workbench zoom to panel footer"
```

---

### Task 4: Remove obsolete zoom and spread UI code

**Files:**
- Delete: `packages/core/src/openpress/workbench/actions/PageZoomControl.tsx`
- Modify: `packages/core/src/openpress/workbench/actions/index.ts`
- Modify: `packages/core/src/openpress/workbench/toolbarClasses.ts`
- Modify: `packages/core/src/openpress/reader/PublicReaderPage.tsx`
- Modify: `packages/core/src/openpress/reader/publicViewerClasses.ts`
- Modify: `packages/core/tests/e2e/reader-public-toolbar.spec.ts`

**Interfaces:**
- Consumes: Public Reader and Workbench integrations from Tasks 2–3.
- Produces: no user-facing spread selector and no legacy `PageZoomControl` references.

- [ ] **Step 1: Add absence assertions before cleanup**

Keep these assertions in Public Reader E2E:

```ts
await expect(page.locator("[data-openpress-page-zoom]")).toHaveCount(0);
await expect(page.locator("[data-openpress-page-layout-option]")).toHaveCount(0);
await expect(page.locator('[data-openpress-public-page="true"]')).toHaveAttribute(
  "data-openpress-page-layout",
  "single",
);
```

Run the test before cleanup. Expected: the first two assertions pass after Tasks 2–3; the fixed single-page attribute continues to pass.

- [ ] **Step 2: Delete dead internal UI and fix PublicPage to single layout**

Delete `PageZoomControl.tsx` and remove its export. Delete unused `ZOOM_*` class constants from `toolbarClasses.ts` after confirming with:

```bash
rg -n "ZOOM_(CONTROL|MENU|CHEVRON)|PageZoomControl" packages/core/src packages/core/tests
```

Remove the `pageLayoutMode` prop from `PublicPage`. Keep the rendered compatibility marker fixed:

```tsx
<div
  className={cn(PUBLIC_READER_PAGES_CLASS, className)}
  ref={sourceContainerRef}
  data-openpress-public-page="true"
  data-openpress-page-layout="single"
  onClick={handlePageClick}
>
```

Remove `data-openpress-page-spread-side` and the dormant spread grid utility from `PUBLIC_READER_PAGES_CLASS`. Do not remove the exported `PageLayoutMode` or hook option in this patch.

- [ ] **Step 3: Verify no legacy UI references remain**

```bash
rg -n "PageZoomControl|data-openpress-page-layout-option|data-openpress-page-spread-side" \
  packages/core/src packages/core/tests
pnpm --filter @open-press/core typecheck
pnpm --filter @open-press/core test:e2e:reader
```

Expected: `rg` returns only intentional absence assertions for the layout option; typecheck exits 0; Reader E2E has no failures.

- [ ] **Step 4: Commit cleanup**

```bash
git add packages/core/src/openpress/workbench/actions \
  packages/core/src/openpress/workbench/toolbarClasses.ts \
  packages/core/src/openpress/reader/PublicReaderPage.tsx \
  packages/core/src/openpress/reader/publicViewerClasses.ts \
  packages/core/tests/e2e/reader-public-toolbar.spec.ts
git commit -m "[core] remove legacy zoom and spread controls"
```

---

### Task 5: Final release metadata and verification

**Files:**
- Modify: `.changeset/calm-readers-stay.md`

**Interfaces:**
- Consumes: all implementation tasks.
- Produces: patch release metadata for the fixed OpenPress package family.

- [ ] **Step 1: Update the changeset summary**

Use this final text:

```md
---
"@open-press/core": patch
---

Persist Reader and Workbench zoom preferences, preserve page-relative reading position, and add a shared zoom dock with custom 25–200% controls.
```

- [ ] **Step 2: Run fresh full verification**

```bash
pnpm typecheck
pnpm test
pnpm --filter @open-press/core test:e2e:reader
pnpm changeset status
git diff --check
```

Expected:

- root typecheck reports all tasks successful;
- root tests report all tasks successful;
- Reader E2E has no failures across desktop/tablet;
- Changesets reports patch bumps for `@open-press/core`, `@open-press/cli`, and `@open-press/create` because they are a fixed group;
- `git diff --check` exits 0.

- [ ] **Step 3: Manually verify the live dev server**

Open `http://127.0.0.1:5175/userstory/preview`, then verify:

1. The floating dock is one compact row and the old toolbar zoom is absent.
2. Minus/plus changes by 10 points.
3. A custom 137% value persists after refresh.
4. Zooming on a middle page preserves the same page-relative location.
5. Workbench right-panel content scrolls above an unmoving, unboxed dock footer.

- [ ] **Step 4: Commit release metadata**

```bash
git add .changeset/calm-readers-stay.md
git commit -m "[core] document unified zoom dock patch"
```

- [ ] **Step 5: Review branch state without integrating**

```bash
git status --short --branch
git log --oneline --decorate origin/main..HEAD
```

Expected: clean feature branch containing the spec, foundation, custom model, Reader dock, Workbench footer, cleanup, and changeset commits. Do not merge, push, open a PR, or release without the user's next instruction.
