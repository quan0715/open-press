# Oversized Page Horizontal Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every part of a page reachable when fixed zoom makes it wider than the Reader stage, while preserving centered pages at fit-width and smaller scales.

**Architecture:** Keep the existing single `ReaderStage` scroll container and scaled page wrappers. Replace unsafe centered grid alignment with CSS `safe center`, expose a thin Workbench scrollbar, and allow horizontal touch panning in Public Reader; no scale model or anchor-restoration logic changes.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Playwright.

## Global Constraints

- A scaled page that fits inside the stage remains centered.
- A scaled page wider than the stage aligns to the inline start and contributes its full width to horizontal overflow.
- Workbench uses one thin, neutral scrollbar and no nested scroll container.
- Public Reader supports horizontal and vertical touch panning together with pinch zoom.
- Existing page-relative anchor capture and restoration remain unchanged.
- No release is performed from this branch.

---

### Task 1: Make oversized page edges reachable

**Files:**
- Modify: `packages/core/tests/e2e/reader-public-toolbar.spec.ts`
- Modify: `packages/core/tests/e2e/reader-workbench-toolbar.spec.ts`
- Modify: `packages/core/src/openpress/reader/publicViewerClasses.ts`
- Modify: `packages/core/src/openpress/workbench/document/components/ReaderStage.tsx`

**Interfaces:**
- Consumes: existing `.reader-stage`, `.reader-pages`, `#page-01`, and `data-openpress-zoom-*` browser contracts.
- Produces: a horizontally scrollable stage whose left and right scaled-page edges are both reachable.

- [x] **Step 1: Add failing geometry assertions**

Add this helper to both toolbar specs:

```ts
async function expectOversizedPageReachable(page: Page) {
  const stage = page.locator(".reader-stage");
  await expect.poll(() => stage.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);

  const edges = await stage.evaluate((element) => {
    const target = element.querySelector<HTMLElement>("#page-01");
    if (!target) throw new Error("Expected first rendered page");
    element.scrollLeft = 0;
    const stageAtStart = element.getBoundingClientRect();
    const pageAtStart = target.getBoundingClientRect();
    const leftReachable = pageAtStart.left >= stageAtStart.left - 1;

    element.scrollLeft = element.scrollWidth - element.clientWidth;
    const stageAtEnd = element.getBoundingClientRect();
    const pageAtEnd = target.getBoundingClientRect();
    return {
      leftReachable,
      rightReachable: pageAtEnd.right <= stageAtEnd.right + 1,
    };
  });

  expect(edges).toEqual({ leftReachable: true, rightReachable: true });
}
```

In Public Reader, select `scale-200`, call the helper, and assert:

```ts
await expect(stage).toHaveCSS("touch-action", "manipulation");
```

In Workbench desktop, select `scale-200`, call the helper, and assert:

```ts
await expect(stage).toHaveCSS("scrollbar-width", "thin");
```

Return each surface to `fit-width`, then call this helper:

```ts
async function expectPageCenteredWithoutHorizontalOverflow(page: Page) {
  const result = await page.locator(".reader-stage").evaluate((element) => {
    const target = element.querySelector<HTMLElement>("#page-01");
    if (!target) throw new Error("Expected first rendered page");
    const stageRect = element.getBoundingClientRect();
    const pageRect = target.getBoundingClientRect();
    return {
      overflow: element.scrollWidth - element.clientWidth,
      gapDifference: Math.abs(
        (pageRect.left - stageRect.left) - (stageRect.right - pageRect.right),
      ),
    };
  });
  expect(result.overflow).toBeLessThanOrEqual(1);
  expect(result.gapDifference).toBeLessThanOrEqual(1);
}
```

- [x] **Step 2: Run focused E2E and confirm RED**

Run:

```bash
pnpm --dir packages/core exec playwright test --config playwright.reader.config.ts \
  tests/e2e/reader-public-toolbar.spec.ts tests/e2e/reader-workbench-toolbar.spec.ts --project=desktop
```

Expected: oversized left-edge reachability fails because ordinary center alignment places half the overflow at a negative coordinate. Workbench also reports `scrollbar-width: none`, and Public Reader reports `touch-action: pan-y pinch-zoom`.

- [x] **Step 3: Apply safe alignment and scrolling affordances**

In `publicViewerClasses.ts`, replace the grid's forced center class and horizontal-touch restriction:

```ts
"reader-pages openpress-public-page !grid !items-start ![justify-content:safe_center] !gap-[var(--openpress-page-gap)] !px-4 !pb-24 !pt-[30px]",
"overscroll-contain scroll-smooth [-webkit-overflow-scrolling:touch] touch-pan-x touch-pan-y touch-pinch-zoom",
```

In `ReaderStage.tsx`, remove hidden-scrollbar classes and use the existing Public Reader scrollbar treatment:

```ts
"[scrollbar-width:thin] [scrollbar-color:rgb(255_255_255_/_0.18)_transparent]",
"[&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent",
"[&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-[rgb(255_255_255_/_0.15)] [&::-webkit-scrollbar-thumb]:bg-clip-padding",
"[&::-webkit-scrollbar-thumb:hover]:bg-[rgb(255_255_255_/_0.28)] [&::-webkit-scrollbar-corner]:bg-transparent",
```

Do not add another scroll wrapper or change `usePageViewportScale`.

- [x] **Step 4: Run focused verification for GREEN**

Run:

```bash
pnpm --dir packages/core exec playwright test --config playwright.reader.config.ts \
  tests/e2e/reader-public-toolbar.spec.ts tests/e2e/reader-workbench-toolbar.spec.ts
pnpm --filter @open-press/core typecheck
git diff --check
```

Expected: Reader and Workbench toolbar specs pass on desktop/tablet, typecheck exits 0, and the diff has no whitespace errors.

- [x] **Step 5: Verify the live Workbench and commit**

Reload `http://127.0.0.1:5175/userstory/preview`, select 200%, verify the page begins at the stage's left padding and scrolls to the right edge, then return to fit width and verify centering. Confirm no console errors and commit:

```bash
git add packages/core/src/openpress/reader/publicViewerClasses.ts \
  packages/core/src/openpress/workbench/document/components/ReaderStage.tsx \
  packages/core/tests/e2e/reader-public-toolbar.spec.ts \
  packages/core/tests/e2e/reader-workbench-toolbar.spec.ts \
  docs/superpowers/plans/2026-07-20-oversized-page-horizontal-scroll.md
git commit -m "[core] allow oversized page scrolling"
```
