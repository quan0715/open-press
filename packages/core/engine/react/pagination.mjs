// Public surface for the pagination engine.
//
// The build-time pipeline has two phases:
//   1. measure: run the rendered HTML through chromium, collect block heights
//      and the page's safe content area (`measureBlocksInChromium` below).
//   2. allocate: pure function that streams blocks into a sequence of
//      `Region`s — see ./pagination/allocator.mjs and ./pagination/regions.mjs.
//
// Single-column pages, multi-column research papers, and newspaper-style
// heterogeneous layouts all share the allocator; only the region stream
// changes. Callers can pass `options.regions` to opt into custom layouts;
// the default is `singleColumnRegionStream`, equivalent to the legacy
// "one safe-height page after another" behavior.

import { chromium } from "playwright";
import {
  DEFAULT_PAGE_SAFE_HEIGHT_PX,
  PAGE_BODY_FIT_SAFETY_MAX_PX,
  PAGE_BODY_FIT_SAFETY_RATIO,
} from "./pagination-constants.mjs";
import { paginateMeasuredBlocks } from "./pagination/allocator.mjs";

export { paginateMeasuredBlocks } from "./pagination/allocator.mjs";
export {
  allocateBlocksToRegions,
  pagesFromRegions,
} from "./pagination/allocator.mjs";
export {
  singleColumnRegionStream,
  multiColumnRegionStream,
  fixedRegionStream,
} from "./pagination/regions.mjs";

const DEFAULT_VIEWPORT = { width: 794, height: 1123 };

export async function measureBlocksInChromium({
  html,
  css = "",
  pageSafeHeightPx,
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
    const safeHeight = positiveNumber(pageSafeHeightPx, null)
      ?? await measurePageSafeHeight(page)
      ?? DEFAULT_PAGE_SAFE_HEIGHT_PX;
    return {
      measurements,
      pageSafeHeightPx: safeHeight,
      ...paginateMeasuredBlocks(measurements, { pageSafeHeightPx: safeHeight }),
    };
  } finally {
    await browser.close();
  }
}

async function measurePageSafeHeight(page) {
  return page.evaluate(({ ratio, maxPx }) => {
    const body = document.querySelector(".reader-page[data-page-kind='content'] .page-body")
      ?? document.querySelector(".reader-page--content .page-body")
      ?? document.querySelector(".page-body");
    if (!body) return null;
    const height = body.getBoundingClientRect().height;
    if (!Number.isFinite(height) || height <= 0) return null;
    const safetyInset = Math.min(maxPx, Math.max(0, height * ratio));
    return Math.max(1, height - safetyInset);
  }, {
    ratio: PAGE_BODY_FIT_SAFETY_RATIO,
    maxPx: PAGE_BODY_FIT_SAFETY_MAX_PX,
  });
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
