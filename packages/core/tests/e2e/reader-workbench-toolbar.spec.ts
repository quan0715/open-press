import { expect, test, type Page } from "@playwright/test";

const LEGACY_WORKBENCH_ZOOM_STORAGE_KEY = "openpress:workspace:page-scale-mode";
const WORKBENCH_ZOOM_STORAGE_KEY = "openpress:workspace:page-scale-mode:reader";
const WORKBENCH_PANEL_STORAGE_KEY = "openpress:workspace:panels";
const WORKBENCH_LEFT_PANEL_WIDTH_STORAGE_KEY = "openpress:workspace:left-panel-width";

test("opens workspace settings and persists appearance choices", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Settings integration only needs one browser profile");
  await page.goto("/workspace/settings");

  await expect(page).toHaveURL(/\/workspace\/settings(?:#.*)?$/);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();

  const light = page.locator('[data-openpress-workspace-mode-option="light"]');
  const violet = page.locator('[data-openpress-workspace-accent-option="violet"]');
  await light.click();
  await violet.click();

  await expect(page.locator("html")).toHaveAttribute("data-openpress-workspace-color-mode", "light");
  await expect(page.locator("html")).toHaveAttribute("data-openpress-workspace-accent", "violet");
  expect(await page.evaluate(() => ({
    mode: window.localStorage.getItem("openpress:workspace:color-mode"),
    accent: window.localStorage.getItem("openpress:workspace:accent"),
  }))).toEqual({ mode: "light", accent: "violet" });

  await page.reload();
  await expect(light).toHaveAttribute("aria-pressed", "true");
  await expect(violet).toHaveAttribute("aria-pressed", "true");
});

test("opens Settings from More and keeps appearance separate from the Press theme", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Appearance history only needs one browser profile");
  await page.goto("/reader/preview#page-03");
  const pressAccentBefore = await page.locator(".reader-page").first().evaluate((element) => (
    getComputedStyle(element).getPropertyValue("--openpress-accent").trim()
  ));

  await page.locator("[data-openpress-workbench-more]").click();
  await page.locator("[data-openpress-overflow-settings]").click();
  await expect(page).toHaveURL(/\/workspace\/settings$/);

  await page.emulateMedia({ colorScheme: "light" });
  await page.locator('[data-openpress-workspace-mode-option="system"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-openpress-workspace-color-mode", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-openpress-workspace-color-mode", "dark");

  for (const accent of ["amber", "blue", "emerald", "violet", "rose"]) {
    await page.locator(`[data-openpress-workspace-accent-option="${accent}"]`).click();
    await expect(page.locator("html")).toHaveAttribute("data-openpress-workspace-accent", accent);
  }

  await page.goBack();
  await expect(page).toHaveURL(/\/reader\/preview#page-03$/);
  await expect(page.locator(".reader-page").first()).toBeVisible();
  const pressAccentAfter = await page.locator(".reader-page").first().evaluate((element) => (
    getComputedStyle(element).getPropertyValue("--openpress-accent").trim()
  ));
  expect(pressAccentAfter).toBe(pressAccentBefore);

  await page.goForward();
  await expect(page).toHaveURL(/\/workspace\/settings$/);
  await expect(page.locator('[data-openpress-workspace-accent-option="rose"]')).toHaveAttribute("aria-pressed", "true");
});

test("uses the compact workbench toolbar hierarchy", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Toolbar hierarchy only needs one browser profile");
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
        presses: [reader, { ...reader, slug: "secondary", title: "Secondary E2E Fixture" }],
      },
    });
  });
  await page.goto("/reader/preview");

  await expect(page.locator(
    '[aria-label="Workspace navigation"] [data-openpress-back-to-workspace] + [data-openpress-bookmarks-toggle]',
  )).toBeVisible();
  await expect(page.locator("[data-openpress-color-mode-toggle]")).toHaveCount(0);
  await expect(page.locator("[data-openpress-mdx-editor-toggle]")).toHaveCount(0);
  await expect(page.locator("[data-openpress-deploy]")).toHaveCount(0);

  const rightActions = page.locator('[aria-label="Workspace actions"] > *');
  await expect(rightActions.last()).toHaveAttribute("data-openpress-document-info", "true");

  await page.locator("[data-openpress-workbench-more]").click();
  await expect(page.locator("[data-openpress-overflow-settings]")).toBeVisible();
  await expect(page.locator("[data-openpress-overflow-mdx]")).toBeVisible();
  await expect(page.locator("[data-openpress-overflow-deployment]")).toBeVisible();
});

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
  const exportTrigger = exportControl.locator('button[aria-label="匯出"]');
  const moreTrigger = page.locator("[data-openpress-workbench-more]");
  const exportBox = await exportTrigger.boundingBox();
  const moreBox = await moreTrigger.boundingBox();
  expect(exportBox?.width).toBe(moreBox?.width);
  expect(exportBox?.height).toBe(moreBox?.height);
  await expect(exportTrigger.locator("svg")).toHaveCount(1);
  await expect(exportTrigger).not.toContainText("匯出");

  await exportTrigger.click();
  await expect(exportTrigger).toHaveAttribute("data-openpress-toolbar-active", "true");
  await expect(page.getByRole("menuitem", { name: "PDF" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Word DOCX" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "PNG 圖片" })).toBeVisible();
});

test("opens theme and structure details only when requested", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the desktop toolbar");
  await page.goto("/reader/preview");

  await expect(page.locator("[data-openpress-document-info-dialog]")).toHaveCount(0);
  await page.locator("[data-openpress-document-info]").click();

  const dialog = page.locator("[data-openpress-document-info-dialog]");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Template style")).toBeVisible();
  await expect(dialog.getByText("Structure Summary")).toBeVisible();
  await dialog.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("[data-openpress-document-info]")).toBeFocused();
});

test("opens extension panels in an overlay without resizing the canvas", async ({ page }) => {
  await page.goto("/reader/preview");
  await page.evaluate(async () => {
    const harness = await import(/* @vite-ignore */ "/tests/e2e/fixtures/WorkbenchToolsControlHarness.tsx") as {
      mountWorkbenchToolsControlHarness: () => void;
    };
    harness.mountWorkbenchToolsControlHarness();
  });

  const harness = page.locator("#workbench-tools-control-harness-root");
  const canvas = harness.locator("[data-openpress-main-content]");
  const trigger = harness.locator("[data-openpress-workbench-more]");
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
  await page.locator("[data-openpress-overflow-tools]").click();
  await expect(page.locator("[data-openpress-tools-drawer]")).toBeVisible();
  await expect(page.getByText("Custom panel content")).toBeVisible();
  expect((await canvas.boundingBox())?.width).toBe(widthBefore);
  await expect(harness.locator("[data-openpress-zoom-value]")).toHaveAttribute("data-openpress-scale-mode", zoomBefore ?? "fit");

  await page.locator("[data-openpress-tools-drawer]").press("Escape");
  await expect(page.locator("[data-openpress-tools-drawer]")).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.locator("[data-openpress-overflow-tools]").click();
  await page.evaluate(() => {
    (window as typeof window & { __openpressSetToolsHarnessPanels?: (visible: boolean) => void })
      .__openpressSetToolsHarnessPanels?.(false);
  });
  await expect(page.locator("[data-openpress-tools-drawer]")).toHaveCount(0);
  await trigger.click();
  await expect(page.locator("[data-openpress-overflow-tools]")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    (window as typeof window & { __openpressSetToolsHarnessPanels?: (visible: boolean) => void })
      .__openpressSetToolsHarnessPanels?.(true);
  });
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.locator("[data-openpress-overflow-tools]")).toBeVisible();
  await page.keyboard.press("Escape");
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

test("adjusts workbench zoom with command shortcuts", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the fixed desktop panel shell");
  await page.goto("/reader/preview");

  const zoomValue = page.locator("[data-openpress-zoom-value]");
  await zoomValue.click();
  await page.locator('[data-openpress-zoom-option="scale-100"]').click();

  await page.keyboard.press("ControlOrMeta+=");
  await expect(zoomValue).toHaveAttribute("data-openpress-scale-mode", "scale-110");
  await page.keyboard.press("ControlOrMeta+-");
  await expect(zoomValue).toHaveAttribute("data-openpress-scale-mode", "scale-100");
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

test("collapses only bookmarks and persists the workspace preference", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Workbench uses the fixed desktop panel shell");
  await page.goto("/reader/preview");

  const toggle = page.locator("[data-openpress-bookmarks-toggle]");
  const panel = page.locator("[data-openpress-left-panel]");
  const main = page.locator("[data-openpress-main-content]");
  const floatingDock = page.locator('[data-openpress-page-zoom-dock="floating"]');
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "true");
  await expect(floatingDock).toBeVisible();
  const widthBefore = (await main.boundingBox())?.width ?? 0;

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "false");
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  await expect.poll(async () => (await main.boundingBox())?.width ?? 0).toBeGreaterThan(widthBefore);
  await expect.poll(async () => (await main.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(viewportWidth - 1);
  await expect(page.locator("[data-openpress-export-control]")).toBeVisible();
  await expect(page.locator("[data-openpress-workbench-more]")).toBeVisible();
  await expect(floatingDock).toBeVisible();
  await expect.poll(() => page.evaluate(
    (key) => window.localStorage.getItem(key),
    WORKBENCH_PANEL_STORAGE_KEY,
  )).toContain('"leftPanelOpen":false');

  await page.reload();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "false");
  await toggle.click();
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "true");
});

test("defaults bookmarks closed on narrow screens and honors a saved open preference", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "tablet", "Narrow default belongs to the tablet profile");
  await page.goto("/reader/preview");

  const toggle = page.locator("[data-openpress-bookmarks-toggle]");
  const panel = page.locator("[data-openpress-left-panel]");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "false");

  await page.evaluate((key) => {
    window.localStorage.setItem(key, JSON.stringify({ leftPanelOpen: true, rightPanelOpen: false }));
  }, WORKBENCH_PANEL_STORAGE_KEY);
  await page.reload();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "true");
});

test("resizes the clean navigation panel and persists one Workspace width", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Resizable navigation is a desktop interaction");
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
        presses: [reader, { ...reader, slug: "secondary", title: "Secondary E2E Fixture" }],
      },
    });
  });
  await page.goto("/reader/preview");
  await page.evaluate((key) => window.localStorage.removeItem(key), WORKBENCH_LEFT_PANEL_WIDTH_STORAGE_KEY);
  await page.reload();

  await expect(page.locator(".op-workspace-left-identity")).toHaveCount(0);
  const panel = page.locator("[data-openpress-left-panel]");
  const separator = page.getByRole("separator", { name: "調整書籤寬度" });
  await expect(separator).toBeVisible();
  const initialWidth = (await panel.boundingBox())?.width ?? 0;
  const initialValue = Number(await separator.getAttribute("aria-valuenow"));

  await separator.press("ArrowRight");
  await expect(separator).toHaveAttribute("aria-valuenow", String(initialValue + 8));
  await expect.poll(async () => (await panel.boundingBox())?.width ?? 0).toBeGreaterThan(initialWidth);

  const handleBox = await separator.boundingBox();
  if (!handleBox) throw new Error("Expected resize separator bounds");
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + 40);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + 48, handleBox.y + 40, { steps: 4 });
  await page.mouse.up();
  const persisted = Number(await page.evaluate((key) => window.localStorage.getItem(key), WORKBENCH_LEFT_PANEL_WIDTH_STORAGE_KEY));
  expect(persisted).toBeGreaterThan(initialValue + 8);

  await page.reload();
  await expect(separator).toHaveAttribute("aria-valuenow", String(persisted));
  await page.getByRole("tab", { name: "Secondary E2E Fixture" }).click();
  await expect(separator).toHaveAttribute("aria-valuenow", String(persisted));

  await separator.dblclick();
  await expect.poll(
    () => page.evaluate((key) => window.localStorage.getItem(key), WORKBENCH_LEFT_PANEL_WIDTH_STORAGE_KEY),
  ).toBeNull();
});

test("keeps a saved desktop panel width dormant on compact screens", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "tablet", "Compact width behavior belongs to the tablet profile");
  await page.goto("/reader/preview");
  await page.evaluate(({ panelKey, widthKey }) => {
    window.localStorage.setItem(panelKey, JSON.stringify({ leftPanelOpen: true, rightPanelOpen: false }));
    window.localStorage.setItem(widthKey, "480");
  }, { panelKey: WORKBENCH_PANEL_STORAGE_KEY, widthKey: WORKBENCH_LEFT_PANEL_WIDTH_STORAGE_KEY });
  await page.reload();

  await expect(page.getByRole("separator", { name: "調整書籤寬度" })).toHaveCount(0);
  const panelWidth = (await page.locator("[data-openpress-left-panel]").boundingBox())?.width ?? 0;
  expect(panelWidth).toBeLessThan(480);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), WORKBENCH_LEFT_PANEL_WIDTH_STORAGE_KEY)).toBe("480");
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
