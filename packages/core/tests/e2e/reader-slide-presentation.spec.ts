import { expect, test } from "@playwright/test";

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
