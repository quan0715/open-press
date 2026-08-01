# Website Product Screenshots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a multilingual, keyboard-accessible homepage showcase that switches between real OpenPress document-editor and Agent-proposal screenshots.

**Architecture:** A focused Astro component owns localized copy, screenshot markup, and progressive enhancement. A small framework-free module owns tab state and keyboard navigation so behavior is unit-testable. Both screenshots are captured from the real local dogfood Workbench and committed as static website assets.

**Tech Stack:** Astro 5, Tailwind CSS 3, browser DOM APIs, Node test runner, Playwright, `cwebp`.

## Global Constraints

- Keep the existing hero artwork; insert the showcase after “How it works” and before the Press Tree explanation.
- Use one shared English screenshot set for `zh-tw`, `en`, and `ja`; localize surrounding copy and alt text.
- Use real Workbench output with no fake browser chrome, mock UI, private paths, credentials, or unrelated windows.
- Assets are exactly 1600 × 1000 WebP files with consistent viewport, crop, theme, and document.
- Default to Document editor; inactive panels use `hidden`; without JavaScript the default panel remains usable.
- Support click, Enter/Space, Left/Right Arrow, Home, and End with visible focus and reduced-motion handling.
- Do not change Workbench behavior solely for the marketing capture.

## File Map

- Create `apps/web/public/product/workbench-document-editor.webp` — real editor screenshot.
- Create `apps/web/public/product/workbench-agent-proposal.webp` — real Change Preview screenshot.
- Create `apps/web/src/components/home/productWorkbenchTabs.mjs` — tab index and DOM activation logic.
- Create `apps/web/src/components/home/ProductWorkbenchSection.astro` — localized section markup and styling.
- Modify `apps/web/src/components/home/HomeRefresh.astro` — import and place the new section.
- Create `apps/web/tests/product-workbench-section.test.mjs` — behavior and static integration contract.

---

### Task 1: Capture The Real Workbench Screens

**Files:**
- Create: `apps/web/public/product/workbench-document-editor.webp`
- Create: `apps/web/public/product/workbench-agent-proposal.webp`

**Interfaces:**
- Consumes: the local dogfood route `/userstory/preview`, its current `.openpress/review/current.json`, and the real Workbench UI.
- Produces: two same-size public assets used by `ProductWorkbenchSection.astro`.

- [ ] **Step 1: Start the current dogfood Workbench**

Run from `/Users/quan/Desktop/OpenPress/framework/openpress` so the existing real Change Preview fixture is available:

```bash
node packages/core/engine/cli.mjs dev . --renderer react --host 127.0.0.1 --port 9999
```

Expected: `http://127.0.0.1:9999/userstory/preview` loads the document Workbench.

- [ ] **Step 2: Capture the document editor state**

Use Playwright at a 1600 × 1000 viewport. Open a representative User Story Book page, leave the left document navigation and bottom-right zoom controls visible, activate one real inline-editable text target, and capture only the browser viewport to a temporary PNG.

Expected: the frame communicates “rendered page plus direct document controls” without terminal content or operating-system chrome.

- [ ] **Step 3: Capture the Agent proposal state**

Open the real Changes control, display the Current / Proposed comparison, and open one numbered proposal review surface so its note and feedback controls are visible. Capture the identical viewport and crop to a second temporary PNG.

Expected: the frame shows rendered document context plus an actionable proposal review, not an empty or loading state.

- [ ] **Step 4: Inspect and optimize both captures**

View both PNGs at original size, reject captures with private information, clipped controls, unreadable text, or mismatched geometry, then encode them:

```bash
mkdir -p apps/web/public/product
cwebp -quiet -q 88 /tmp/openpress-workbench-editor.png \
  -o apps/web/public/product/workbench-document-editor.webp
cwebp -quiet -q 88 /tmp/openpress-workbench-proposal.png \
  -o apps/web/public/product/workbench-agent-proposal.webp
sips -g pixelWidth -g pixelHeight apps/web/public/product/*.webp
```

Expected: both assets report 1600 × 1000 and retain readable UI labels.

- [ ] **Step 5: Commit the product evidence assets**

```bash
git add apps/web/public/product/workbench-document-editor.webp \
  apps/web/public/product/workbench-agent-proposal.webp
git commit -m "[core] add real workbench product captures"
```

---

### Task 2: Build The Tested Tab State Module

**Files:**
- Create: `apps/web/src/components/home/productWorkbenchTabs.mjs`
- Create: `apps/web/tests/product-workbench-section.test.mjs`

**Interfaces:**
- Produces: `nextProductTabIndex(currentIndex, key, tabCount): number | null` and `initProductWorkbenchTabs(root: ParentNode): void`.
- Consumes: elements marked with `[data-product-workbench]`, `[data-product-tab]`, and `[data-product-panel]`.

- [ ] **Step 1: Write the failing keyboard-navigation test**

Create `apps/web/tests/product-workbench-section.test.mjs` with:

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("product tabs wrap arrow navigation and support Home and End", async () => {
  const { nextProductTabIndex } = await import(
    "../src/components/home/productWorkbenchTabs.mjs"
  );
  assert.equal(nextProductTabIndex(0, "ArrowRight", 2), 1);
  assert.equal(nextProductTabIndex(1, "ArrowRight", 2), 0);
  assert.equal(nextProductTabIndex(0, "ArrowLeft", 2), 1);
  assert.equal(nextProductTabIndex(1, "Home", 2), 0);
  assert.equal(nextProductTabIndex(0, "End", 2), 1);
  assert.equal(nextProductTabIndex(0, "Enter", 2), null);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm --filter web test
```

Expected: FAIL because `productWorkbenchTabs.mjs` does not exist.

- [ ] **Step 3: Implement minimal index navigation**

Create `productWorkbenchTabs.mjs` with `nextProductTabIndex` handling only `ArrowLeft`, `ArrowRight`, `Home`, and `End`, returning `null` for unrelated keys or an invalid tab count.

- [ ] **Step 4: Add a failing DOM contract test before DOM implementation**

Extend the same test file with lightweight fake tabs and panels that implement the attributes and methods used by the initializer. Assert that clicking the second tab updates `aria-selected`, roving `tabindex`, `hidden`, and focus, and that ArrowRight wraps to the first tab.

Run `pnpm --filter web test` and confirm this new test fails because `initProductWorkbenchTabs` is missing.

- [ ] **Step 5: Implement minimal progressive enhancement**

Export `initProductWorkbenchTabs(root)` so it:

1. finds each `[data-product-workbench]` instance;
2. pairs tabs and panels by array index;
3. activates a tab on click;
4. activates and focuses the destination on supported arrow/Home/End keys;
5. activates the focused tab on Enter or Space;
6. updates `aria-selected`, `tabIndex`, and `panel.hidden` only.

- [ ] **Step 6: Run the behavior tests and verify GREEN**

```bash
pnpm --filter web test
```

Expected: keyboard and activation tests pass.

- [ ] **Step 7: Commit the tested behavior module**

```bash
git add apps/web/src/components/home/productWorkbenchTabs.mjs \
  apps/web/tests/product-workbench-section.test.mjs
git commit -m "[core] add accessible product screenshot tabs"
```

---

### Task 3: Add The Multilingual Product Showcase

**Files:**
- Create: `apps/web/src/components/home/ProductWorkbenchSection.astro`
- Modify: `apps/web/src/components/home/HomeRefresh.astro`
- Modify: `apps/web/tests/product-workbench-section.test.mjs`

**Interfaces:**
- Consumes: the two `/product/*.webp` assets and `initProductWorkbenchTabs(document)`.
- Produces: one localized ARIA tab section placed between the workflow and Press Tree sections.

- [ ] **Step 1: Write the failing static integration contract**

Extend `product-workbench-section.test.mjs` to read the component and homepage source and assert:

```js
test("homepage includes the localized product showcase before Press Tree", async () => {
  const component = await fs.readFile(
    path.join(WEB_ROOT, "src/components/home/ProductWorkbenchSection.astro"),
    "utf8",
  );
  const home = await fs.readFile(
    path.join(WEB_ROOT, "src/components/home/HomeRefresh.astro"),
    "utf8",
  );

  assert.match(component, /"zh-tw"/);
  assert.match(component, /\ben:/);
  assert.match(component, /\bja:/);
  assert.equal((component.match(/role="tab"/g) ?? []).length, 2);
  assert.equal((component.match(/role="tabpanel"/g) ?? []).length, 2);
  assert.match(component, /workbench-document-editor\.webp/);
  assert.match(component, /workbench-agent-proposal\.webp/);
  assert.match(component, /width="1600"/);
  assert.match(component, /height="1000"/);
  assert.ok(home.indexOf("<ProductWorkbenchSection") > home.indexOf('id="flow"'));
  assert.ok(home.indexOf("<ProductWorkbenchSection") < home.indexOf('aria-labelledby="tree-title"'));
});
```

- [ ] **Step 2: Run the test and verify RED**

```bash
pnpm --filter web test
```

Expected: FAIL because the Astro component is absent.

- [ ] **Step 3: Implement localized component markup**

Create `ProductWorkbenchSection.astro` with one `ui` dictionary containing all
copy for `zh-tw`, `en`, and `ja`. Use these semantic labels:

- zh-TW heading: `Agent 提案，你在文件上確認。`
- English heading: `The agent proposes. You inspect the page.`
- Japanese heading: `Agent が提案し、ページ上で確認する。`

Render one `role="tablist"`, two tabs, and two paired tabpanels. The editor tab
starts with `aria-selected="true"` and `tabindex="0"`; the proposal tab starts
unselected and its panel uses `hidden`. Each panel includes the screenshot, one
description, and a localized full-image link.

- [ ] **Step 4: Add the restrained product-specific styling**

Use existing tokens only. Keep the section background light, tabs text-only,
the selected tab in `var(--op-accent)` with a 1px underline, and the screenshot
inside one hairline stage. Add a short opacity/translate animation only to the
newly visible panel and disable it under `prefers-reduced-motion: reduce`.

- [ ] **Step 5: Wire progressive enhancement and homepage placement**

Import `initProductWorkbenchTabs` in the Astro client script and initialize it
on `document`. Import `ProductWorkbenchSection` at the top of
`HomeRefresh.astro`, then place `<ProductWorkbenchSection />` immediately after
the closing tag of the `#flow` section.

- [ ] **Step 6: Run tests, typecheck, and build**

```bash
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web build
```

Expected: all commands exit 0 and all three locale routes build.

- [ ] **Step 7: Commit the component and integration**

```bash
git add apps/web/src/components/home/ProductWorkbenchSection.astro \
  apps/web/src/components/home/HomeRefresh.astro \
  apps/web/tests/product-workbench-section.test.mjs
git commit -m "[core] show workbench editing and agent proposals"
```

---

### Task 4: Browser Accessibility And Visual QA

**Files:**
- Modify only if QA exposes a concrete defect in Task 3 files.

**Interfaces:**
- Consumes: built multilingual homepage and tab behavior.
- Produces: verified desktop/mobile presentation and interaction.

- [ ] **Step 1: Run the local website**

```bash
pnpm --filter web dev --host 127.0.0.1 --port 4321
```

- [ ] **Step 2: Verify desktop interaction at 1440 × 1000**

Using Playwright, open `/en/`, tab to the product selector, switch with
ArrowRight and ArrowLeft, then verify exactly one panel is visible and the
selected tab state follows focus. Open the full-image links and confirm they
resolve.

- [ ] **Step 3: Verify mobile layout at 390 × 844**

Open `/zh-tw/`, confirm tabs remain readable, the screenshot does not overflow
the viewport, captions wrap cleanly, and the page has no horizontal scroll.

- [ ] **Step 4: Verify reduced motion and all locales**

Emulate `prefers-reduced-motion: reduce`; confirm panel switching has no
animation. Open `/en/`, `/zh-tw/`, and `/ja/` and confirm each section heading
uses the correct language while sharing the same two images.

- [ ] **Step 5: Capture and inspect final homepage evidence**

Save one desktop and one mobile homepage screenshot to `/tmp`, inspect both at
original detail, and remove any visual accessory that does not help explain
the product workflow.

- [ ] **Step 6: Run the final verification gate**

```bash
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web build
git diff --check
git status --short
```

Expected: all checks pass and only intentional committed files remain.
