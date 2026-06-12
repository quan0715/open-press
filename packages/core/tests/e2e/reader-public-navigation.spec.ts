import { expect, test, type Locator, type Page } from "@playwright/test";

test("loads the published reader and restores a routed page hash", async ({ page }) => {
  await page.goto("/");
  await expectPublishedReader(page);
  await expectPageTarget(page, { hash: "#page-01", label: "01" });

  await page.goto("/reader/preview#page-03");
  await expectPublishedReader(page);
  await expectPageTarget(page, { hash: "#page-03", label: "03" });
});

test("keeps bookmarks, internal anchors, and keyboard navigation in sync", async ({ page }) => {
  await page.goto("/");
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

test("tablet resize and touch gestures do not move away from the selected bookmark", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "tablet", "tablet-only smoke for mobile viewport behavior");

  await page.goto("/");
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
