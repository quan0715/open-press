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

test("uses the floating zoom dock without toolbar or spread controls", async ({ page }) => {
  await page.goto("/");
  await expectPublishedReader(page);

  const dock = page.locator('[data-openpress-page-zoom-dock="floating"]');
  await expect(dock).toBeVisible();
  await expectFlatZoomControls(page);
  await expect(page.locator("[data-openpress-page-zoom]")).toHaveCount(0);
  await expect(page.locator("[data-openpress-page-layout-option]")).toHaveCount(0);
  await expect(page.locator('[data-openpress-public-page="true"]')).toHaveAttribute(
    "data-openpress-page-layout",
    "single",
  );

  await dock.locator("[data-openpress-zoom-value]").click();
  await page.locator('[data-openpress-zoom-option="scale-125"]').click();
  await expect(dock.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "scale-125",
  );

  await dock.locator("[data-openpress-zoom-increase]").click();
  await expect(dock.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "scale-135",
  );

  await dock.locator("[data-openpress-zoom-value]").click();
  await page.locator('[data-openpress-zoom-option="fit-width"]').click();
  await expect(dock.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "fit-width",
  );
});

test("applies and persists a custom zoom percentage", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((storageKey) => window.localStorage.removeItem(storageKey), READER_ZOOM_STORAGE_KEY);
  await page.reload();
  await expectPublishedReader(page);

  const value = page.locator("[data-openpress-zoom-value]");
  await value.click();
  const input = page.locator("[data-openpress-custom-zoom]");
  await input.fill("137");
  await input.press("Enter");
  await expect(value).toHaveAttribute("data-openpress-scale-mode", "scale-137");
  await expect.poll(
    () => page.evaluate((storageKey) => window.localStorage.getItem(storageKey), READER_ZOOM_STORAGE_KEY),
  ).toBe("scale-137");

  await page.reload();
  await expectPublishedReader(page);
  await expect(page.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "scale-137",
  );
});

test("preserves the page-relative reading position when zoom changes", async ({ page }) => {
  await page.goto("/");
  await expectPublishedReader(page);

  const zoomValue = page.locator("[data-openpress-zoom-value]");
  await zoomValue.click();
  await page.locator('[data-openpress-zoom-option="scale-125"]').click();
  await expect(zoomValue).toHaveAttribute("data-openpress-scale-mode", "scale-125");

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

  await zoomValue.click();
  await page.locator('[data-openpress-zoom-option="scale-150"]').click();
  await expect(zoomValue).toHaveAttribute("data-openpress-scale-mode", "scale-150");

  await expect.poll(async () => (await readReaderViewportAnchor(page)).pageIndex).toBe(before.pageIndex);
  const after = await readReaderViewportAnchor(page);
  expect(Math.abs(after.yRatio - before.yRatio)).toBeLessThan(0.02);
});

async function expectPublishedReader(page: Page) {
  await expect(page.getByText("Reader E2E Fixture", { exact: true }).first()).toBeVisible();
  await expect(page.locator("[data-openpress-total-pages]")).toHaveText("04");
  await expect(page.locator('[data-openpress-public-page="true"]')).toBeVisible();
}

async function expectFlatZoomControls(page: Page) {
  const controls = [
    page.locator("[data-openpress-zoom-decrease]"),
    page.locator("[data-openpress-zoom-value]"),
    page.locator("[data-openpress-zoom-increase]"),
  ];
  for (const control of controls) {
    await expect(control).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await control.hover();
    await expect(control).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  }
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
