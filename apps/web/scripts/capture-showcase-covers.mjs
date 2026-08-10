import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultOutputDir = resolve(__dirname, "../public/showcase/examples");
const previewOrigin = process.env.OPENPRESS_PREVIEW_ORIGIN ?? "http://127.0.0.1:5173";

const pageTarget = ({ slug, title, url, page, output }) => ({
  slug,
  title,
  url: `${url}#page-${String(page).padStart(2, "0")}`,
  selector: `#page-${String(page).padStart(2, "0")}`,
  output,
});

export const showcasePageTargets = [
  pageTarget({ slug: "user-story-book", title: "OpenPress User Story Book", url: "https://open-press-story.pages.dev/userstory/preview", page: 1, output: "cover.png" }),
  pageTarget({ slug: "user-story-book", title: "OpenPress User Story Book", url: "https://open-press-story.pages.dev/userstory/preview", page: 12, output: "page-12.png" }),
  pageTarget({ slug: "data-structure-notes", title: "Data Structures Course Notes", url: "https://data-structure-note.pages.dev/", page: 1, output: "cover.png" }),
  pageTarget({ slug: "data-structure-notes", title: "Data Structures Course Notes", url: "https://data-structure-note.pages.dev/", page: 8, output: "page-08.png" }),
  pageTarget({ slug: "resume", title: "Fictional Product Engineer Resume", url: `${previewOrigin}/resume/preview`, page: 1, output: "cover.png" }),
  pageTarget({ slug: "resume", title: "Fictional Product Engineer Resume", url: `${previewOrigin}/resume/preview`, page: 2, output: "page-02.png" }),
  pageTarget({ slug: "school-report", title: "Fictional School Report", url: `${previewOrigin}/school-report/preview`, page: 1, output: "cover.png" }),
  pageTarget({ slug: "school-report", title: "Fictional School Report", url: `${previewOrigin}/school-report/preview`, page: 3, output: "page-03.png" }),
  pageTarget({ slug: "financial-report", title: "Fictional Annual Financial Report", url: `${previewOrigin}/financial-report/preview`, page: 1, output: "cover.png" }),
  pageTarget({ slug: "financial-report", title: "Fictional Annual Financial Report", url: `${previewOrigin}/financial-report/preview`, page: 3, output: "page-03.png" }),
  pageTarget({ slug: "financial-report", title: "Fictional Annual Financial Report", url: `${previewOrigin}/financial-report/preview`, page: 4, output: "page-04.png" }),
  pageTarget({ slug: "thesis", title: "Classic Degree Thesis Sample", url: `${previewOrigin}/thesis/preview`, page: 1, output: "cover.png" }),
  pageTarget({ slug: "thesis", title: "Classic Degree Thesis Sample", url: `${previewOrigin}/thesis/preview`, page: 2, output: "page-02.png" }),
  pageTarget({ slug: "thesis", title: "Classic Degree Thesis Sample", url: `${previewOrigin}/thesis/preview`, page: 6, output: "page-06.png" }),
];

export async function captureShowcasePage({
  target,
  browser,
  outputDir = defaultOutputDir,
  viewport = { width: 1440, height: 1800 },
  waitAfterFontsMs = 300,
}) {
  const ownsBrowser = !browser;
  const activeBrowser = browser ?? await chromium.launch();
  const page = await activeBrowser.newPage({ viewport, deviceScaleFactor: 1 });

  try {
    await page.goto(target.url, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForSelector(target.selector, { state: "visible", timeout: 30_000 });
    await page.evaluate(async () => {
      await document.fonts?.ready;
    });
    await page.addStyleTag({
      content: "* { scrollbar-width: none !important; } *::-webkit-scrollbar { display: none !important; }",
    });
    await page.waitForTimeout(waitAfterFontsMs);

    const outputPath = resolve(outputDir, target.slug, target.output);
    await mkdir(dirname(outputPath), { recursive: true });
    await page.locator(target.selector).first().screenshot({
      path: outputPath,
      animations: "disabled",
    });
    return outputPath;
  } finally {
    await page.close();
    if (ownsBrowser) await activeBrowser.close();
  }
}

export async function captureShowcasePages(targets = showcasePageTargets, options = {}) {
  const browser = await chromium.launch();
  const outputs = [];

  try {
    for (const target of targets) {
      outputs.push(await captureShowcasePage({ ...options, browser, target }));
    }
  } finally {
    await browser.close();
  }

  return outputs;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outputs = await captureShowcasePages();
  for (const output of outputs) console.log(output);
}
