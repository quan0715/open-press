import { expect, test } from "@playwright/test";

const PUBLISHED_SLIDES_URL = `http://reader.localhost:${process.env.OPENPRESS_E2E_PORT ?? "5195"}/slides/preview`;

test("credits open-press in the public slide chrome, not the slide canvas", async ({ page }) => {
  await page.goto(PUBLISHED_SLIDES_URL);

  const attribution = page.locator("[data-openpress-attribution]");
  await expect(attribution).toBeVisible();
  await expect(attribution).toHaveAttribute("href", "https://open-press.dev");
  await expect(attribution.evaluate((element) => !element.closest('[data-openpress-public-page="true"]'))).resolves.toBe(true);
});

test("F enters fullscreen on the dedicated presentation route without intercepting editable targets", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Presentation hotkey behavior only needs one browser profile");
  await page.addInitScript(() => {
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      value: () => Promise.resolve(),
    });
  });
  await page.goto("/slides/present");

  const presenter = page.locator("[data-openpress-slide-presenter]");
  await expect(presenter).toHaveAttribute("data-openpress-present-ui", "chrome");

  await page.evaluate(() => {
    const input = document.createElement("input");
    input.setAttribute("aria-label", "Presentation hotkey guard");
    document.body.append(input);
    input.focus();
  });
  await page.keyboard.press("f");
  await expect(presenter).toHaveAttribute("data-openpress-present-ui", "chrome");

  await page.locator('[aria-label="Presentation hotkey guard"]').blur();
  await page.keyboard.press("f");
  await expect(presenter).toHaveAttribute("data-openpress-present-ui", "immersive");
});
