import { expect, test, type Page } from "@playwright/test";

const READER_ZOOM_STORAGE_KEY = "openpress:reader:page-scale-mode";
const PUBLISHED_READER_URL = `http://reader.localhost:${process.env.OPENPRESS_E2E_PORT ?? "5195"}/reader/preview`;

test("search jumps to a published page result", async ({ page }) => {
  await page.goto(PUBLISHED_READER_URL);
  await expectPublishedReader(page);

  await page.getByRole("button", { name: "搜尋文件" }).click();
  const panel = page.locator("[data-openpress-right-panel]");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "true");
  await panel.getByPlaceholder("搜尋頁面內容").fill("topic-search-token");

  await expect(panel.getByText("找到 1 段內容")).toBeVisible();
  await panel.locator('[data-openpress-search-result-jump="true"]').first().click();

  await expect(page).toHaveURL(/#page-04$/);
  await expect(page.locator("[data-openpress-current-page]")).toHaveText("04");
  await expect(page.locator("#page-04 p").filter({ hasText: "topic-search-token" })).toHaveClass(/openpress-search-target-pulse/);
  await expect.poll(() => page.evaluate(() => {
    const highlights = (CSS as unknown as { highlights?: Map<string, { size?: number }> }).highlights;
    return highlights?.get("openpress-search-active")?.size ?? 0;
  })).toBeGreaterThan(0);
});

test("opens and closes the public search right panel with keyboard shortcuts", async ({ page }) => {
  await page.goto(PUBLISHED_READER_URL);
  await expectPublishedReader(page);

  const panel = page.locator("[data-openpress-right-panel]");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "false");

  await page.keyboard.press("ControlOrMeta+k");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "true");
  await expect.poll(() => panel.evaluate((element) => getComputedStyle(element).position)).toBe("relative");
  await expect.poll(() => page.evaluate(() => {
    const leftPanel = document.querySelector<HTMLElement>("[data-openpress-left-panel]");
    const rightPanel = document.querySelector<HTMLElement>("[data-openpress-right-panel]");
    if (!leftPanel || !rightPanel) return false;
    const leftStyle = getComputedStyle(leftPanel);
    const rightStyle = getComputedStyle(rightPanel);
    return leftStyle.backgroundColor === rightStyle.backgroundColor
      && leftStyle.color === rightStyle.color
      && leftStyle.fontFamily === rightStyle.fontFamily;
  })).toBe(true);
  await expect.poll(() => page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll<HTMLElement>("[data-openpress-panel-header]"));
    if (headers.length < 2) return false;
    return Math.abs(headers[0].getBoundingClientRect().height - headers[1].getBoundingClientRect().height) < 0.5;
  })).toBe(true);
  const header = panel.locator("[data-openpress-panel-header]");
  await expect(header.getByText("Esc", { exact: true })).toHaveCount(0);
  await expect(header.locator("svg")).toHaveCount(1);
  const input = panel.getByPlaceholder("搜尋頁面內容");
  await expect(input).toBeFocused();
  await expect.poll(() => input.evaluate(hasVisibleBoxShadow)).toBe(false);
  await expect.poll(() => input.evaluate((element) => getComputedStyle(element).borderWidth)).toBe("0px");

  await page.keyboard.press("Escape");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "false");
});

test("wraps search results and cycles through matches in the native right panel", async ({ page }, testInfo) => {
  await page.goto(PUBLISHED_READER_URL);
  await expectPublishedReader(page);

  if (testInfo.project.name === "tablet") {
    await page.locator("[data-openpress-toggle-left-panel]").click();
    await expect(page.locator("[data-openpress-left-panel]")).toHaveAttribute("data-openpress-panel-visible", "true");
  }

  if (testInfo.project.name === "tablet") {
    await page.keyboard.press("ControlOrMeta+k");
  } else {
    await page.getByRole("button", { name: "搜尋文件" }).click();
  }
  const panel = page.locator("[data-openpress-right-panel]");
  await expect(panel).toHaveAttribute("data-openpress-panel-visible", "true");
  await expect(panel.locator("[data-openpress-search-panel]")).toBeVisible();
  if (testInfo.project.name === "tablet") {
    await expect(page.locator("[data-openpress-left-panel]")).toHaveAttribute("data-openpress-panel-visible", "false");
    await expect.poll(() => panel.evaluate((element) => getComputedStyle(element).position)).toBe("relative");
  }

  await panel.getByPlaceholder("搜尋頁面內容").fill("cyclic-search-token");
  await expect(panel.getByText("找到 2 段內容")).toBeVisible();
  await expect(panel.locator("[data-openpress-search-position]")).toHaveText("0 / 2");
  await expect.poll(() => panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  const results = panel.locator("[data-openpress-search-results]");
  await expect.poll(() => results.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  const preview = panel.locator("[data-openpress-search-preview]").first();
  await expect.poll(() => preview.evaluate((element) => getComputedStyle(element).overflowWrap)).toBe("anywhere");
  await expect(panel.getByRole("button", { name: "上一個搜尋結果" }).locator("svg")).toHaveCount(1);
  await expect(panel.getByRole("button", { name: "下一個搜尋結果" }).locator("svg")).toHaveCount(1);
  await expect.poll(() => panel.locator('[data-openpress-search-result-jump="true"]').evaluateAll((elements) => (
    elements.every((element) => element.scrollHeight <= element.clientHeight)
  ))).toBe(true);

  await panel.getByRole("button", { name: "上一個搜尋結果" }).click();
  await expect(panel.locator("[data-openpress-search-position]")).toHaveText("2 / 2");
  await expect(page).toHaveURL(/#page-04$/);

  await panel.getByRole("button", { name: "下一個搜尋結果" }).click();
  await expect(panel.locator("[data-openpress-search-position]")).toHaveText("1 / 2");
  await expect(page).toHaveURL(/#page-02$/);

  await panel.getByRole("button", { name: "上一個搜尋結果" }).click();
  await expect(panel.locator("[data-openpress-search-position]")).toHaveText("2 / 2");
  await expect(panel.locator('[data-active="true"]')).toHaveAttribute("data-openpress-search-match-id", "match-0002");

  const mainBounds = await page.locator("[data-openpress-main-content]").boundingBox();
  const panelBounds = await panel.boundingBox();
  expect((mainBounds?.x ?? 0) + (mainBounds?.width ?? 0)).toBeLessThanOrEqual((panelBounds?.x ?? 0) + 1);
});

test("groups repeated mentions from one rendered context into one search result", async ({ page }) => {
  await page.goto(PUBLISHED_READER_URL);
  await expectPublishedReader(page);

  await page.getByRole("button", { name: "搜尋文件" }).click();
  const panel = page.locator("[data-openpress-right-panel]");
  await panel.getByPlaceholder("搜尋頁面內容").fill("repeated-context-token");

  await expect(panel.getByText("找到 1 段內容，共 3 次命中")).toBeVisible();
  await expect(panel.locator("[data-openpress-search-position]")).toHaveText("0 / 1");
  await expect(panel.locator('[data-openpress-search-result-jump="true"]')).toHaveCount(1);
  await expect(panel.locator("[data-openpress-search-occurrence-count]")).toHaveText("3 次");
  await expect(panel.locator("[data-openpress-search-preview]")).toContainText("repeated-context-token");
  await expect(panel.locator("[data-openpress-search-preview]")).toContainText("appears three ti");

  await panel.getByRole("button", { name: "下一個搜尋結果" }).click();
  await expect(panel.locator("[data-openpress-search-position]")).toHaveText("1 / 1");
  await expect(page).toHaveURL(/#page-04$/);
});

test("keeps editing-only page geometry out of the public toolbar", async ({ page }) => {
  await page.goto(PUBLISHED_READER_URL);
  await expectPublishedReader(page);

  await expect(page.locator("[data-openpress-page-geometry]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "搜尋文件" })).toBeVisible();
});

test("credits open-press outside the document canvas", async ({ page }) => {
  await page.goto(PUBLISHED_READER_URL);
  await expectPublishedReader(page);

  const attribution = page.locator("[data-openpress-attribution]");
  await expect(attribution).toBeVisible();
  await expect(attribution).toHaveAttribute("href", "https://open-press.dev");
  await expect(attribution).toHaveText(/Built with\s*open-press\s*↗/);
  await expect(attribution.evaluate((element) => !element.closest('[data-openpress-public-page="true"]'))).resolves.toBe(true);
});

test("hides PDF actions when the public deployment has no PDF", async ({ page }) => {
  await page.goto(PUBLISHED_READER_URL);
  await expectPublishedReader(page);

  await expect(page.locator("[data-openpress-public-pdf-download]")).toHaveCount(0);
  await expect(page.getByText("PDF 未部署")).toHaveCount(0);
});

test("offers an included public PDF as a download", async ({ page }) => {
  await page.route("**/openpress/deploy.json", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        pdf: "/reader-download.pdf",
        deployed_at: "2026-08-04T00:00:00.000Z",
      }),
    });
  });
  await page.goto(PUBLISHED_READER_URL);
  await expectPublishedReader(page);

  const download = page.locator("[data-openpress-public-pdf-download]");
  await expect(download).toBeVisible();
  await expect(download).toHaveAttribute("aria-label", "下載 PDF");
  await expect(download).toHaveAttribute("href", "/reader-download.pdf");
  await expect(download).toHaveAttribute("download", "");
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
    const stageRect = stage.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    stage.scrollTo({
      top: stage.scrollTop
        + targetRect.top
        + (targetRect.height * 0.4)
        - (stageRect.top + (stageRect.height / 2)),
      behavior: "instant",
    });
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

function hasVisibleBoxShadow(element: Element) {
  const boxShadow = getComputedStyle(element).boxShadow;
  if (boxShadow === "none") return false;
  return (boxShadow.match(/-?\d+(?:\.\d+)?px/g) ?? [])
    .some((value) => Math.abs(Number.parseFloat(value)) > 0);
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
