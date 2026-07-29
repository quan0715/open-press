import { expect, test, type Page } from "@playwright/test";

const READER_ZOOM_STORAGE_KEY = "openpress:reader:page-scale-mode";
const PUBLISHED_READER_URL = `http://reader.localhost:${process.env.OPENPRESS_E2E_PORT ?? "5195"}/reader/preview`;

test("search jumps to a published page result", async ({ page }) => {
  await page.goto(PUBLISHED_READER_URL);
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

test("opens and closes public search with keyboard shortcuts", async ({ page }) => {
  await page.goto(PUBLISHED_READER_URL);
  await expectPublishedReader(page);

  const dialog = page.getByRole("dialog", { name: "搜尋文件" });
  await expect(dialog).toHaveCount(0);

  await page.keyboard.press("ControlOrMeta+k");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByPlaceholder("搜尋頁面內容")).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("uses the floating zoom dock without toolbar or spread controls", async ({ page }) => {
  await page.goto(PUBLISHED_READER_URL);
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
  await expect(
    dock.locator('[data-openpress-zoom-value-text][data-openpress-zoom-motion="up"]', {
      hasText: "135%",
    }),
  ).toBeVisible();

  await dock.locator("[data-openpress-zoom-decrease]").click();
  await expect(dock.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "scale-125",
  );
  await expect(
    dock.locator('[data-openpress-zoom-value-text][data-openpress-zoom-motion="down"]', {
      hasText: "125%",
    }),
  ).toBeVisible();

  await dock.locator("[data-openpress-zoom-value]").click();
  await page.locator('[data-openpress-zoom-option="fit-width"]').click();
  await expect(dock.locator("[data-openpress-zoom-value]")).toHaveAttribute(
    "data-openpress-scale-mode",
    "fit-width",
  );
});

test("applies and persists a custom zoom percentage", async ({ page }) => {
  await page.goto(PUBLISHED_READER_URL);
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

test("adjusts public reader zoom with command shortcuts without intercepting inputs", async ({ page }) => {
  await page.goto(PUBLISHED_READER_URL);
  await expectPublishedReader(page);

  const zoomValue = page.locator("[data-openpress-zoom-value]");
  await zoomValue.click();
  await page.locator('[data-openpress-zoom-option="scale-100"]').click();

  const prevented = await page.evaluate(() => {
    const event = new KeyboardEvent("keydown", {
      key: "+",
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(true);
  await expect(zoomValue).toHaveAttribute("data-openpress-scale-mode", "scale-110");
  await page.keyboard.press("ControlOrMeta+-");
  await expect(zoomValue).toHaveAttribute("data-openpress-scale-mode", "scale-100");

  await zoomValue.click();
  const customInput = page.locator("[data-openpress-custom-zoom]");
  await customInput.focus();
  await page.keyboard.press("ControlOrMeta+=");
  await expect(zoomValue).toHaveAttribute("data-openpress-scale-mode", "scale-100");
});

test("preserves the page-relative reading position when zoom changes", async ({ page }) => {
  await page.goto(PUBLISHED_READER_URL);
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
  // Transformed page geometry can vary slightly across Chromium platforms.
  expect(Math.abs(after.yRatio - before.yRatio)).toBeLessThan(0.03);
});

test("makes oversized public reader pages horizontally reachable", async ({ page }) => {
  await page.goto(PUBLISHED_READER_URL);
  await expectPublishedReader(page);

  const stage = page.locator(".reader-stage");
  const zoomValue = page.locator("[data-openpress-zoom-value]");
  await zoomValue.click();
  await page.locator('[data-openpress-zoom-option="scale-200"]').click();
  await expect(zoomValue).toHaveAttribute("data-openpress-scale-mode", "scale-200");

  await expectOversizedPageReachable(page);
  // Chromium serializes pan-x + pan-y + pinch-zoom as its equivalent alias.
  await expect(stage).toHaveCSS("touch-action", "manipulation");

  await zoomValue.click();
  await page.locator('[data-openpress-zoom-option="fit-width"]').click();
  await expect(zoomValue).toHaveAttribute("data-openpress-scale-mode", "fit-width");
  await expectPageCenteredWithoutHorizontalOverflow(page);
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
  await expect(page.locator("[data-openpress-zoom-value]")).toHaveCSS("font-size", "13px");
  await expect(page.locator("[data-openpress-zoom-decrease] svg")).toHaveCSS("width", "18px");
  await expect(page.locator("[data-openpress-zoom-increase] svg")).toHaveCSS("width", "18px");
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
