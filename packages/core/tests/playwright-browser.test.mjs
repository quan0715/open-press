import { test } from "node:test";
import assert from "node:assert/strict";
import { launchMeasurementBrowser } from "../engine/runtime/playwright-browser.mjs";

test("launchMeasurementBrowser falls back to system Chrome when Playwright Chromium is missing", async () => {
  const browser = { close() {} };
  const launches = [];

  const result = await launchMeasurementBrowser({
    launch: async (options) => {
      launches.push(options);
      if (launches.length === 1) {
        throw new Error("browserType.launch: Executable doesn't exist at /cache/ms-playwright/chromium-1223");
      }
      return browser;
    },
    resolveSystemChrome: () => "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });

  assert.equal(result, browser);
  assert.deepEqual(launches, [undefined, {
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  }]);
});

test("launchMeasurementBrowser preserves unrelated launch failures", async () => {
  let resolvedSystemChrome = false;
  await assert.rejects(
    launchMeasurementBrowser({
      launch: async () => {
        throw new Error("Chromium crashed during startup");
      },
      resolveSystemChrome: () => {
        resolvedSystemChrome = true;
        return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
      },
    }),
    /Chromium crashed during startup/,
  );
  assert.equal(resolvedSystemChrome, false);
});

test("launchMeasurementBrowser gives package-manager-safe install guidance when no browser is available", async () => {
  await assert.rejects(
    launchMeasurementBrowser({
      launch: async () => {
        throw new Error("browserType.launch: Executable doesn't exist at /cache/ms-playwright/chromium-1223");
      },
      resolveSystemChrome: () => {
        throw new Error("Cannot locate a Chrome / Chromium executable on darwin.");
      },
    }),
    (error) => {
      assert.match(error.message, /OpenPress needs Chromium for layout measurement/);
      assert.match(error.message, /pnpm --filter @open-press\/core exec playwright install --only-shell chromium/);
      assert.match(error.message, /npm exec -- playwright install --only-shell chromium/);
      return true;
    },
  );
});
