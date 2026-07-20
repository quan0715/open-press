# Animated Page Zoom Value Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve zoom-dock legibility and give zoom changes a compact vertical odometer transition.

**Architecture:** Keep `PageZoomDock` controlled and reuse the existing `motion` dependency. Track the previously rendered scale in a ref to determine transition direction, animate only the keyed value label with `AnimatePresence`, and retain the current button dimensions and scale behavior.

**Tech Stack:** React 19, TypeScript, Motion for React, Tailwind CSS v4, Playwright.

## Global Constraints

- Minus and plus icons render at exactly 18px.
- The zoom value renders at exactly 13px.
- Increasing zoom brings the next label upward; decreasing zoom brings it downward.
- The label transition lasts 180ms and does not animate the chevron or dock geometry.
- Equal-scale mode changes crossfade without vertical travel.
- Reduced-motion users receive an immediate, non-translating update.
- No new dependency and no scale-model, persistence, or anchoring change.

---

### Task 1: Lock the enlarged controls and transition direction

**Files:**
- Modify: `packages/core/tests/e2e/reader-public-toolbar.spec.ts`
- Modify: `packages/core/tests/e2e/reader-workbench-toolbar.spec.ts`
- Modify: `packages/core/src/openpress/workbench/actions/PageZoomDock.tsx`

**Interfaces:**
- Consumes: `scale`, `scaleMode`, and `scaleLabel` from `PageZoomDockProps`.
- Produces: `data-openpress-zoom-value-text` with `data-openpress-zoom-motion="up|down|still"` for observable transition direction.

- [ ] **Step 1: Write failing Playwright assertions**

Add a shared local helper to each toolbar spec that asserts:

```ts
const value = page.locator("[data-openpress-zoom-value]");
await expect(value).toHaveCSS("font-size", "13px");
await expect(page.locator("[data-openpress-zoom-decrease] svg")).toHaveCSS("width", "18px");
await expect(page.locator("[data-openpress-zoom-increase] svg")).toHaveCSS("width", "18px");
```

In the existing zoom interaction test, click increase and decrease and assert the keyed label direction:

```ts
await page.locator("[data-openpress-zoom-increase]").click();
await expect(page.locator("[data-openpress-zoom-value-text]")).toHaveAttribute(
  "data-openpress-zoom-motion",
  "up",
);
await page.locator("[data-openpress-zoom-decrease]").click();
await expect(page.locator("[data-openpress-zoom-value-text]")).toHaveAttribute(
  "data-openpress-zoom-motion",
  "down",
);
```

- [ ] **Step 2: Run the focused desktop specs and confirm RED**

Run:

```bash
pnpm --dir packages/core exec playwright test --config playwright.reader.config.ts \
  tests/e2e/reader-public-toolbar.spec.ts tests/e2e/reader-workbench-toolbar.spec.ts --project=desktop
```

Expected: font-size, icon-size, or missing `data-openpress-zoom-value-text` assertions fail because the refinement is not implemented.

- [ ] **Step 3: Implement the minimal keyed value transition**

In `PageZoomDock.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const previousScaleRef = useRef(scale);
const motionDirection = scale > previousScaleRef.current ? "up" : scale < previousScaleRef.current ? "down" : "still";
const shouldReduceMotion = useReducedMotion();

useEffect(() => {
  previousScaleRef.current = scale;
}, [scale]);
```

Set icon descendants to 18px and the value button to 13px. Replace the plain label span with an overflow-clipped `AnimatePresence` stack keyed by `${scaleMode}:${scaleLabel}`. Use an 8px signed offset for enter/exit, 180ms duration, and zero offset/duration when `shouldReduceMotion` is true. Keep the chevron outside the animated stack.

- [ ] **Step 4: Run focused verification for GREEN**

Run:

```bash
pnpm --dir packages/core exec playwright test --config playwright.reader.config.ts \
  tests/e2e/reader-public-toolbar.spec.ts tests/e2e/reader-workbench-toolbar.spec.ts
pnpm --filter @open-press/core typecheck
git diff --check
```

Expected: Reader and Workbench specs pass on desktop/tablet, core typecheck exits 0, and the diff has no whitespace errors.

- [ ] **Step 5: Verify the live preview and commit**

Reload `http://127.0.0.1:5175/userstory/preview`, confirm the controls remain flat, inspect both transition directions, and confirm no browser console errors. Then commit:

```bash
git add packages/core/src/openpress/workbench/actions/PageZoomDock.tsx \
  packages/core/tests/e2e/reader-public-toolbar.spec.ts \
  packages/core/tests/e2e/reader-workbench-toolbar.spec.ts
git commit -m "[core] animate zoom dock value changes"
```
