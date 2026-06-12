import { defineConfig } from "@playwright/test";

const port = process.env.OPENPRESS_E2E_PORT ?? "5195";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /reader-.*\.spec\.ts/,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    browserName: "chromium",
    baseURL,
  },
  projects: [
    {
      name: "desktop",
      use: {
        hasTouch: false,
        isMobile: false,
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: "tablet",
      use: {
        hasTouch: true,
        isMobile: true,
        viewport: { width: 820, height: 1180 },
      },
    },
  ],
  webServer: {
    command: `env -u FORCE_COLOR node engine/cli.mjs dev tests/fixtures/e2e-reader --renderer react --host 127.0.0.1 --port ${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: `${baseURL}/`,
  },
});
