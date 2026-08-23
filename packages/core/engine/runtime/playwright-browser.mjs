import { chromium } from "playwright";
import { resolveChromePath } from "../output/chrome-pdf.mjs";

const PLAYWRIGHT_INSTALL_GUIDANCE = [
  "OpenPress needs Chromium for layout measurement.",
  "Install the browser revision used by your installed OpenPress package, then retry:",
  "  npm exec -- playwright install --only-shell chromium",
  "Framework contributors using pnpm should run:",
  "  pnpm --filter @open-press/core exec playwright install --only-shell chromium",
].join("\n");

export async function launchMeasurementBrowser({
  launch = (options) => chromium.launch(options),
  resolveSystemChrome = resolveChromePath,
} = {}) {
  try {
    return await launch();
  } catch (error) {
    if (!isMissingPlaywrightBrowser(error)) throw error;

    let executablePath;
    try {
      executablePath = resolveSystemChrome();
    } catch (systemChromeError) {
      throw new Error(
        `${PLAYWRIGHT_INSTALL_GUIDANCE}\n\n${errorMessage(systemChromeError)}`,
        { cause: error },
      );
    }

    try {
      return await launch({ executablePath });
    } catch (systemLaunchError) {
      throw new Error(
        `${PLAYWRIGHT_INSTALL_GUIDANCE}\n\nSystem Chrome fallback failed: ${errorMessage(systemLaunchError)}`,
        { cause: error },
      );
    }
  }
}

function isMissingPlaywrightBrowser(error) {
  const message = errorMessage(error);
  return message.includes("Executable doesn't exist") || message.includes("playwright install");
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
