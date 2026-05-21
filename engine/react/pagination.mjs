import { chromium } from "playwright";
import { DEFAULT_PAGE_SAFE_HEIGHT_PX } from "./pagination-constants.mjs";

const DEFAULT_VIEWPORT = { width: 794, height: 1123 };

export function paginateMeasuredBlocks(measuredBlocks, { pageSafeHeightPx = DEFAULT_PAGE_SAFE_HEIGHT_PX } = {}) {
  const safeHeight = positiveNumber(pageSafeHeightPx, DEFAULT_PAGE_SAFE_HEIGHT_PX);
  const pages = [];
  const warnings = [];
  let currentBlockIds = [];
  let currentHeight = 0;

  for (const block of measuredBlocks ?? []) {
    const id = String(block?.id ?? "");
    if (!id) continue;
    const height = Math.max(0, Number(block.height) || 0);

    if (height > safeHeight) {
      warnings.push({
        code: "block-overflows-page",
        blockId: id,
        height,
        pageSafeHeightPx: safeHeight,
      });
    }

    if (currentBlockIds.length > 0 && currentHeight + height > safeHeight) {
      pages.push(pageRecord(pages.length, currentBlockIds));
      currentBlockIds = [];
      currentHeight = 0;
    }

    currentBlockIds.push(id);
    currentHeight += height;
  }

  if (currentBlockIds.length > 0) {
    pages.push(pageRecord(pages.length, currentBlockIds));
  }

  return { pages, warnings };
}

export async function measureBlocksInChromium({
  html,
  css = "",
  pageSafeHeightPx = DEFAULT_PAGE_SAFE_HEIGHT_PX,
  viewport = DEFAULT_VIEWPORT,
} = {}) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport });
    await page.setContent(measurementDocument(html, css), { waitUntil: "load" });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });
    const measurements = await page.evaluate(() => (
      Array.from(document.querySelectorAll("[data-openpress-block-id]")).map((element) => ({
        id: element.getAttribute("data-openpress-block-id"),
        height: element.getBoundingClientRect().height,
      }))
    ));
    return {
      measurements,
      ...paginateMeasuredBlocks(measurements, { pageSafeHeightPx }),
    };
  } finally {
    await browser.close();
  }
}

function pageRecord(pageIndex, blockIds) {
  return {
    pageIndex,
    blockIds,
    breakAfter: blockIds.at(-1),
  };
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function measurementDocument(html = "", css = "") {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { margin: 0; }
      ${css}
    </style>
  </head>
  <body>${html}</body>
</html>`;
}
