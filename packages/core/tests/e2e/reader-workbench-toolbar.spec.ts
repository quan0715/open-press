import { expect, test, type Page } from "@playwright/test";

const LEGACY_WORKBENCH_ZOOM_STORAGE_KEY = "openpress:workspace:page-scale-mode";
const WORKBENCH_ZOOM_STORAGE_KEY = "openpress:workspace:page-scale-mode:reader";

test("gives the canvas the right column and keeps export in the toolbar", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the fixed desktop panel shell");
  await page.goto("/reader/preview");

  await expect(page.locator("[data-openpress-right-panel]")).toHaveCount(0);
  await expect(page.locator("[data-openpress-tools-trigger]")).toHaveCount(0);
  const dock = page.locator('[data-openpress-page-zoom-dock="floating"]');
  await expect(dock).toBeVisible();
  await expectFlatZoomControls(page);
  await expect(page.locator('[data-openpress-page-zoom-dock="panel"]')).toHaveCount(0);

  const mainBounds = await page.locator("[data-openpress-main-content]").boundingBox();
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect((mainBounds?.x ?? 0) + (mainBounds?.width ?? 0)).toBeGreaterThanOrEqual(viewportWidth - 1);

  const exportControl = page.locator("[data-openpress-export-control]");
  await expect(exportControl).toBeVisible();
  await exportControl.getByRole("button", { name: "匯出" }).click();
  await expect(page.getByRole("menuitem", { name: "PDF" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Word DOCX" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "PNG 圖片" })).toBeVisible();
});

test("opens theme and structure details only when requested", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the desktop toolbar");
  await page.goto("/reader/preview");

  await expect(page.locator("[data-openpress-document-info-dialog]")).toHaveCount(0);
  await page.locator("[data-openpress-workbench-more]").click();
  await page.getByRole("menuitem", { name: "文件資訊" }).click();

  const dialog = page.locator("[data-openpress-document-info-dialog]");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Template style")).toBeVisible();
  await expect(dialog.getByText("Structure Summary")).toBeVisible();
  await dialog.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("[data-openpress-workbench-more]")).toBeFocused();
});

test("opens extension panels in an overlay without resizing the canvas", async ({ page }) => {
  await page.goto("/reader/preview");
  await page.evaluate(async () => {
    window.localStorage.setItem("openpress:workspace:hide-ui", "false");
    const harness = await import(/* @vite-ignore */ "/tests/e2e/fixtures/WorkbenchToolsControlHarness.tsx") as {
      mountWorkbenchToolsControlHarness: () => void;
    };
    harness.mountWorkbenchToolsControlHarness();
  });

  const harness = page.locator("#workbench-tools-control-harness-root");
  const canvas = harness.locator("[data-openpress-main-content]");
  const trigger = harness.locator("[data-openpress-tools-trigger]");
  await expect(harness.locator("[data-openpress-export-control]")).toBeVisible();
  await expect(harness.locator("[data-openpress-workbench-more]")).toBeVisible();
  await expect(harness.locator('[data-openpress-page-zoom-dock="floating"]')).toBeVisible();
  await expect(trigger).toBeVisible();
  expect(await harness.locator("[data-openpress-workbench-toolbar]").evaluate((toolbar) => (
    toolbar.scrollWidth <= toolbar.clientWidth
  ))).toBe(true);

  const widthBefore = (await canvas.boundingBox())?.width;
  const zoomBefore = await harness.locator("[data-openpress-zoom-value]").getAttribute("data-openpress-scale-mode");
  await trigger.click();
  await expect(page.locator("[data-openpress-tools-drawer]")).toBeVisible();
  await expect(page.getByText("Custom panel content")).toBeVisible();
  expect((await canvas.boundingBox())?.width).toBe(widthBefore);
  await expect(harness.locator("[data-openpress-zoom-value]")).toHaveAttribute("data-openpress-scale-mode", zoomBefore ?? "fit");

  await page.locator("[data-openpress-tools-drawer]").press("Escape");
  await expect(page.locator("[data-openpress-tools-drawer]")).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.evaluate(() => {
    (window as typeof window & { __openpressSetToolsHarnessPanels?: (visible: boolean) => void })
      .__openpressSetToolsHarnessPanels?.(false);
  });
  await expect(trigger).toHaveCount(0);
  await page.evaluate(() => {
    (window as typeof window & { __openpressSetToolsHarnessPanels?: (visible: boolean) => void })
      .__openpressSetToolsHarnessPanels?.(true);
  });
  await expect(trigger).toBeVisible();
  await expect(page.locator("[data-openpress-tools-drawer]")).toHaveCount(0);
});

test("offers slide-specific export actions and presents the current slide", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Press-type behavior only needs one browser profile");
  await page.goto("/reader/preview#page-02");
  await page.evaluate(async () => {
    const harness = await import(/* @vite-ignore */ "/tests/e2e/fixtures/WorkbenchToolsControlHarness.tsx") as {
      mountSlideWorkbenchHarness: () => void;
    };
    harness.mountSlideWorkbenchHarness();
  });

  const harness = page.locator("#workbench-tools-control-harness-root");
  await harness.locator("[data-openpress-export-control]").getByRole("button", { name: "匯出" }).click();
  await expect(page.getByRole("menuitem", { name: "放映模式" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "PDF" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "PNG 圖片" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Word DOCX" })).toHaveCount(0);

  await page.getByRole("menuitem", { name: "放映模式" }).click();
  await expect(harness).toHaveAttribute("data-openpress-presentation-index", "1");
});

test("persists a custom workbench zoom mode", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the fixed desktop panel shell");
  await page.goto("/reader/preview");
  await page.evaluate(({ legacyKey, storageKey }) => {
    window.localStorage.setItem(legacyKey, "scale-75");
    window.localStorage.removeItem(storageKey);
  }, { legacyKey: LEGACY_WORKBENCH_ZOOM_STORAGE_KEY, storageKey: WORKBENCH_ZOOM_STORAGE_KEY });
  await page.reload();

  await page.locator("[data-openpress-zoom-value]").click();
  const input = page.locator("[data-openpress-custom-zoom]");
  await input.fill("137");
  await input.press("Enter");
  await expect(page.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "scale-137",
  );
  await expect.poll(
    () => page.evaluate((storageKey) => window.localStorage.getItem(storageKey), WORKBENCH_ZOOM_STORAGE_KEY),
  ).toBe("scale-137");
  expect(
    await page.evaluate((legacyKey) => window.localStorage.getItem(legacyKey), LEGACY_WORKBENCH_ZOOM_STORAGE_KEY),
  ).toBe("scale-75");

  await page.reload();
  await expect(page.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "scale-137",
  );
});

test("reloads zoom when the Press storage key changes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the fixed desktop panel shell");
  await page.goto("/reader/preview");
  await page.evaluate(() => {
    window.localStorage.setItem("openpress:test:page-scale:alpha", "scale-125");
    window.localStorage.setItem("openpress:test:page-scale:beta", "scale-175");
  });
  await page.evaluate(async () => {
    const harness = await import(/* @vite-ignore */ "/tests/e2e/fixtures/PageViewportScaleHarness.tsx") as {
      mountPageViewportScaleHarness: () => void;
    };
    harness.mountPageViewportScaleHarness();
  });

  const harness = page.locator("[data-page-viewport-scale-harness]");
  await expect(harness).toHaveAttribute("data-scale-mode", "scale-125");
  await page.evaluate(() => {
    const controls = window as typeof window & {
      __openpressScaleStorageWrites?: Array<[string, string]>;
      __openpressSwitchScaleStorageKey?: () => void;
    };
    const originalSetItem = Storage.prototype.setItem;
    controls.__openpressScaleStorageWrites = [];
    Storage.prototype.setItem = function setItem(key, value) {
      controls.__openpressScaleStorageWrites?.push([key, value]);
      originalSetItem.call(this, key, value);
    };
    controls.__openpressSwitchScaleStorageKey?.();
  });
  await expect(harness).toHaveAttribute("data-scale-mode", "scale-175");
  expect(await page.evaluate(() => {
    const controls = window as typeof window & { __openpressScaleStorageWrites?: Array<[string, string]> };
    return {
      alpha: window.localStorage.getItem("openpress:test:page-scale:alpha"),
      beta: window.localStorage.getItem("openpress:test:page-scale:beta"),
      writes: controls.__openpressScaleStorageWrites,
    };
  })).toEqual({
    alpha: "scale-125",
    beta: "scale-175",
    writes: [["openpress:test:page-scale:beta", "scale-175"]],
  });
});

test("keeps zoom independent across Presses", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the fixed desktop panel shell");
  await page.route("**/openpress/workspace.json", async (route) => {
    const response = await route.fetch();
    const manifest = await response.json() as {
      presses: Array<Record<string, unknown> & { slug: string; title: string }>;
    };
    const reader = manifest.presses.find((press) => press.slug === "reader");
    if (!reader) throw new Error("Expected reader fixture Press");
    await route.fulfill({
      response,
      json: {
        ...manifest,
        presses: [
          reader,
          { ...reader, slug: "secondary", title: "Secondary E2E Fixture" },
        ],
      },
    });
  });
  await page.goto("/reader/preview");
  await page.evaluate(() => {
    window.localStorage.removeItem("openpress:workspace:page-scale-mode:reader");
    window.localStorage.removeItem("openpress:workspace:page-scale-mode:secondary");
  });
  await page.reload();

  await selectZoomMode(page, "scale-125");
  await page.getByRole("tab", { name: "Secondary E2E Fixture" }).click();
  await expect(page).toHaveURL(/\/secondary\/preview/);
  await expect(page.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "fit-width",
  );
  await selectZoomMode(page, "scale-150");

  await page.getByRole("tab", { name: "Reader E2E Fixture" }).click();
  await expect(page).toHaveURL(/\/reader\/preview/);
  await expect(page.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "scale-125",
  );
  expect(await page.evaluate(() => ({
    reader: window.localStorage.getItem("openpress:workspace:page-scale-mode:reader"),
    secondary: window.localStorage.getItem("openpress:workspace:page-scale-mode:secondary"),
  }))).toEqual({ reader: "scale-125", secondary: "scale-150" });
});

test("keeps zoom controls available in Focus mode", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the fixed desktop panel shell");
  await page.goto("/reader/preview");

  const floatingDock = page.locator('[data-openpress-page-zoom-dock="floating"]');
  await expect(floatingDock).toBeVisible();
  await expect(floatingDock).toHaveCount(1);
  await page.locator("[data-openpress-hide-ui-toggle]").click();
  await expect(floatingDock).toBeVisible();
  await expect(floatingDock).toHaveCount(1);

  await floatingDock.locator("[data-openpress-zoom-value]").click();
  await page.locator('[data-openpress-zoom-option="scale-125"]').click();
  await expect(floatingDock.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "scale-125",
  );

  await page.locator("[data-openpress-hide-ui-toggle]").click();
  await expect(floatingDock).toBeVisible();
  await expect(floatingDock.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "scale-125",
  );
  await expect(floatingDock).toHaveCount(1);
});

test("makes oversized workbench pages horizontally reachable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the fixed desktop panel shell");
  await page.goto("/reader/preview");

  const stage = page.locator(".reader-stage");
  const zoomValue = page.locator("[data-openpress-zoom-value]");
  await zoomValue.click();
  await page.locator('[data-openpress-zoom-option="scale-200"]').click();
  await expect(zoomValue).toHaveAttribute("data-openpress-scale-mode", "scale-200");

  await expectOversizedPageReachable(page);
  await expect(stage).toHaveCSS("scrollbar-width", "thin");

  await zoomValue.click();
  await page.locator('[data-openpress-zoom-option="fit-width"]').click();
  await expect(zoomValue).toHaveAttribute("data-openpress-scale-mode", "fit-width");
  await expectPageCenteredWithoutHorizontalOverflow(page);
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

async function selectZoomMode(page: Page, mode: string) {
  await page.locator("[data-openpress-zoom-value]").click();
  await page.locator(`[data-openpress-zoom-option="${mode}"]`).click();
  await expect(page.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    mode,
  );
}

async function expectOversizedPageReachable(page: Page) {
  const stage = page.locator(".reader-stage");
  await expect.poll(() => stage.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);

  const edges = await stage.evaluate((element) => {
    const target = element.querySelector<HTMLElement>("#page-01");
    if (!target) throw new Error("Expected first rendered page");
    element.style.scrollBehavior = "auto";
    element.scrollLeft = 0;
    const stageAtStart = element.getBoundingClientRect();
    const pageAtStart = target.getBoundingClientRect();
    const leftReachable = pageAtStart.left >= stageAtStart.left - 1;

    element.scrollLeft = element.scrollWidth - element.clientWidth;
    const stageAtEnd = element.getBoundingClientRect();
    const pageAtEnd = target.getBoundingClientRect();
    return {
      leftReachable,
      rightReachable: pageAtEnd.right <= stageAtEnd.right + 1,
      leftGap: pageAtStart.left - stageAtStart.left,
      rightOverflow: pageAtEnd.right - stageAtEnd.right,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      scrollLeft: element.scrollLeft,
    };
  });

  expect(edges.leftReachable, JSON.stringify(edges)).toBe(true);
  expect(edges.rightReachable, JSON.stringify(edges)).toBe(true);
}

async function expectPageCenteredWithoutHorizontalOverflow(page: Page) {
  const stage = page.locator(".reader-stage");
  await expect.poll(() => stage.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  const result = await stage.evaluate((element) => {
    const target = element.querySelector<HTMLElement>("#page-01");
    if (!target) throw new Error("Expected first rendered page");
    const stageRect = element.getBoundingClientRect();
    const pageRect = target.getBoundingClientRect();
    return Math.abs(
      (pageRect.left - stageRect.left) - (stageRect.right - pageRect.right),
    );
  });
  expect(result).toBeLessThanOrEqual(1);
}
