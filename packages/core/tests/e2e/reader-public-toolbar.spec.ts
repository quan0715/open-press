import { expect, test, type Page } from "@playwright/test";

test("search jumps to a published page result", async ({ page }) => {
  await page.goto("/");
  await expectPublishedReader(page);

  await page.getByRole("button", { name: "搜尋文件" }).click();
  const dialog = page.getByRole("dialog", { name: "搜尋文件" });
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder("搜尋頁面內容").fill("topic-search-token");
  await dialog.getByRole("button", { name: "搜尋", exact: true }).click();

  await expect(dialog.getByText("1 個符合結果")).toBeVisible();
  await dialog.locator('[data-openpress-search-result-jump="true"]').first().click();

  await expect(page).toHaveURL(/#page-04$/);
  await expect(page.locator("[data-openpress-current-page]")).toHaveText("04");
});

test("page layout and zoom controls update reader state without visual assertions", async ({ page }) => {
  await page.goto("/");
  await expectPublishedReader(page);

  const pages = page.locator('[data-openpress-public-page="true"]');
  await expect(pages).toHaveAttribute("data-openpress-page-layout", "single");

  await page.locator("[data-openpress-page-zoom]").click();
  await page.locator('[data-openpress-page-layout-option="spread"]').click();
  await expect(pages).toHaveAttribute("data-openpress-page-layout", "spread");

  await page.locator("[data-openpress-page-zoom]").click();
  await page.locator('[data-openpress-page-layout-option="single"]').click();
  await expect(pages).toHaveAttribute("data-openpress-page-layout", "single");

  const zoomButton = page.locator("[data-openpress-page-zoom]");
  await zoomButton.click();
  await page.locator('[data-openpress-zoom-option="scale-125"]').click();
  await expect(zoomButton).toHaveAttribute("data-openpress-scale-mode", "scale-125");

  await zoomButton.click();
  await page.locator('[data-openpress-zoom-option="fit-width"]').click();
  await expect(zoomButton).toHaveAttribute("data-openpress-scale-mode", "fit-width");
});

async function expectPublishedReader(page: Page) {
  await expect(page.getByText("Reader E2E Fixture", { exact: true }).first()).toBeVisible();
  await expect(page.locator("[data-openpress-total-pages]")).toHaveText("04");
  await expect(page.locator('[data-openpress-public-page="true"]')).toBeVisible();
}
