// Layer 3 — Frame Measurement.
//
// Renders the Press tree (from Layer 2) plus a hidden "blocks zone" that
// contains every chain's full content, sends the combined document to
// Chromium, then queries the DOM for:
//   - MdxArea capacities (per frameKey + chainId + indexInFrame)
//   - Block heights (per chainId + blockId)
//
// The blocks zone uses the same `.page-body` CSS context as the live
// frames so widths and font metrics match.

import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "playwright";
import { compileChainBlocks } from "../sources/mdx-resolver.mjs";

const DEFAULT_VIEWPORT = { width: 794, height: 1123 };

// Safety inset applied to measured MdxArea capacities. Mirrors the legacy
// pagination's safe-height clamp (8% of body, max 96px). Without this,
// content that visually fits "exactly" still overflows due to anti-aliasing,
// line breaks, and rounding.
const CAPACITY_SAFETY_RATIO = 0.08;
const CAPACITY_SAFETY_MAX_PX = 96;

/**
 * @param {object} opts
 * @param {string} opts.pressHtml   Rendered Press tree HTML (Layer 2).
 * @param {Record<string, object>} opts.sources Resolved sources keyed by sourceId.
 * @param {Map<string, object>} opts.renderRegistry Internal render data per sourceId.
 * @param {string} opts.css         Combined CSS for measurement context.
 * @param {{width:number,height:number}=} opts.viewport
 */
export async function measureFrames({ pressHtml, sources, renderRegistry, css = "", viewport = DEFAULT_VIEWPORT }) {
  const chainContent = await buildChainContent(sources, renderRegistry);
  const html = buildMeasurementDocument({ pressHtml, chainContent, css });
  return runChromiumMeasurement(html, viewport);
}

async function buildChainContent(sources, renderRegistry) {
  const out = new Map();
  for (const source of Object.values(sources)) {
    for (const [chainId, blocks] of Object.entries(source.chains)) {
      const blockIds = blocks.map((b) => b.id);
      const renderData = renderRegistry.get(source.id);
      const compiled = await compileChainBlocks({ renderData, chainId, blockIds });
      const html = compiled
        .map(({ Content }, idx) => renderToStaticMarkup(React.createElement(Content, { key: idx })))
        .join("");
      out.set(chainId, html);
    }
  }
  return out;
}

function buildMeasurementDocument({ pressHtml, chainContent, css }) {
  const blocksZone = [...chainContent.entries()]
    .map(([chainId, contentHtml]) => `
      <section class="reader-page reader-page--content" data-openpress-measure-frame="${escapeAttr(chainId)}" data-page-kind="content">
        <div class="page-frame">
          <main class="page-body">
            <div data-block-measurement-chain="${escapeAttr(chainId)}" style="overflow: visible;">
              ${contentHtml}
            </div>
          </main>
        </div>
      </section>
    `)
    .join("\n");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { margin: 0; }
      /* Reader-page is hidden by default in the workspace theme (only the
         is-active page is shown). Override visibility in measurement zones
         but do not touch the page-frame display, because the theme uses
         CSS grid with grid-template-rows reserving page-header and
         page-footer space; we must preserve that layout so MdxArea
         inherits the real page-body cell height. */
      [data-openpress-frames-zone] .reader-page,
      [data-openpress-blocks-zone] .reader-page {
        display: block !important;
      }
      /* MdxArea fills its grid/flex parent so we measure the layout slot,
         not the inserted content. */
      [data-openpress-mdx-area="true"] {
        display: block;
        box-sizing: border-box;
        height: 100%;
        align-self: stretch;
        overflow: visible;
      }
      [data-openpress-frames-zone] { position: relative; }
      [data-openpress-blocks-zone] { position: fixed; left: -200000px; top: 0; visibility: hidden; pointer-events: none; }
      ${css}
    </style>
  </head>
  <body>
    <div data-openpress-frames-zone>${pressHtml}</div>
    <div data-openpress-blocks-zone>${blocksZone}</div>
  </body>
</html>`;
}

async function runChromiumMeasurement(html, viewport) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });

    const mdxAreas = await page.evaluate((safety) => {
      const zone = document.querySelector("[data-openpress-frames-zone]");
      if (!zone) return [];
      const areas = Array.from(zone.querySelectorAll("[data-openpress-mdx-area]"));
      const out = [];
      for (const el of areas) {
        const frame = el.closest("[data-openpress-frame-key]");
        if (!frame) continue;
        const frameKey = frame.getAttribute("data-openpress-frame-key") || "";
        const chainId = el.getAttribute("data-openpress-mdx-area-chain") || "";
        const overflow = el.getAttribute("data-openpress-mdx-area-overflow") || "extend";
        // Index within this frame's same-chain areas
        const sameInFrame = Array.from(frame.querySelectorAll(`[data-openpress-mdx-area][data-openpress-mdx-area-chain="${chainId}"]`));
        const indexInFrame = sameInFrame.indexOf(el);
        const rect = el.getBoundingClientRect();
        const inset = Math.min(safety.maxPx, Math.max(0, rect.height * safety.ratio));
        const capacity = Math.max(1, rect.height - inset);
        out.push({
          frameKey,
          chainId,
          overflow,
          indexInFrame,
          capacity,
          rawHeight: rect.height,
          width: rect.width,
        });
      }
      return out;
    }, { ratio: CAPACITY_SAFETY_RATIO, maxPx: CAPACITY_SAFETY_MAX_PX });

    const blockHeights = await page.evaluate(() => {
      const zone = document.querySelector("[data-openpress-blocks-zone]");
      if (!zone) return [];
      return Array.from(zone.querySelectorAll("[data-openpress-block-id]")).map((el) => {
        const chain = el.closest("[data-block-measurement-chain]");
        return {
          id: el.getAttribute("data-openpress-block-id"),
          height: el.getBoundingClientRect().height,
          chainId: chain?.getAttribute("data-block-measurement-chain") ?? "",
        };
      });
    });

    return { mdxAreas, blockHeights };
  } finally {
    await browser.close();
  }
}

function escapeAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
