import { expect, test, type Page } from "@playwright/test";

const READER_ZOOM_STORAGE_KEY = "openpress:reader:page-scale-mode";

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

test("persists the selected zoom mode across reloads", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((storageKey) => window.localStorage.removeItem(storageKey), READER_ZOOM_STORAGE_KEY);
  await page.reload();
  await expectPublishedReader(page);

  const zoomButton = page.locator("[data-openpress-page-zoom]");
  await zoomButton.click();
  await page.locator('[data-openpress-zoom-option="scale-125"]').click();
  await expect(zoomButton).toHaveAttribute("data-openpress-scale-mode", "scale-125");
  await expect.poll(
    () => page.evaluate((storageKey) => window.localStorage.getItem(storageKey), READER_ZOOM_STORAGE_KEY),
  ).toBe("scale-125");

  await page.reload();
  await expectPublishedReader(page);
  await expect(page.locator("[data-openpress-page-zoom]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "scale-125",
  );
});

test("preserves the page-relative reading position when zoom changes", async ({ page }) => {
  await page.goto("/");
  await expectPublishedReader(page);

  const zoomButton = page.locator("[data-openpress-page-zoom]");
  await zoomButton.click();
  await page.locator('[data-openpress-zoom-option="scale-125"]').click();
  await expect(zoomButton).toHaveAttribute("data-openpress-scale-mode", "scale-125");

  await page.locator("#page-03").evaluate((target) => {
    if (!(target instanceof HTMLElement)) throw new Error("Expected reader page element");
    const stage = target.closest<HTMLElement>(".reader-stage");
    if (!stage) throw new Error("Expected reader stage");
    stage.style.scrollBehavior = "auto";
    const stageRect = stage.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    stage.scrollTop += targetRect.top + (targetRect.height * 0.4) - (stageRect.top + (stageRect.height / 2));
  });

  const before = await readReaderViewportAnchor(page);
  expect(before.pageIndex).toBe(2);

  await zoomButton.click();
  await page.locator('[data-openpress-zoom-option="scale-150"]').click();
  await expect(zoomButton).toHaveAttribute("data-openpress-scale-mode", "scale-150");

  await expect.poll(async () => (await readReaderViewportAnchor(page)).pageIndex).toBe(before.pageIndex);
  const after = await readReaderViewportAnchor(page);
  expect(Math.abs(after.yRatio - before.yRatio)).toBeLessThan(0.02);
});

async function expectPublishedReader(page: Page) {
  await expect(page.getByText("Reader E2E Fixture", { exact: true }).first()).toBeVisible();
  await expect(page.locator("[data-openpress-total-pages]")).toHaveText("04");
  await expect(page.locator('[data-openpress-public-page="true"]')).toBeVisible();
}

async function readReaderViewportAnchor(page: Page) {
  return page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>(".reader-stage");
    const readerPages = Array.from(
      document.querySelectorAll<HTMLElement>(".reader-pages > [data-openpress-page-index]"),
    );
    if (!stage || readerPages.length === 0) throw new Error("Expected rendered reader pages");

    const stageRect = stage.getBoundingClientRect();
    const anchorX = stageRect.left + (stageRect.width / 2);
    const anchorY = stageRect.top + (stageRect.height / 2);
    const distanceToRect = (rect: DOMRect) => {
      const deltaX = anchorX < rect.left ? rect.left - anchorX : anchorX > rect.right ? anchorX - rect.right : 0;
      const deltaY = anchorY < rect.top ? rect.top - anchorY : anchorY > rect.bottom ? anchorY - rect.bottom : 0;
      return Math.hypot(deltaX, deltaY);
    };
    const target = readerPages.reduce((closest, candidate) => {
      return distanceToRect(candidate.getBoundingClientRect())
        < distanceToRect(closest.getBoundingClientRect())
        ? candidate
        : closest;
    });
    const targetRect = target.getBoundingClientRect();
    return {
      pageIndex: Number.parseInt(target.dataset.openpressPageIndex ?? "", 10),
      yRatio: (anchorY - targetRect.top) / targetRect.height,
    };
  });
}
