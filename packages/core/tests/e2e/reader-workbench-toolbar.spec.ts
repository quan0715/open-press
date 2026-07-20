import { expect, test } from "@playwright/test";

const WORKBENCH_ZOOM_STORAGE_KEY = "openpress:workspace:page-scale-mode";

test("persists the workbench zoom mode across reloads", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench toolbar persistence is covered in the desktop shell");
  await page.goto("/workspace");
  await page.evaluate((storageKey) => window.localStorage.removeItem(storageKey), WORKBENCH_ZOOM_STORAGE_KEY);
  await page.reload();

  const zoomButton = page.locator("[data-openpress-page-zoom]");
  await expect(zoomButton).toBeVisible();
  await zoomButton.click();
  await page.locator('[data-openpress-zoom-option="scale-125"]').click();
  await expect(zoomButton).toHaveAttribute("data-openpress-scale-mode", "scale-125");
  await expect.poll(
    () => page.evaluate((storageKey) => window.localStorage.getItem(storageKey), WORKBENCH_ZOOM_STORAGE_KEY),
  ).toBe("scale-125");

  await page.reload();
  await expect(page.locator("[data-openpress-page-zoom]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "scale-125",
  );
});
