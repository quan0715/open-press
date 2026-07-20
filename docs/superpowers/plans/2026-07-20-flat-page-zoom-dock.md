# Flat Page Zoom Dock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove persistent and interactive color fills from the shared zoom dock controls so visual hierarchy is communicated only by text and icon color.

**Architecture:** Keep the existing controlled `PageZoomDock` API and all scale behavior unchanged. Adjust only component-local Tailwind classes, preserving the Public Reader's single outer floating surface and the Workbench footer's top divider, then lock the flat treatment with browser-level computed-style assertions.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Playwright.

## Global Constraints

- Minus, percentage, chevron, and plus remain transparent in default, hover, active, and expanded states.
- Workbench footer inherits the right-panel background and keeps only its top divider.
- Public Reader retains one outer floating surface; its inner controls remain transparent.
- Interaction, persistence, zoom stepping, and viewport anchoring must not change.
- Focus-visible accessibility rings remain available.
- No release is performed from this branch.

---

### Task 1: Flatten the shared zoom dock treatment

**Files:**
- Modify: `packages/core/tests/e2e/reader-public-toolbar.spec.ts`
- Modify: `packages/core/tests/e2e/reader-workbench-toolbar.spec.ts`
- Modify: `packages/core/src/openpress/workbench/actions/PageZoomDock.tsx`

**Interfaces:**
- Consumes: existing `PageZoomDockProps` and `data-openpress-*` selectors.
- Produces: the same zoom behavior with transparent inner control backgrounds on Reader and Workbench placements.

- [ ] **Step 1: Add failing computed-style assertions**

Add this helper to both zoom dock E2E files:

```ts
async function expectFlatZoomControls(page: Page) {
  const controls = [
    page.locator("[data-openpress-zoom-decrease]"),
    page.locator("[data-openpress-zoom-value]"),
    page.locator("[data-openpress-zoom-increase]"),
  ];
  for (const control of controls) {
    await expect(control).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await control.hover();
    await expect(control).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  }
}
```

Call it from the Public Reader floating dock test and Workbench panel-footer test. In the Workbench test, also assert:

```ts
await expect(dock).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
```

- [ ] **Step 2: Run focused E2E and confirm RED**

Run:

```bash
pnpm --dir packages/core exec playwright test --config playwright.reader.config.ts \
  tests/e2e/reader-public-toolbar.spec.ts tests/e2e/reader-workbench-toolbar.spec.ts --project=desktop
```

Expected: the new hover-background and Workbench footer-background assertions fail against the current filled treatment.

- [ ] **Step 3: Apply the flat component classes**

In `PageZoomDock.tsx`, remove the explicit Workbench footer background and make the button classes override ghost fills in every persistent interaction state:

```ts
const PANEL_ZOOM_DOCK_CLASS = [
  "grid grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-1",
  "border-t border-[var(--op-workspace-border-muted)] px-3 py-2",
].join(" ");
const ZOOM_DOCK_ICON_BUTTON_CLASS = [
  "h-8 w-8 rounded-[var(--op-workspace-radius-sm)] p-0",
  "!bg-transparent text-[var(--op-workspace-text-muted)]",
  "hover:!bg-transparent hover:text-[var(--op-workspace-text)] active:!bg-transparent",
  "[&[aria-expanded=true]]:!bg-transparent",
].join(" ");
const ZOOM_DOCK_VALUE_CLASS = [
  "h-8 min-w-0 justify-center gap-1.5 rounded-[var(--op-workspace-radius-sm)] px-2",
  "!bg-transparent text-[11px] font-[650] text-[var(--op-workspace-text-soft)]",
  "[font-family:var(--openpress-font-mono)]",
  "hover:!bg-transparent hover:text-[var(--op-workspace-text)] active:!bg-transparent",
  "[&[aria-expanded=true]]:!bg-transparent [&[aria-expanded=true]]:!text-[var(--op-workspace-accent)]",
].join(" ");
```

Do not change the floating outer surface, menu, input, component props, or event handlers.

- [ ] **Step 4: Run E2E, typecheck, and visual verification for GREEN**

Run:

```bash
pnpm --dir packages/core exec playwright test --config playwright.reader.config.ts \
  tests/e2e/reader-public-toolbar.spec.ts tests/e2e/reader-workbench-toolbar.spec.ts
pnpm --filter @open-press/core typecheck
git diff --check
```

Expected: all focused Reader/Workbench tests pass across desktop/tablet, core typecheck exits 0, and the diff has no whitespace errors. Reload `http://127.0.0.1:5175/userstory/preview` and verify the panel footer reads as one native row with color-only control states.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/openpress/workbench/actions/PageZoomDock.tsx \
  packages/core/tests/e2e/reader-public-toolbar.spec.ts \
  packages/core/tests/e2e/reader-workbench-toolbar.spec.ts
git commit -m "[core] flatten zoom dock controls"
```
