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

import fs from "node:fs/promises";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "playwright";
import { createCaptionNumberingState, numberCaptionsInHtml } from "../caption-numbering.mjs";
import { compileChainBlocks } from "../sources/mdx-resolver.mjs";

const DEFAULT_VIEWPORT = { width: 794, height: 1123 };
const MEASUREMENT_PAGE_CHROME_CSS = `
      [data-openpress-frames-zone] .page-frame,
      [data-openpress-blocks-zone] .page-frame {
        position: absolute;
        inset: 0;
        width: auto;
        height: auto;
        min-height: inherit;
        display: grid;
        grid-template-rows: var(--page-header-height) minmax(0, 1fr) var(--page-footer-height);
        row-gap: var(--page-frame-gap);
        padding: var(--page-margin-top) var(--page-margin-right) var(--page-margin-bottom) var(--page-margin-left);
        background: var(--openpress-color-document);
      }
      [data-openpress-frames-zone] .reader-page.no-footer .page-frame,
      [data-openpress-blocks-zone] .reader-page.no-footer .page-frame {
        grid-template-rows: var(--page-header-height) minmax(0, 1fr);
      }
      [data-openpress-frames-zone] .reader-page.no-footer .page-footer,
      [data-openpress-blocks-zone] .reader-page.no-footer .page-footer {
        display: none;
      }
      [data-openpress-frames-zone] .page-body,
      [data-openpress-blocks-zone] .page-body {
        grid-row: 2;
        min-width: 0;
        min-height: 0;
        overflow: visible;
      }`;

// Safety inset applied to measured MdxArea capacities. A small reserve keeps
// content that visually fits "exactly" from clipping due to anti-aliasing,
// line breaks, and rounding.
const CAPACITY_SAFETY_RATIO = 0.04;
const CAPACITY_SAFETY_MAX_PX = 96;

/**
 * @param {object} opts
 * @param {string} opts.pressHtml   Rendered Press tree HTML (Layer 2).
 * @param {Record<string, object>} opts.sources Resolved sources keyed by sourceId.
 * @param {Map<string, object>} opts.renderRegistry Internal render data per sourceId.
 * @param {string} opts.css         Combined CSS for measurement context.
 * @param {string=} opts.baseHref   Base URL for relative media paths in MDX.
 * @param {string|string[]=} opts.mediaDir  Local media roots for inlining /openpress/media/* assets.
 * @param {object=} opts.captionNumbering Caption label formatter options.
 * @param {{width:number,height:number}=} opts.viewport
 */
export async function measureFrames({
  pressHtml,
  sources,
  renderRegistry,
  css = "",
  baseHref = "",
  mediaDir = "",
  captionNumbering = {},
  viewport = DEFAULT_VIEWPORT,
}) {
  const chainContent = await buildChainContent(sources, renderRegistry, captionNumbering);
  const html = await buildMeasurementDocument({ pressHtml, chainContent, css, baseHref, mediaDir });
  return runChromiumMeasurement(html, viewport);
}

async function buildChainContent(sources, renderRegistry, captionNumbering) {
  const out = new Map();
  const captionState = createCaptionNumberingState();
  for (const source of Object.values(sources)) {
    for (const [chainId, blocks] of Object.entries(source.chains)) {
      const blockIds = blocks.map((b) => b.id);
      const renderData = renderRegistry.get(source.id);
      const compiled = await compileChainBlocks({ renderData, chainId, blockIds });
      const html = compiled
        .map(({ Content }, idx) => renderToStaticMarkup(React.createElement(Content, { key: idx })))
        .join("");
      out.set(
        chainId,
        chainId.startsWith("toc:") ? html : numberCaptionsInHtml(html, captionNumbering, captionState),
      );
    }
  }
  return out;
}

async function buildMeasurementDocument({ pressHtml, chainContent, css, baseHref, mediaDir }) {
  const normalizedPressHtml = await inlineMeasurementMediaUrls(pressHtml, mediaDir);
  const areaClassByChain = mdxAreaClassNamesByChain(normalizedPressHtml);
  const blocksZoneParts = [];
  for (const [chainId, contentHtml] of chainContent.entries()) {
    const normalizedContentHtml = await inlineMeasurementMediaUrls(contentHtml, mediaDir);
    const containerTag = chainId.startsWith("toc:") ? "ol" : "div";
    const areaClass = areaClassByChain.get(chainId) ?? "";
    const classNames = [
      chainId.startsWith("toc:") ? "toc-list" : "",
      areaClass,
    ].filter(Boolean).join(" ");
    const containerClass = classNames ? ` class="${classNames}"` : "";
    blocksZoneParts.push(`
      <section class="reader-page reader-page--content" data-openpress-measure-frame="${escapeAttr(chainId)}" data-page-kind="content">
        <div class="page-frame">
          <main class="page-body">
            <${containerTag}${containerClass} data-block-measurement-chain="${escapeAttr(chainId)}" style="overflow: visible;">
              ${normalizedContentHtml}
            </${containerTag}>
          </main>
        </div>
      </section>
    `);
  }
  const blocksZone = blocksZoneParts.join("\n");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    ${baseHref ? `<base href="${escapeAttr(baseHref)}">` : ""}
    <style>
      body { margin: 0; }
      /* Measurement does not load the compiled Tailwind utility bundle.
         Keep the page chrome contract local to this document so MdxArea
         capacities and block heights still match React pages after the
         runtime page-frame CSS is reduced. */
      ${MEASUREMENT_PAGE_CHROME_CSS}
      ${css}
      /* Reader-page is hidden by default in the workspace theme (only the
         is-active page is shown). Override visibility in measurement zones
         after applying the measurement-local page chrome shim. */
      [data-openpress-frames-zone] .reader-page,
      [data-openpress-blocks-zone] .reader-page {
        display: block !important;
      }
      /* MdxArea fills its grid/flex parent so we measure the layout slot,
         not the inserted content. */
      [data-openpress-frames-zone] [data-openpress-mdx-area="true"] {
        display: block;
        box-sizing: border-box;
        min-height: 0;
        align-self: stretch;
        overflow: visible;
      }
      [data-openpress-frames-zone] { position: relative; }
      [data-openpress-blocks-zone] { position: fixed; left: -200000px; top: 0; visibility: hidden; pointer-events: none; }
    </style>
  </head>
  <body>
    <div data-openpress-frames-zone>${normalizedPressHtml}</div>
    <div data-openpress-blocks-zone>${blocksZone}</div>
  </body>
</html>`;
}

function mdxAreaClassNamesByChain(pressHtml) {
  const out = new Map();
  for (const match of String(pressHtml ?? "").matchAll(/<([a-z][a-z0-9-]*)\b[^>]*data-openpress-mdx-area="true"[^>]*>/gi)) {
    const tag = match[0];
    const chainId = htmlAttrValue(tag, "data-openpress-mdx-area-chain");
    if (!chainId || out.has(chainId)) continue;
    const className = htmlAttrValue(tag, "class");
    if (className) out.set(chainId, className);
  }
  return out;
}

function htmlAttrValue(tag, name) {
  const pattern = new RegExp(`\\b${name}=(["'])(.*?)\\1`, "i");
  const match = pattern.exec(tag);
  return match ? match[2] : "";
}

async function runChromiumMeasurement(html, viewport) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport });
    await page.setContent(html, { waitUntil: "load" });
    // Match the print-ready settle: fonts first (font metrics affect image
    // alt-text placeholder boxes), then await every image's `complete` AND
    // `decode()` so intrinsic sizes are committed before layout, then two
    // animation frames so the chromium layout pass observes the final box
    // model. Without this, `getBoundingClientRect()` on figures that hold
    // images can race the decode and return collapsed heights, causing the
    // allocator to pack too many blocks per page.
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      await Promise.all(Array.from(document.images).map(async (img) => {
        if (!img.complete) {
          await new Promise((resolve) => {
            const settle = () => {
              img.removeEventListener("load", settle);
              img.removeEventListener("error", settle);
              resolve(undefined);
            };
            img.addEventListener("load", settle, { once: true });
            img.addEventListener("error", settle, { once: true });
          });
        }
        await img.decode?.().catch(() => undefined);
      }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
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
        const rect = measuredMdxAreaRect(el);
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

      function measuredMdxAreaRect(el) {
        const rect = el.getBoundingClientRect();
        if (rect.height > 1) return rect;
        const candidates = [
          el.parentElement,
          el.closest(".page-body"),
          el.closest("[data-openpress-frame-key]")?.querySelector(".page-body"),
        ];
        for (const candidate of candidates) {
          if (!candidate) continue;
          const alternateRect = candidate.getBoundingClientRect();
          if (alternateRect.height > rect.height) {
            return {
              height: alternateRect.height,
              width: rect.width > 0 ? rect.width : alternateRect.width,
            };
          }
        }
        return rect;
      }
    }, { ratio: CAPACITY_SAFETY_RATIO, maxPx: CAPACITY_SAFETY_MAX_PX });

    const blockHeights = await page.evaluate(() => {
      const zone = document.querySelector("[data-openpress-blocks-zone]");
      if (!zone) return [];
      const out = [];
      for (const chain of zone.querySelectorAll("[data-block-measurement-chain]")) {
        const chainId = chain.getAttribute("data-block-measurement-chain") ?? "";
        const parentTop = chain.parentElement?.getBoundingClientRect().top ?? chain.getBoundingClientRect().top;
        let previousBottom = parentTop;
        for (const el of Array.from(chain.querySelectorAll("[data-openpress-block-id]"))) {
          if (el.tagName.toLowerCase() === "caption") continue;
          if (el.getAttribute("data-openpress-block-layout") === "attached") continue;
          // Cells inherit their row's block-id so the inspector can resolve a
          // SourceBlock when clicking inside a <td>. Skip them here so the
          // row's measured height isn't overwritten by each cell.
          if (el.getAttribute("data-openpress-inherited-block-id") === "true") continue;
          const rect = el.getBoundingClientRect();
          out.push({
            id: el.getAttribute("data-openpress-block-id"),
            height: Math.max(rect.height, rect.bottom - previousBottom),
            chainId,
          });
          previousBottom = Math.max(previousBottom, rect.bottom);
        }
      }
      return out;
    });

    return { mdxAreas, blockHeights };
  } finally {
    await browser.close();
  }
}

function escapeAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

async function inlineMeasurementMediaUrls(html, mediaDir) {
  const mediaRoots = mediaRootList(mediaDir);
  if (mediaRoots.length === 0 || !html) return html;
  let out = String(html);
  const matches = new Set();
  for (const match of out.matchAll(/\bsrc=(['"])([^\1]*?)\1/g)) {
    const src = match[2];
    if (!src) continue;
    if (src.startsWith('/openpress/media/')) {
      matches.add(src.slice('/openpress/media/'.length));
      continue;
    }
    if (src.startsWith('media/')) {
      matches.add(src.slice('media/'.length));
      continue;
    }
    if (src.startsWith('./media/')) {
      matches.add(src.slice('./media/'.length));
    }
  }
  for (const rawName of matches) {
    const dataUrl = await mediaDataUrl(mediaRoots, rawName);
    if (!dataUrl) continue;
    out = out.replaceAll(`/openpress/media/${rawName}`, dataUrl);
    out = out.replaceAll(`media/${rawName}`, dataUrl);
    out = out.replaceAll(`./media/${rawName}`, dataUrl);
  }
  return out;
}

async function mediaDataUrl(mediaRoots, rawName) {
  let fileName;
  try {
    fileName = decodeURIComponent(String(rawName));
  } catch {
    fileName = String(rawName);
  }
  if (!fileName || fileName !== path.basename(fileName)) return null;
  for (const mediaDir of mediaRoots) {
    const filePath = path.join(mediaDir, fileName);
    let bytes;
    try {
      bytes = await fs.readFile(filePath);
    } catch {
      continue;
    }
    return `data:${mediaMimeType(fileName)};base64,${bytes.toString("base64")}`;
  }
  return null;
}

function mediaRootList(mediaDir) {
  const raw = Array.isArray(mediaDir) ? mediaDir : [mediaDir];
  const roots = [];
  const seen = new Set();
  for (const candidate of raw) {
    if (!candidate) continue;
    const normalized = path.resolve(candidate);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    roots.push(normalized);
  }
  return roots;
}

function mediaMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}
