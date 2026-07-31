import { expect, test, type Locator, type Page } from "@playwright/test";

const PUBLISHED_READER_URL = `http://reader.localhost:${process.env.OPENPRESS_E2E_PORT ?? "5195"}/reader/preview`;

test("loads the published reader and restores a routed page hash", async ({ page }) => {
  await page.goto(PUBLISHED_READER_URL);
  await expectPublishedReader(page);
  await expectPageTarget(page, { hash: "#page-01", label: "01" });

  await page.goto(`${PUBLISHED_READER_URL}#page-03`);
  await expectPublishedReader(page);
  await expectPageTarget(page, { hash: "#page-03", label: "03" });
});

test("keeps bookmarks, internal anchors, and keyboard navigation in sync", async ({ page }) => {
  await page.goto(PUBLISHED_READER_URL);
  await expectPublishedReader(page);

  await openBookmarks(page);
  const h2Target = await clickBookmarkAndExpectPage(
    page,
    page.locator('[data-openpress-react-bookmarks="true"] .bookmark-h2[data-openpress-page-index]').first(),
  );
  expect(h2Target.hash).toBe("#page-02");

  await openBookmarks(page);
  const h3Target = await clickBookmarkAndExpectPage(
    page,
    page.locator('[data-openpress-react-bookmarks="true"] .bookmark-h3[data-openpress-page-index]').first(),
  );
  expect(h3Target.hash).toBe("#page-03");

  await openBookmarks(page);
  const h4Target = await clickBookmarkAndExpectPage(
    page,
    page.locator('[data-openpress-react-bookmarks="true"] .bookmark-h4[data-openpress-page-index]').first(),
  );
  expect(h4Target.hash).toBe("#page-04");

  await page.locator('[data-openpress-page-index="0"] a[href="#topic-target"]').click();
  await expectPageTarget(page, { hash: "#page-04", label: "04" });

  await page.keyboard.press("Home");
  await expectPageTarget(page, { hash: "#page-01", label: "01" });

  await page.keyboard.press("ArrowRight");
  await expectPageTarget(page, { hash: "#page-02", label: "02" });

  await page.keyboard.press("End");
  await expectPageTarget(page, { hash: "#page-04", label: "04" });

  await page.keyboard.press("ArrowLeft");
  await expectPageTarget(page, { hash: "#page-03", label: "03" });
});

test("switches between contents, figure, and table directories", async ({ page }) => {
  await page.goto(PUBLISHED_READER_URL);
  await expectPublishedReader(page);
  await openDirectoryPanel(page);

  const trigger = page.locator("[data-openpress-directory-trigger]");
  await expect(trigger).toContainText("主目錄");

  await trigger.click();
  await page.locator('[data-openpress-directory-option="figure"]').click();
  const figure = page.locator('[data-openpress-directory-list="figure"] [data-openpress-caption-directory-item]');
  await expect(figure).toContainText("圖 1");
  await expect(figure).toContainText("Reader navigation flow");
  await clickBookmarkAndExpectPage(page, figure);

  await openDirectoryPanel(page);
  await trigger.click();
  await page.locator('[data-openpress-directory-option="table"]').click();
  const table = page.locator('[data-openpress-directory-list="table"] [data-openpress-caption-directory-item]');
  await expect(table).toContainText("表 1");
  await expect(table).toContainText("Navigation targets");
  await clickBookmarkAndExpectPage(page, table);

  await openDirectoryPanel(page);
  await trigger.click();
  await page.locator('[data-openpress-directory-option="contents"]').click();
  await expect(page.locator('[data-openpress-directory-list="contents"] .bookmark-h2').first()).toBeVisible();
});

test("clamps long caption titles and reveals the full title on hover and focus", async ({ page }) => {
  const longTitle = "Reader navigation flow across an intentionally long multi-stage document workflow with stable figure references";
  await page.route("**/openpress/reader/document.json", async (route) => {
    const response = await route.fetch();
    const documentJson = await response.json() as {
      indexes?: { captions?: Array<{ kind?: string; title?: string }> };
    };
    const figure = documentJson.indexes?.captions?.find((caption) => caption.kind === "figure");
    if (!figure) throw new Error("Expected a figure caption in the reader fixture");
    figure.title = longTitle;
    await route.fulfill({ response, json: documentJson });
  });

  await page.goto(PUBLISHED_READER_URL);
  await expectPublishedReader(page);
  await openDirectoryPanel(page);
  await page.locator("[data-openpress-directory-trigger]").click();
  await page.locator('[data-openpress-directory-option="figure"]').click();

  const item = page.locator('[data-openpress-directory-list="figure"] [data-openpress-caption-directory-item]').first();
  const title = item.locator("[data-openpress-caption-directory-title]");
  await expect(title).toHaveAttribute("data-openpress-text-overflow", "true");
  const titleMetrics = await title.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
  }));
  expect(titleMetrics.height).toBeLessThanOrEqual(titleMetrics.lineHeight * 2 + 2);
  await expect(item).toHaveAttribute("aria-label", `圖 1 ${longTitle}`);

  await item.hover();
  await expect(page.getByRole("tooltip")).toHaveText(longTitle);
  await page.keyboard.press("Tab");
  await item.focus();
  await expect(page.getByRole("tooltip")).toHaveText(longTitle);
});

test("keeps reader navigation hotkeys inactive while the directory menu has focus", async ({ page }) => {
  await page.goto(`${PUBLISHED_READER_URL}#page-02`);
  await expectPublishedReader(page);
  await openDirectoryPanel(page);

  const trigger = page.locator("[data-openpress-directory-trigger]");
  const menuOption = page.locator('[data-openpress-directory-option="contents"]');
  for (const key of ["End", "Home", "ArrowRight", "ArrowLeft"]) {
    await trigger.click();
    await expect(menuOption).toBeVisible();
    await page.keyboard.press(key);
    await expectPageTarget(page, { hash: "#page-02", label: "02" });
    await page.keyboard.press("Escape");
  }
});

test("shows a clear empty state for a directory without entries", async ({ page }) => {
  await page.route("**/openpress/reader/document.json", async (route) => {
    const response = await route.fetch();
    const documentJson = await response.json() as {
      indexes?: { captions?: Array<{ kind?: string }> };
    };
    if (documentJson.indexes?.captions) {
      documentJson.indexes.captions = documentJson.indexes.captions.filter((caption) => caption.kind !== "table");
    }
    await route.fulfill({ response, json: documentJson });
  });
  await page.goto(PUBLISHED_READER_URL);
  await expectPublishedReader(page);
  await openDirectoryPanel(page);

  await page.locator("[data-openpress-directory-trigger]").click();
  await page.locator('[data-openpress-directory-option="table"]').click();
  await expect(page.getByRole("status")).toHaveText("尚無表目錄");
});

test("workbench restores a saved H3 guide when its numeric page is stale", async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("openpress:workbench:bookmark-guide:reader", JSON.stringify({
      pageIndex: 1,
      guide: {
        chapter: { anchorId: "chapter-start", label: "01", title: "Chapter Bookmark" },
        section: { anchorId: "section-start", label: "01.1", title: "Section Bookmark" },
      },
    }));
  });

  await page.goto("/reader/preview#page-02");
  await expectPageTarget(page, { hash: "#page-03", label: "03" });
  await page.waitForTimeout(350);
  await expectPageTarget(page, { hash: "#page-03", label: "03" });
});

test("workbench keeps an explicit page hash when it differs from the saved guide page", async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("openpress:workbench:bookmark-guide:reader", JSON.stringify({
      pageIndex: 1,
      guide: {
        chapter: { anchorId: "chapter-start", label: "01", title: "Chapter Bookmark" },
        section: { anchorId: "section-start", label: "01.1", title: "Section Bookmark" },
      },
    }));
  });

  await page.goto("/reader/preview#page-04");
  await expectPageTarget(page, { hash: "#page-04", label: "04" });
  await page.waitForTimeout(350);
  await expectPageTarget(page, { hash: "#page-04", label: "04" });
});

test("workbench remaps the active H3 during a live document refresh", async ({ page }) => {
  await page.goto("/reader/preview#page-01");
  await page.evaluate(async () => {
    const harness = await import(/* @vite-ignore */ "/tests/e2e/fixtures/BookmarkGuideHarness.tsx") as {
      mountBookmarkGuideHarness: () => void;
    };
    harness.mountBookmarkGuideHarness();
  });

  const harness = page.locator("[data-bookmark-guide-harness]");
  await expect(harness).toHaveAttribute("data-ready", "true");
  await expect(harness).toHaveAttribute("data-current-page-index", "4");
  await page.evaluate(() => {
    const controls = window as typeof window & { __openpressBookmarkGuideRepaginate?: () => void };
    controls.__openpressBookmarkGuideRepaginate?.();
  });
  await expect(harness).toHaveAttribute("data-current-page-index", "10");
  await page.waitForTimeout(350);
  await expect(harness).toHaveAttribute("data-page-transitions", "4,10");
});

test("tablet resize and touch gestures do not move away from the selected bookmark", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "tablet", "tablet-only smoke for mobile viewport behavior");

  await page.goto(PUBLISHED_READER_URL);
  await expectPublishedReader(page);

  await openBookmarks(page);
  const target = await clickBookmarkAndExpectPage(
    page,
    page.locator('[data-openpress-react-bookmarks="true"] .bookmark-h4[data-openpress-page-index]').first(),
  );

  await page.setViewportSize({ width: 1180, height: 820 });
  await expectPageTarget(page, target);

  await page.evaluate(() => {
    window.dispatchEvent(new Event("resize"));
    window.visualViewport?.dispatchEvent(new Event("resize"));
  });
  await expectPageTarget(page, target);

  await page.evaluate(() => {
    const activePage = document.querySelector('[data-openpress-active="true"]');
    if (!activePage) return;
    activePage.dispatchEvent(
      new TouchEvent("touchstart", {
        bubbles: true,
        touches: [new Touch({ identifier: 1, target: activePage, clientX: 500, clientY: 400 })],
      }),
    );
    activePage.dispatchEvent(
      new TouchEvent("touchend", {
        bubbles: true,
        changedTouches: [new Touch({ identifier: 1, target: activePage, clientX: 40, clientY: 400 })],
      }),
    );
  });
  await expectPageTarget(page, target);
});

async function expectPublishedReader(page: Page) {
  await expect(page.getByText("Reader E2E Fixture", { exact: true }).first()).toBeVisible();
  await expect(page.locator("[data-openpress-total-pages]")).toHaveText("04");
  await expect(page.locator('[data-openpress-public-page="true"]')).toBeVisible();
}

async function openBookmarks(page: Page) {
  const firstBookmark = page.locator('[data-openpress-react-bookmarks="true"] [data-openpress-page-index]').first();
  if (await firstBookmark.isVisible()) return;
  await page.locator("[data-openpress-toggle-left-panel]").click();
  await expect(firstBookmark).toBeVisible();
}

async function openDirectoryPanel(page: Page) {
  const panel = page.locator("[data-openpress-left-panel]");
  if (await panel.getAttribute("data-openpress-panel-visible") === "true") return;
  await page.locator("[data-openpress-toggle-left-panel]").click();
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "true");
  await expect(page.locator("[data-openpress-directory-trigger]")).toBeVisible();
}

async function clickBookmarkAndExpectPage(page: Page, bookmark: Locator) {
  await expect(bookmark).toBeVisible();
  const target = await pageTarget(bookmark);
  await bookmark.evaluate((element) => {
    if (element instanceof HTMLElement) element.click();
  });
  await expectPageTarget(page, target);
  return target;
}

async function pageTarget(bookmark: Locator) {
  const rawPageIndex = await bookmark.getAttribute("data-openpress-page-index");
  const pageIndex = Number.parseInt(rawPageIndex ?? "", 10);
  if (!Number.isFinite(pageIndex)) throw new Error(`Bookmark missing data-openpress-page-index: ${rawPageIndex}`);
  const pageNumber = pageIndex + 1;
  return {
    hash: `#page-${String(pageNumber).padStart(2, "0")}`,
    label: String(pageNumber).padStart(2, "0"),
  };
}

async function expectPageTarget(page: Page, target: { hash: string; label: string }) {
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(target.hash)}$`));
  await expect(page.locator("[data-openpress-current-page]")).toHaveText(target.label);
  await expect(page.locator(`#page-${target.label}`)).toHaveAttribute("data-openpress-active", "true");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
