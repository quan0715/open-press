import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /reader-navigation\.spec\.ts/,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: "http://127.0.0.1:5175",
    browserName: "chromium",
    hasTouch: true,
    isMobile: true,
    viewport: { width: 820, height: 1180 },
  },
  webServer: {
    command: "env -u FORCE_COLOR node engine/cli.mjs dev tests/fixtures/e2e-reader --renderer react --host 127.0.0.1 --port 5175",
    reuseExistingServer: false,
    timeout: 120_000,
    url: "http://127.0.0.1:5175/",
  },
});
