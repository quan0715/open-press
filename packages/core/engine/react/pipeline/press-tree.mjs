// Layer 2 — Press Tree Expansion.
//
// SSR-renders the user's Press tree with a PressContext provider that
// supplies resolved sources and (optionally) allocation hints. Output:
//   - rendered HTML (used by Layer 3 for measurement and Layer 5 for final)
//   - extracted frame metadata (frameKey, role, chrome, sequence position)
//   - per-frame MdxArea slots (chainId, sequence index within frame)
//
// Frames are discovered by parsing the rendered HTML for elements with the
// `data-openpress-frame-key` attribute. This works because <Frame> renders
// to a deterministic `<section>` with that attribute set.

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const FRAME_OPEN_RE = /<section\b([^>]*)\bdata-openpress-frame-key="([^"]+)"([^>]*)>/g;
const ATTR_RE = (name) => new RegExp(`\\b${name}="([^"]*)"`);

/**
 * Render the Press tree and extract frame structure.
 *
 * @param {object} opts
 * @param {React.ComponentType} opts.Press        The user's default-exported Press component.
 * @param {object} opts.PressContext              The PressContext from @open-press/core.
 * @param {Record<string, object>} opts.sources   Resolved sources keyed by sourceId.
 * @param {object|null} opts.hints                Allocation hints (or null on first pass).
 * @param {object|null} opts.allocation           FrameAllocation map (or null for measurement).
 * @returns {{ html: string, frames: Array<FrameInstance> }}
 */
export function expandPressTree({ Press: UserPress, PressContext, sources, hints = null, allocation = null }) {
  const html = renderToStaticMarkup(
    React.createElement(
      PressContext.Provider,
      { value: { sources, allocation, hints } },
      React.createElement(UserPress),
    ),
  );

  const frames = extractFrames(html);
  enforceUniqueFrameKeys(frames);
  return { html, frames };
}

function extractFrames(html) {
  const frames = [];
  let match;
  FRAME_OPEN_RE.lastIndex = 0;
  while ((match = FRAME_OPEN_RE.exec(html)) !== null) {
    const attrsBefore = match[1] ?? "";
    const frameKey = match[2];
    const attrsAfter = match[3] ?? "";
    const allAttrs = `${attrsBefore} ${attrsAfter}`;
    const role = pickAttr(allAttrs, "data-frame-role") || undefined;
    const chromeRaw = pickAttr(allAttrs, "data-frame-chrome");
    const chrome = chromeRaw === "false" ? false : true;
    const openIndex = match.index;
    const sectionHtml = sliceSection(html, openIndex);
    const mdxAreas = extractMdxAreas(sectionHtml);
    frames.push({
      frameKey,
      role,
      chrome,
      mdxAreas,
      htmlStart: openIndex,
      htmlEnd: openIndex + sectionHtml.length,
      html: sectionHtml,
    });
  }
  return frames;
}

const MDX_AREA_RE = /<div\b([^>]*)\bdata-openpress-mdx-area="true"([^>]*)>/g;

function extractMdxAreas(sectionHtml) {
  const areas = [];
  let match;
  MDX_AREA_RE.lastIndex = 0;
  while ((match = MDX_AREA_RE.exec(sectionHtml)) !== null) {
    const attrs = `${match[1] ?? ""} ${match[2] ?? ""}`;
    const chainId = pickAttr(attrs, "data-openpress-mdx-area-chain");
    const overflow = pickAttr(attrs, "data-openpress-mdx-area-overflow") || "extend";
    if (!chainId) continue;
    const indexInFrame = areas.filter((a) => a.chainId === chainId).length;
    areas.push({ chainId, overflow, indexInFrame, indexAcrossFrame: areas.length });
  }
  return areas;
}

function pickAttr(attrs, name) {
  const match = ATTR_RE(name).exec(attrs);
  return match ? match[1] : "";
}

// Find the end of a <section> opening at `start`, returning the full
// `<section ...>...</section>` substring. Handles nested <section> elements
// by depth-counting.
function sliceSection(html, start) {
  const sectionOpen = /<section\b[^>]*>/g;
  const sectionClose = /<\/section\s*>/g;
  sectionOpen.lastIndex = start + 1;
  sectionClose.lastIndex = start + 1;
  let depth = 1;
  while (depth > 0) {
    const nextOpen = sectionOpen.exec(html);
    const nextClose = sectionClose.exec(html);
    if (!nextClose) {
      throw new Error(`Unterminated <section> in Press tree HTML near offset ${start}`);
    }
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth += 1;
      sectionClose.lastIndex = nextOpen.index + 1;
      continue;
    }
    depth -= 1;
    if (depth === 0) {
      return html.slice(start, nextClose.index + nextClose[0].length);
    }
    sectionOpen.lastIndex = nextClose.index + 1;
  }
  throw new Error(`Section depth balance bug at offset ${start}`);
}

function enforceUniqueFrameKeys(frames) {
  const seen = new Map();
  for (const frame of frames) {
    if (seen.has(frame.frameKey)) {
      const prior = seen.get(frame.frameKey);
      throw new Error(
        `Duplicate frameKey "${frame.frameKey}" found in Press tree. ` +
          `First seen with role "${prior.role ?? "?"}", second with role "${frame.role ?? "?"}".`,
      );
    }
    seen.set(frame.frameKey, frame);
  }
}
