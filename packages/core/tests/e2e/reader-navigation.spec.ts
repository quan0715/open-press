import { expect, test, type Locator, type Page } from "@playwright/test";

test("iPad reader keeps bookmark target, resize, and touch navigation in sync", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Reader E2E Fixture", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "開啟目錄" }).click();
  const h2Bookmarks = page.locator('[data-openpress-react-bookmarks="true"] .bookmark-h2[data-openpress-page-index]');
  await expect(h2Bookmarks.first()).toBeVisible();
  await clickBookmarkAndExpectPage(page, h2Bookmarks.first());

  await page.getByRole("button", { name: "開啟目錄" }).click();
  const h3Bookmarks = page.locator('[data-openpress-react-bookmarks="true"] .bookmark-h3[data-openpress-page-index]');
  await expect(h3Bookmarks.first()).toBeVisible();
  let stableTarget = await clickBookmarkAndExpectPage(page, h3Bookmarks.first());

  await page.getByRole("button", { name: "開啟目錄" }).click();
  const h4Bookmarks = page.locator('[data-openpress-react-bookmarks="true"] .bookmark-h4[data-openpress-page-index]');
  await expect(h4Bookmarks.first()).toBeVisible();
  stableTarget = await clickBookmarkAndExpectPage(page, h4Bookmarks.first());

  await page.setViewportSize({ width: 1180, height: 820 });
  await expectPageTarget(page, stableTarget);

  // iPad smoke: a visualViewport resize firing during navigation must not knock
  // the reader off the bookmark target. The hook-level regression cases in
  // tests/reader-runtime.react.test.tsx cover the underlying race more
  // precisely than this fixture-size-limited scroll can.
  await page.getByRole("button", { name: "開啟目錄" }).click();
  const ipadBookmark = page.locator('[data-openpress-react-bookmarks="true"] .bookmark-h4[data-openpress-page-index]').first();
  await expect(ipadBookmark).toBeVisible();
  const ipadTarget = await pageTarget(ipadBookmark);
  await ipadBookmark.click();
  await page.evaluate(() => {
    window.dispatchEvent(new Event("resize"));
    window.visualViewport?.dispatchEvent(new Event("resize"));
  });
  await expectPageTarget(page, ipadTarget);

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

  await expectPageTarget(page, stableTarget);
});

async function clickBookmarkAndExpectPage(page: Page, bookmark: Locator) {
  const target = await pageTarget(bookmark);
  await bookmark.click();
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

async function expectPageTarget(page: Page, target: Awaited<ReturnType<typeof pageTarget>>) {
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(target.hash)}$`));
  await expect(page.locator("[data-openpress-current-page]")).toHaveText(target.label);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
