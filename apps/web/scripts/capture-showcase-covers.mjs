import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultOutputDir = resolve(__dirname, "../public/showcase");

export const showcaseCoverTargets = [
  {
    title: "OpenPress User Story Book",
    url: "https://open-press-story.pages.dev/#page-01",
    selector: "#page-01",
    output: "openpress-user-story-book.png",
  },
  {
    title: "資料結構筆記",
    url: "https://data-structure-note.pages.dev/#page-01",
    selector: "#page-01",
    output: "data-structure-notes.png",
  },
  {
    title: "Academic Paper Skill Pack",
    url: "https://academic-paper-skill-pack-demo.pages.dev/#page-01",
    selector: "#page-01",
    output: "academic-paper-skill-pack-demo.png",
  },
];

export async function captureShowcaseCover({
  target,
  browser,
  outputDir = defaultOutputDir,
  viewport = { width: 1440, height: 1800 },
  waitAfterFontsMs = 1000,
}) {
  const ownsBrowser = !browser;
  const activeBrowser = browser ?? await chromium.launch();
  const page = await activeBrowser.newPage({
    viewport,
    deviceScaleFactor: 1,
  });

  try {
    await page.goto(target.url, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.waitForSelector(target.selector, {
      state: "visible",
      timeout: 30_000,
    });
    await page.evaluate(async () => {
      await document.fonts?.ready;
    });
    await page.waitForTimeout(waitAfterFontsMs);

    const outputPath = resolve(outputDir, target.output);
    await mkdir(dirname(outputPath), { recursive: true });
    await page.locator(target.selector).first().screenshot({
      path: outputPath,
      animations: "disabled",
    });

    return outputPath;
  } finally {
    await page.close();
    if (ownsBrowser) {
      await activeBrowser.close();
    }
  }
}

export async function captureShowcaseCovers(
  targets = showcaseCoverTargets,
  options = {},
) {
  const browser = await chromium.launch();
  const outputs = [];

  try {
    for (const target of targets) {
      outputs.push(await captureShowcaseCover({ ...options, browser, target }));
    }
  } finally {
    await browser.close();
  }

  return outputs;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outputs = await captureShowcaseCovers();
  for (const output of outputs) {
    console.log(output);
  }
}
