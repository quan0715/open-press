import { expect, test, type Page } from "@playwright/test";

const WORKBENCH_ZOOM_STORAGE_KEY = "openpress:workspace:page-scale-mode";

test("keeps the zoom dock attached to the workbench panel footer", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the fixed desktop panel shell");
  await page.goto("/workspace");

  const panel = page.locator("[data-openpress-right-panel]");
  const dock = panel.locator('[data-openpress-page-zoom-dock="panel"]');
  const content = panel.locator("[data-openpress-control-panel]");
  await expect(dock).toBeVisible();
  await expect(dock).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expectFlatZoomControls(page);
  await expect(panel.locator("[data-openpress-page-zoom]")).toHaveCount(0);

  const before = await dock.boundingBox();
  await content.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  const after = await dock.boundingBox();
  expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(1);
});

test("persists a custom workbench zoom mode", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the fixed desktop panel shell");
  await page.goto("/workspace");
  await page.evaluate((storageKey) => window.localStorage.removeItem(storageKey), WORKBENCH_ZOOM_STORAGE_KEY);
  await page.reload();

  await page.locator("[data-openpress-zoom-value]").click();
  const input = page.locator("[data-openpress-custom-zoom]");
  await input.fill("137");
  await input.press("Enter");
  await expect(page.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "scale-137",
  );

  await page.reload();
  await expect(page.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "scale-137",
  );
});

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
  await expect(page.locator("[data-openpress-zoom-value]")).toHaveCSS("font-size", "13px");
  await expect(page.locator("[data-openpress-zoom-decrease] svg")).toHaveCSS("width", "18px");
  await expect(page.locator("[data-openpress-zoom-increase] svg")).toHaveCSS("width", "18px");
}
