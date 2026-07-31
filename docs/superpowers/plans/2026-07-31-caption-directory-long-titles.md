# Caption Directory Long Titles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep figure and table directory rows compact by clamping long caption titles to two lines while preserving full hover, focus, and accessibility text.

**Architecture:** Caption-specific title styling stays inside `ReaderNavigationPanel`; main bookmark hierarchy remains unchanged. A shared Radix tooltip primitive renders only when layout measurement confirms overflow, and the button keeps the complete caption as its accessible name.

**Tech Stack:** React 19, Tailwind CSS v4, Radix Tooltip, Vitest, Playwright.

## Global Constraints

- Caption titles show at most two lines.
- Active items do not expand or change height.
- Short titles do not render tooltip content.
- Overflow titles expose the full caption on pointer hover and keyboard focus.
- Button click continues to navigate directly to the caption page.
- Main contents bookmarks retain their existing multiline behavior.

---

### Task 1: Overflow-aware caption title component

**Files:**
- Create: `packages/core/src/openpress/ui/tooltip.tsx`
- Modify: `packages/core/src/openpress/reader/ReaderNavigationPanel.tsx`
- Modify: `packages/core/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `packages/core/tests/openpress-caption-directory.test.ts`

**Interfaces:**
- Produces: `CaptionDirectoryTitle({ title }: { title: string })`.
- Produces: shared `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`.
- Consumes: `ResizeObserver`, `scrollHeight`, and `clientHeight` to determine two-line overflow.

- [ ] **Step 1: Write failing rendering tests**

```tsx
it("keeps the complete caption as the button accessible name", () => {
  renderDirectory({ title: LONG_TITLE });
  expect(screen.getByRole("button", { name: `表 1 ${LONG_TITLE}` })).toBeVisible();
});

it("does not add tooltip content when the caption fits", () => {
  mockOverflow(false);
  renderDirectory({ title: "Short caption" });
  expect(screen.queryByRole("tooltip")).toBeNull();
});

it("shows the complete caption tooltip when measured content overflows", async () => {
  mockOverflow(true);
  renderDirectory({ title: LONG_TITLE });
  await userEvent.hover(screen.getByText(LONG_TITLE));
  expect(await screen.findByRole("tooltip")).toHaveTextContent(LONG_TITLE);
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `pnpm --filter @open-press/core test:unit -- openpress-caption-directory.test.ts`

Expected: FAIL because caption titles are not clamped and no tooltip exists.

- [ ] **Step 3: Add the shared tooltip primitive**

Use `@radix-ui/react-tooltip` with the existing OpenPress UI class conventions. Tooltip content must be non-interactive, constrained to the left panel width, and wrap long text.

- [ ] **Step 4: Implement two-line measurement and rendering**

```tsx
function CaptionDirectoryTitle({ title }: { title: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  useLayoutEffect(() => observeOverflow(ref, setOverflowing), [title]);

  const label = <span ref={ref} className={CAPTION_DIRECTORY_TITLE_CLASS}>{title}</span>;
  if (!overflowing) return label;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{label}</TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}
```

`CAPTION_DIRECTORY_TITLE_CLASS` uses `line-clamp-2`, `overflow-hidden`, and normal wrapping. The directory button receives `aria-label={`${item.label} ${item.title}`}`.

- [ ] **Step 5: Run unit tests**

Run: `pnpm --filter @open-press/core test:unit -- openpress-caption-directory.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/openpress/ui/tooltip.tsx \
  packages/core/src/openpress/reader/ReaderNavigationPanel.tsx \
  packages/core/package.json pnpm-lock.yaml \
  packages/core/tests/openpress-caption-directory.test.ts
git commit -m "[core] clamp long caption directory titles"
```

### Task 2: Reader E2E and release metadata

**Files:**
- Modify: `packages/core/tests/e2e/reader-public-navigation.spec.ts`
- Modify: `packages/core/tests/e2e/fixtures/e2e-reader/press/reader/press.tsx`
- Create: `.changeset/tidy-captions-hover.md`

**Interfaces:**
- Consumes: the caption directory dropdown and `CaptionDirectoryTitle`.
- Verifies pointer, keyboard, height stability, and navigation behavior.

- [ ] **Step 1: Add a deliberately long caption fixture and E2E assertions**

```ts
test("clamps long caption titles and exposes the full title on focus", async ({ page }) => {
  await openDirectory(page, "table");
  const item = page.getByRole("button", { name: /A deliberately long table caption/ });
  const title = item.locator("[data-openpress-caption-directory-title]");
  await expect(title).toHaveCSS("-webkit-line-clamp", "2");
  const before = await item.evaluate((node) => node.getBoundingClientRect().height);
  await item.focus();
  await expect(page.getByRole("tooltip")).toContainText(LONG_TITLE);
  expect(await item.evaluate((node) => node.getBoundingClientRect().height)).toBe(before);
});
```

- [ ] **Step 2: Run E2E and confirm the new assertion fails before final fixes**

Run: `pnpm --dir packages/core test:e2e:reader -- reader-public-navigation.spec.ts`

Expected: FAIL until the fixture overflows and tooltip focus behavior is wired.

- [ ] **Step 3: Complete fixture and focus behavior**

Ensure the title overflows at desktop and tablet panel widths. Keep tooltip content outside the button so it cannot alter accessible name or intercept navigation.

- [ ] **Step 4: Add patch Changeset**

```md
---
"@open-press/core": patch
---

Keep long figure and table directory titles compact with accessible full-title tooltips.
```

- [ ] **Step 5: Run focused and full verification**

Run: `pnpm --filter @open-press/core test:unit -- openpress-caption-directory.test.ts`

Run: `pnpm --dir packages/core test:e2e:reader -- reader-public-navigation.spec.ts`

Run: `npm run typecheck`

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/core/tests/e2e/reader-public-navigation.spec.ts \
  packages/core/tests/e2e/fixtures/e2e-reader/press/reader/press.tsx \
  .changeset
git commit -m "[test] cover long caption directory titles"
```
