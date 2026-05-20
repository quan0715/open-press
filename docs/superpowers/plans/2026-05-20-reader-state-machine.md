# Reader State Machine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move open-press reader page selection, bookmark jumps, route sync, resize reanchoring, and observer updates into a React-owned reducer so iPad touch interactions stay stable and testable.

**Architecture:** Keep the `#page-XX` hash as a persistence and sync surface, while React remains the owner of the current reader state. Add a pure reducer that arbitrates user intent, route changes, layout reanchors, and scroll observer updates, then let `useQDocReaderRuntime` execute DOM side effects from explicit reducer effect requests. `QDocBookmarks` remains pure UI: it emits a bookmark navigation intent and does not inspect or mutate DOM state.

**Tech Stack:** React hooks, TypeScript, open-press React renderer, Node `node:test`, Cloudflare Pages via Wrangler.

---

## Current Baseline

- `src/qdoc/readerRuntime.ts` already removed direct `touchstart` and `touchend` page-turn listeners.
- `src/qdoc/pageRoute.ts` already serializes reader routes as `#page-01`, `#page-02`, and validates hashes against `pageCount`.
- The current production deployment is `https://data-structure-note.pages.dev/`.
- Existing verification for the deployed route fix has passed: `node --test tests/framework-reader-runtime.test.mjs`, `npm run typecheck`, `npm run qdoc:render`, `npm run qdoc:validate`, and `npm test`.

## File Structure

- Create `src/qdoc/readerState.ts`
  - Owns pure reader state, action types, reducer transitions, page clamping, page labels, and effect request shapes.
  - Has no DOM access and no React imports.
- Modify `src/qdoc/readerRuntime.ts`
  - Replaces scattered `useState` page/panel transitions with `useReducer(readerReducer, initializer)`.
  - Keeps DOM refs, timers, `IntersectionObserver`, `window` listeners, and `scrollIntoView` inside effects.
  - Executes reducer-emitted `scrollRequest` and `routeRequest` effects.
- Modify `src/qdoc/workbenchPanels.tsx`
  - Keeps bookmarks as pure buttons.
  - Emits `{ behavior: "smooth", source: "bookmark" }` so reader state can distinguish bookmark intent from keyboard or route intent.
- Modify `src/qdoc/publicPage.tsx` and `src/qdoc/workbench.tsx`
  - Preserve the current `selectPublicPage` and `selectWorkspacePage` drawer behavior.
  - Pass bookmark source options through to `reader.setPage`.
- Create `tests/framework-reader-state.test.mjs`
  - Unit-tests reducer behavior without DOM.
- Modify `tests/framework-reader-runtime.test.mjs`
  - Keeps route helper tests and the no-touch-listener guard.
- Does not test bookmark component behavior; that belongs in Vitest/React Testing Library.
- Create `tests/qdoc-bookmarks.react.test.tsx`
  - Renders `QDocBookmarks`, clicks chapter/section buttons, and verifies bookmark navigation intent.

## Task 1: Lock The Reducer Contract With Failing Tests

**Files:**
- Create: `tests/framework-reader-state.test.mjs`

- [ ] **Step 1: Add reducer contract tests**

Create `tests/framework-reader-state.test.mjs` with this complete content:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ts from "typescript";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function importTsModule(relPath) {
  const sourcePath = path.join(ROOT, relPath);
  const source = await fs.readFile(sourcePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  });

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "qdoc-reader-state-test-"));
  const tmpFile = path.join(tmpDir, `${path.basename(relPath, ".ts")}.mjs`);
  await fs.writeFile(tmpFile, output.outputText, "utf8");
  return import(pathToFileURL(tmpFile).href);
}

test("reader state treats bookmark navigation as one React-owned transition", async () => {
  const { createInitialReaderState, readerReducer } = await importTsModule("src/qdoc/readerState.ts");
  const initial = createInitialReaderState({ pageCount: 58, rightPanelOpen: true });

  const next = readerReducer(initial, {
    type: "navigate",
    pageIndex: 3,
    source: "bookmark",
    behavior: "smooth",
  });

  assert.equal(next.currentPageIndex, 3);
  assert.equal(next.programmaticScrollTarget, 3);
  assert.deepEqual(next.scrollRequest, {
    id: 1,
    pageIndex: 3,
    behavior: "smooth",
    source: "bookmark",
  });
  assert.deepEqual(next.routeRequest, {
    id: 1,
    pageIndex: 3,
    mode: "replace",
    source: "bookmark",
  });
});

test("route navigation scrolls once without writing the same route back", async () => {
  const { createInitialReaderState, readerReducer } = await importTsModule("src/qdoc/readerState.ts");
  const initial = createInitialReaderState({ pageCount: 58, rightPanelOpen: true });

  const next = readerReducer(initial, {
    type: "routeChanged",
    pageIndex: 4,
  });

  assert.equal(next.currentPageIndex, 4);
  assert.equal(next.routeRequest, null);
  assert.deepEqual(next.scrollRequest, {
    id: 1,
    pageIndex: 4,
    behavior: "auto",
    source: "route",
  });
});

test("observer updates cannot override an active programmatic scroll", async () => {
  const { createInitialReaderState, readerReducer } = await importTsModule("src/qdoc/readerState.ts");
  const initial = createInitialReaderState({ pageCount: 58, rightPanelOpen: true });
  const navigating = readerReducer(initial, {
    type: "navigate",
    pageIndex: 5,
    source: "keyboard",
    behavior: "smooth",
  });

  const ignored = readerReducer(navigating, {
    type: "intersectionSettled",
    pageIndex: 1,
  });
  assert.equal(ignored.currentPageIndex, 5);
  assert.equal(ignored.routeRequest.pageIndex, 5);

  const released = readerReducer(navigating, { type: "programmaticScrollReleased" });
  const observed = readerReducer(released, {
    type: "intersectionSettled",
    pageIndex: 7,
  });

  assert.equal(observed.currentPageIndex, 7);
  assert.equal(observed.scrollRequest, null);
  assert.deepEqual(observed.routeRequest, {
    id: 2,
    pageIndex: 7,
    mode: "replace",
    source: "observer",
  });
});

test("layout reanchor keeps the route-selected page stable without route rewrite", async () => {
  const { createInitialReaderState, readerReducer } = await importTsModule("src/qdoc/readerState.ts");
  const initial = createInitialReaderState({ pageCount: 58, rightPanelOpen: true });
  const routed = readerReducer(initial, {
    type: "routeChanged",
    pageIndex: 6,
  });

  const reanchored = readerReducer(routed, {
    type: "layoutReanchor",
    pageIndex: 6,
  });

  assert.equal(reanchored.currentPageIndex, 6);
  assert.equal(reanchored.routeRequest, null);
  assert.deepEqual(reanchored.scrollRequest, {
    id: 2,
    pageIndex: 6,
    behavior: "auto",
    source: "layout",
  });
});

test("page count changes clamp current reader state", async () => {
  const { createInitialReaderState, readerReducer } = await importTsModule("src/qdoc/readerState.ts");
  const initial = createInitialReaderState({ pageCount: 10, rightPanelOpen: true });
  const atLastPage = readerReducer(initial, {
    type: "navigate",
    pageIndex: 9,
    source: "api",
    behavior: "auto",
  });

  const clamped = readerReducer(atLastPage, {
    type: "pageCountChanged",
    pageCount: 4,
  });

  assert.equal(clamped.pageCount, 4);
  assert.equal(clamped.currentPageIndex, 3);
  assert.equal(clamped.programmaticScrollTarget, null);
  assert.equal(clamped.scrollRequest, null);
  assert.equal(clamped.routeRequest, null);
});
```

- [ ] **Step 2: Run the new test and confirm it fails for the right reason**

Run:

```bash
node --test tests/framework-reader-state.test.mjs
```

Expected result:

```text
not ok
Error: ENOENT: no such file or directory
```

## Task 2: Add The Pure Reader Reducer

**Files:**
- Create: `src/qdoc/readerState.ts`
- Test: `tests/framework-reader-state.test.mjs`

- [ ] **Step 1: Create the reducer implementation**

Create `src/qdoc/readerState.ts` with this complete content:

```ts
export type ReaderNavigationSource = "api" | "bookmark" | "keyboard" | "route" | "observer" | "layout";

export interface ReaderScrollRequest {
  id: number;
  pageIndex: number;
  behavior: ScrollBehavior;
  source: ReaderNavigationSource;
}

export interface ReaderRouteRequest {
  id: number;
  pageIndex: number;
  mode: "replace";
  source: ReaderNavigationSource;
}

export interface ReaderState {
  pageCount: number;
  currentPageIndex: number;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  programmaticScrollTarget: number | null;
  scrollRequest: ReaderScrollRequest | null;
  routeRequest: ReaderRouteRequest | null;
  requestId: number;
}

export type ReaderAction =
  | { type: "pageCountChanged"; pageCount: number }
  | {
      type: "navigate";
      pageIndex: number;
      source: "api" | "bookmark" | "keyboard";
      behavior?: ScrollBehavior;
      updateRoute?: boolean;
      scroll?: boolean;
    }
  | { type: "routeChanged"; pageIndex: number }
  | { type: "layoutReanchor"; pageIndex?: number }
  | { type: "intersectionSettled"; pageIndex: number }
  | { type: "programmaticScrollReleased" }
  | { type: "setLeftPanelOpen"; open: boolean }
  | { type: "toggleLeftPanel" }
  | { type: "setRightPanelOpen"; open: boolean }
  | { type: "toggleRightPanel" };

export function createInitialReaderState({
  pageCount,
  rightPanelOpen,
  currentPageIndex = 0,
  leftPanelOpen = true,
}: {
  pageCount: number;
  rightPanelOpen: boolean;
  currentPageIndex?: number;
  leftPanelOpen?: boolean;
}): ReaderState {
  const normalizedPageCount = normalizeReaderPageCount(pageCount);
  return {
    pageCount: normalizedPageCount,
    currentPageIndex: clampReaderPageIndex(currentPageIndex, normalizedPageCount),
    leftPanelOpen,
    rightPanelOpen,
    programmaticScrollTarget: null,
    scrollRequest: null,
    routeRequest: null,
    requestId: 0,
  };
}

export function readerReducer(state: ReaderState, action: ReaderAction): ReaderState {
  switch (action.type) {
    case "pageCountChanged": {
      const pageCount = normalizeReaderPageCount(action.pageCount);
      return {
        ...state,
        pageCount,
        currentPageIndex: clampReaderPageIndex(state.currentPageIndex, pageCount),
        programmaticScrollTarget: null,
        scrollRequest: null,
        routeRequest: null,
      };
    }
    case "navigate":
      return transitionToPage(state, {
        pageIndex: action.pageIndex,
        source: action.source,
        behavior: action.behavior ?? "smooth",
        updateRoute: action.updateRoute !== false,
        scroll: action.scroll !== false,
      });
    case "routeChanged":
      return transitionToPage(state, {
        pageIndex: action.pageIndex,
        source: "route",
        behavior: "auto",
        updateRoute: false,
        scroll: true,
      });
    case "layoutReanchor":
      return transitionToPage(state, {
        pageIndex: action.pageIndex ?? state.currentPageIndex,
        source: "layout",
        behavior: "auto",
        updateRoute: false,
        scroll: true,
      });
    case "intersectionSettled":
      if (state.programmaticScrollTarget !== null) return state;
      return transitionToPage(state, {
        pageIndex: action.pageIndex,
        source: "observer",
        behavior: "auto",
        updateRoute: true,
        scroll: false,
      });
    case "programmaticScrollReleased":
      if (state.programmaticScrollTarget === null) return state;
      return {
        ...state,
        programmaticScrollTarget: null,
      };
    case "setLeftPanelOpen":
      return {
        ...state,
        leftPanelOpen: action.open,
      };
    case "toggleLeftPanel":
      return {
        ...state,
        leftPanelOpen: !state.leftPanelOpen,
      };
    case "setRightPanelOpen":
      return {
        ...state,
        rightPanelOpen: action.open,
      };
    case "toggleRightPanel":
      return {
        ...state,
        rightPanelOpen: !state.rightPanelOpen,
      };
    default:
      return state;
  }
}

export function clampReaderPageIndex(value: number, pageCount: number) {
  const normalizedPageCount = normalizeReaderPageCount(pageCount);
  if (normalizedPageCount <= 0) return 0;
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.trunc(value), 0), normalizedPageCount - 1);
}

export function formatReaderPageNumber(value: number) {
  return String(Math.max(Math.trunc(value), 1)).padStart(2, "0");
}

function normalizeReaderPageCount(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(Math.trunc(value), 0);
}

function transitionToPage(
  state: ReaderState,
  {
    pageIndex,
    source,
    behavior,
    updateRoute,
    scroll,
  }: {
    pageIndex: number;
    source: ReaderNavigationSource;
    behavior: ScrollBehavior;
    updateRoute: boolean;
    scroll: boolean;
  },
): ReaderState {
  const nextPageIndex = clampReaderPageIndex(pageIndex, state.pageCount);
  const requestId = state.requestId + 1;
  return {
    ...state,
    currentPageIndex: nextPageIndex,
    requestId,
    programmaticScrollTarget: scroll ? nextPageIndex : state.programmaticScrollTarget,
    scrollRequest: scroll
      ? {
          id: requestId,
          pageIndex: nextPageIndex,
          behavior,
          source,
        }
      : null,
    routeRequest: updateRoute
      ? {
          id: requestId,
          pageIndex: nextPageIndex,
          mode: "replace",
          source,
        }
      : null,
  };
}
```

- [ ] **Step 2: Run reducer tests**

Run:

```bash
node --test tests/framework-reader-state.test.mjs
```

Expected result:

```text
# tests 5
# pass 5
# fail 0
```

## Task 3: Route Reader Runtime Through The Reducer

**Files:**
- Modify: `src/qdoc/readerRuntime.ts`
- Test: `tests/framework-reader-state.test.mjs`
- Test: `tests/framework-reader-runtime.test.mjs`

- [ ] **Step 1: Replace imports and exported options**

In `src/qdoc/readerRuntime.ts`, replace the current React import and local `SetPageOptions` block with:

```ts
import { useCallback, useEffect, useReducer, useRef, useState, type RefCallback } from "react";
import { pageIndexFromHash, replacePageRoute } from "./pageRoute";
import { createReaderPageRegistry } from "./readerPageRegistry";
import {
  createInitialReaderState,
  formatReaderPageNumber,
  readerReducer,
  type ReaderNavigationSource,
  type ReaderState,
} from "./readerState";

export interface SetPageOptions {
  behavior?: ScrollBehavior;
  updateHash?: boolean;
  scroll?: boolean;
  source?: Extract<ReaderNavigationSource, "api" | "bookmark" | "keyboard">;
}
```

- [ ] **Step 2: Replace local page and panel state with `useReducer`**

Inside `useQDocReaderRuntime`, replace the current `useState` declarations for `currentPageIndex`, `leftPanelOpen`, and `rightPanelOpen` with:

```ts
  const initialRightPanelOpen = typeof window === "undefined" ? true : window.innerWidth >= rightPanelBreakpoint;
  const [readerState, dispatch] = useReducer(
    readerReducer,
    undefined,
    () => createInitialReaderState({ pageCount, rightPanelOpen: initialRightPanelOpen }),
  );
  const readerStateRef = useRef<ReaderState>(readerState);
```

Keep `stageRef`, `pageRegistrationVersion`, `pageRegistry`, `programmaticScrollReleaseTimer`, and `responsiveLayoutFrame` as refs. Remove `currentPageIndexRef`, `programmaticScrollTarget`, `setCurrentPageIndex`, `setLeftPanelOpen`, and `setRightPanelOpen`.

- [ ] **Step 3: Keep a fresh state ref for DOM callbacks**

Add this effect after `pageRegistry` initialization:

```ts
  useEffect(() => {
    readerStateRef.current = readerState;
  }, [readerState]);
```

- [ ] **Step 4: Replace direct route and scroll helpers with reducer effects**

Replace `releaseProgrammaticScrollLock`, `startProgrammaticScrollLock`, `setTrackedCurrentPageIndex`, `scrollPageIntoView`, and `setPage` with:

```ts
  const clearProgrammaticScrollTimer = useCallback(() => {
    if (programmaticScrollReleaseTimer.current !== null) {
      clearTimeout(programmaticScrollReleaseTimer.current);
      programmaticScrollReleaseTimer.current = null;
    }
  }, []);

  const releaseProgrammaticScrollLock = useCallback(() => {
    clearProgrammaticScrollTimer();
    dispatch({ type: "programmaticScrollReleased" });
  }, [clearProgrammaticScrollTimer]);

  const setPage = useCallback((pageIndex: number, options: SetPageOptions = {}) => {
    dispatch({
      type: "navigate",
      pageIndex,
      source: options.source ?? "api",
      behavior: options.behavior ?? "smooth",
      updateRoute: options.updateHash !== false,
      scroll: options.scroll !== false,
    });
  }, []);
```

- [ ] **Step 5: Replace unmount cleanup**

Replace the cleanup effect with:

```ts
  useEffect(() => {
    return () => {
      clearProgrammaticScrollTimer();
      if (responsiveLayoutFrame.current !== null) {
        window.cancelAnimationFrame(responsiveLayoutFrame.current);
        responsiveLayoutFrame.current = null;
      }
    };
  }, [clearProgrammaticScrollTimer]);
```

- [ ] **Step 6: Add side-effect executors for reducer requests**

Add these effects after `setPage`:

```ts
  useEffect(() => {
    const request = readerState.routeRequest;
    if (!request) return;
    replacePageRoute(request.pageIndex);
  }, [readerState.routeRequest]);

  useEffect(() => {
    const request = readerState.scrollRequest;
    if (!request) return;

    clearProgrammaticScrollTimer();
    pageRegistry.current?.refs[request.pageIndex]?.scrollIntoView({
      behavior: request.behavior,
      block: "start",
    });
    programmaticScrollReleaseTimer.current = setTimeout(
      () => dispatch({ type: "programmaticScrollReleased" }),
      request.behavior === "auto" ? 120 : 1800,
    );
  }, [clearProgrammaticScrollTimer, pageRegistrationVersion, readerState.scrollRequest]);
```

- [ ] **Step 7: Replace page count trimming effect**

Replace the existing page count effect with:

```ts
  useEffect(() => {
    pageRegistry.current?.trim(pageCount);
    dispatch({ type: "pageCountChanged", pageCount });
  }, [pageCount]);
```

- [ ] **Step 8: Replace responsive layout sync**

Replace the existing resize and `visualViewport.resize` effect with:

```ts
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const keepCurrentPageAnchored = () => {
      if (responsiveLayoutFrame.current !== null) {
        window.cancelAnimationFrame(responsiveLayoutFrame.current);
      }
      responsiveLayoutFrame.current = window.requestAnimationFrame(() => {
        responsiveLayoutFrame.current = null;
        const { pageCount: latestPageCount, currentPageIndex } = readerStateRef.current;
        const routeIndex = pageIndexFromHash(window.location.hash, latestPageCount);
        dispatch({
          type: "layoutReanchor",
          pageIndex: routeIndex ?? currentPageIndex,
        });
      });
    };

    const syncResponsivePanelState = () => {
      dispatch({
        type: "setRightPanelOpen",
        open: window.innerWidth >= rightPanelBreakpoint,
      });
      keepCurrentPageAnchored();
    };

    syncResponsivePanelState();
    window.addEventListener("resize", syncResponsivePanelState);
    window.visualViewport?.addEventListener("resize", syncResponsivePanelState);
    return () => {
      window.removeEventListener("resize", syncResponsivePanelState);
      window.visualViewport?.removeEventListener("resize", syncResponsivePanelState);
    };
  }, [rightPanelBreakpoint]);
```

- [ ] **Step 9: Replace route sync effect**

Replace the `hashchange` and `popstate` effect with:

```ts
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncPageFromRoute = () => {
      const pageIndex = pageIndexFromHash(window.location.hash, readerStateRef.current.pageCount);
      if (pageIndex === null) return;
      window.requestAnimationFrame(() => {
        dispatch({ type: "routeChanged", pageIndex });
      });
    };

    syncPageFromRoute();
    window.addEventListener("hashchange", syncPageFromRoute);
    window.addEventListener("popstate", syncPageFromRoute);
    return () => {
      window.removeEventListener("hashchange", syncPageFromRoute);
      window.removeEventListener("popstate", syncPageFromRoute);
    };
  }, []);
```

- [ ] **Step 10: Route observer and keyboard updates through actions**

In the `IntersectionObserver` debounce block, replace the programmatic target check and page update with:

```ts
          if (readerStateRef.current.programmaticScrollTarget !== null) return;
          if (bestEl && bestRatio > 0) {
            const index = bestEl.getAttribute("data-qdoc-page-index");
            if (index !== null) {
              dispatch({
                type: "intersectionSettled",
                pageIndex: Number.parseInt(index, 10),
              });
            }
          }
```

Replace `nextPage` and `prevPage` with:

```ts
  const nextPage = useCallback(() => {
    dispatch({
      type: "navigate",
      pageIndex: readerStateRef.current.currentPageIndex + 1,
      source: "keyboard",
      behavior: "smooth",
    });
  }, []);

  const prevPage = useCallback(() => {
    dispatch({
      type: "navigate",
      pageIndex: readerStateRef.current.currentPageIndex - 1,
      source: "keyboard",
      behavior: "smooth",
    });
  }, []);
```

Keep the existing `Home` and `End` handlers calling `setPage(0, { source: "keyboard" })` and `setPage(pageCount - 1, { source: "keyboard" })`.

- [ ] **Step 11: Return values from reducer state**

Replace the current `progressPercent` and return fields with:

```ts
  const progressPercent =
    readerState.pageCount <= 1 ? 100 : ((readerState.currentPageIndex + 1) / readerState.pageCount) * 100;

  return {
    stageRef,
    currentPageIndex: readerState.currentPageIndex,
    currentPageLabel: formatReaderPageNumber(readerState.currentPageIndex + 1),
    totalPageLabel: formatReaderPageNumber(readerState.pageCount),
    progressPercent,
    leftPanelOpen: readerState.leftPanelOpen,
    rightPanelOpen: readerState.rightPanelOpen,
    registerPage,
    setPage,
    nextPage,
    prevPage,
    toggleLeftPanel: () => dispatch({ type: "toggleLeftPanel" }),
    toggleRightPanel: () => dispatch({ type: "toggleRightPanel" }),
    openLeftPanel: () => dispatch({ type: "setLeftPanelOpen", open: true }),
    openRightPanel: () => dispatch({ type: "setRightPanelOpen", open: true }),
  };
```

Remove local `clampPageIndex` and `formatPageNumber` from the bottom of the file. Keep `isEditableTarget`.

- [ ] **Step 12: Run reducer and runtime tests**

Run:

```bash
node --test tests/framework-reader-state.test.mjs tests/framework-reader-runtime.test.mjs
```

Expected result:

```text
# fail 0
```

## Task 4: Make Bookmark Intent Explicit But Keep The UI Pure

**Files:**
- Modify: `src/qdoc/workbenchPanels.tsx`
- Modify: `src/qdoc/publicPage.tsx`
- Modify: `src/qdoc/workbench.tsx`
- Test: `tests/framework-reader-runtime.test.mjs`

- [ ] **Step 1: Add bookmark select options in `workbenchPanels.tsx`**

In `src/qdoc/workbenchPanels.tsx`, add this type below the imports:

```ts
type QDocBookmarkSelectOptions = {
  behavior?: ScrollBehavior;
  source?: "bookmark";
};
```

Change the `onSelectPage` prop type to:

```ts
  onSelectPage: (pageIndex: number, options?: QDocBookmarkSelectOptions) => void;
```

Change `goToPage` to:

```ts
  const goToPage = (event: ReactMouseEvent<HTMLButtonElement>, pageIndex: number) => {
    event.preventDefault();
    onSelectPage(pageIndex, { behavior: "smooth", source: "bookmark" });
  };
```

- [ ] **Step 2: Pass bookmark options through in public and workbench shells**

In `src/qdoc/publicPage.tsx`, change `selectPublicPage` to:

```ts
  const selectPublicPage = (pageIndex: number, options?: { behavior?: ScrollBehavior; source?: "bookmark" }) => {
    reader.setPage(pageIndex, options);
    if (window.innerWidth < PUBLIC_DRAWER_BREAKPOINT && drawerOpen) reader.toggleRightPanel();
  };
```

In `src/qdoc/workbench.tsx`, change `selectWorkspacePage` to:

```ts
  const selectWorkspacePage = (pageIndex: number, options?: { behavior?: ScrollBehavior; source?: "bookmark" }) => {
    reader.setPage(pageIndex, options);
    if (typeof window !== "undefined" && window.innerWidth < PUBLIC_DRAWER_BREAKPOINT && reader.rightPanelOpen) {
      reader.toggleRightPanel();
    }
  };
```

- [ ] **Step 3: Add a React component test for bookmark intent**

Create `tests/qdoc-bookmarks.react.test.tsx` with a Vitest + React Testing Library test that renders `QDocBookmarks`, clicks one chapter bookmark and one section bookmark, and expects `onSelectPage` to receive `{ behavior: "smooth", source: "bookmark" }`.

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm run test:node
npm run test:react
```

Expected result:

```text
Both commands exit with code 0.
```

## Task 5: Verify Type Safety And Render Pipeline

**Files:**
- Read: `package.json`
- Read: `.deploy/data-structure-note/` after render

- [ ] **Step 1: Run TypeScript validation**

Run:

```bash
npm run typecheck
```

Expected result:

```text
typecheck
```

The command must exit with code `0`.

- [ ] **Step 2: Render the public build**

Run:

```bash
npm run qdoc:render
```

Expected result:

```text
React renderer wrote
```

The command must exit with code `0` and refresh `.deploy/data-structure-note/`.

- [ ] **Step 3: Validate open-press structure**

Run:

```bash
npm run qdoc:validate
```

Expected result:

```text
Validation passed
```

- [ ] **Step 4: Run the full test suite**

Run:

```bash
npm test
```

Expected result:

```text
# fail 0
```

## Task 6: iPad-Focused Behavior Check

**Files:**
- Read: `.deploy/data-structure-note/index.html`
- Read: `.deploy/data-structure-note/assets/*-qdoc.js`

- [ ] **Step 1: Start the local dev server**

Run:

```bash
npm run dev
```

Expected result:

```text
Local:   http://127.0.0.1:5173/
```

If port `5173` is already in use, use the URL printed by Vite.

- [ ] **Step 2: Verify bookmark and route behavior on a touch viewport**

Open the local URL with an iPad-sized viewport and verify these acceptance checks:

```text
Tap an H2 bookmark once: the visible page changes to that H2 page and the hash becomes #page-XX for that page.
Tap an H3 bookmark once: the visible page changes to that H3 page and the hash becomes #page-XX for that page.
Rotate portrait to landscape: the current page and hash stay on the same page.
Scroll inside an embedded chart horizontally: the reader does not jump back to the table of contents.
Tap the page body: the reader does not change pages unless the tap target is an actual control.
```

- [ ] **Step 3: Confirm production bundle contains the reducer path after render**

Run:

```bash
rg -n "intersectionSettled|layoutReanchor|source:\"bookmark\"|source: \"bookmark\"" .deploy/data-structure-note/assets
```

Expected result:

```text
At least one matching line under .deploy/data-structure-note/assets/
```

The output must show the deployed bundle contains reducer action names or the bookmark source string.

## Task 7: Deploy After Explicit Approval

**Files:**
- Read: `document/qdoc.config.mjs`
- Read: `.deploy/data-structure-note/`
- Modify: `memory/cloudflare-deploy.md` only to record the successful deployment ID and URL

- [ ] **Step 1: Confirm deployment target**

Run:

```bash
rg -n "source|projectName" document/qdoc.config.mjs
```

Expected result:

```text
source: ".deploy/data-structure-note"
projectName: "data-structure-note"
```

- [ ] **Step 2: Deploy with the open-press deploy command**

Run after the user asks to deploy:

```bash
npm run qdoc:deploy -- --confirm
```

Expected result:

```text
Deployment complete
https://data-structure-note.pages.dev/
```

- [ ] **Step 3: Use direct Wrangler upload if the open-press wrapper stalls**

Run this command only if the previous deploy command does not complete:

```bash
npx --yes wrangler pages deploy .deploy/data-structure-note --project-name=data-structure-note --commit-dirty=true
```

Expected result:

```text
Successfully uploaded
Deployment complete
https://data-structure-note.pages.dev/
```

- [ ] **Step 4: Record deployment**

Append one entry to `memory/cloudflare-deploy.md`:

```md
## 2026-05-20

- Deployed reader state machine update to Cloudflare Pages project `data-structure-note`.
- Production: https://data-structure-note.pages.dev/
- Verification before deploy: `node --test tests/framework-reader-state.test.mjs tests/framework-reader-runtime.test.mjs`, `npm run typecheck`, `npm run qdoc:render`, `npm run qdoc:validate`, `npm test`.
```

## Final Acceptance Criteria

- Reader page state is owned by a React reducer in `src/qdoc/readerState.ts`.
- Route hash changes feed React state through `routeChanged`; they do not directly manipulate DOM.
- Bookmark clicks feed React state through `navigate` with `source: "bookmark"`.
- `IntersectionObserver` can update the route only when there is no active programmatic scroll.
- Resize and orientation changes dispatch `layoutReanchor` and scroll the current page back into view with `behavior: "auto"`.
- `readerRuntime.ts` still does not bind `touchstart` or `touchend` page-turn listeners.
- Focused tests, typecheck, render, validation, and full tests all pass before deployment.

## Self-Review

- Spec coverage: The plan covers the current iPad bookmark sensitivity, route-backed page persistence, orientation/layout reanchoring, internal chart scroll stability, and React-owned internal state.
- Type consistency: `ReaderNavigationSource`, `SetPageOptions.source`, and bookmark option types line up around `"api" | "bookmark" | "keyboard"` for explicit user intent and `"route" | "observer" | "layout"` for internal state transitions.
- Verification coverage: Reducer behavior is tested without DOM, source guards protect against touch page-turn regression, and the render/deploy checks verify the actual public bundle.
