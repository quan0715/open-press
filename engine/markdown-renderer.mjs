import fs from "node:fs/promises";
import path from "node:path";
import MarkdownIt from "markdown-it";
import { renderQDocComponents } from "./component-renderer.mjs";

const CAPTION_NUMBER_VALUE_RE = "[0-9０-９一二三四五六七八九十百千零〇ㄧ]+";

export async function renderMarkdown(body, root) {
  const md = new MarkdownIt({ html: true, linkify: false, typographer: false });
  const preparedBody = await renderQDocComponents(prepareTableCaptionMarkers(body), root);
  let htmlOut = md.render(preparedBody);
  htmlOut = applyTableCaptionMarkers(htmlOut);
  htmlOut = applyTableNumericClass(htmlOut);
  htmlOut = collapseImageParagraphs(htmlOut);
  htmlOut = await addImageDimensions(htmlOut, root);
  return htmlOut;
}

function prepareTableCaptionMarkers(body) {
  const lines = body.split(/\r?\n/);
  const prepared = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const marker = line.match(new RegExp(`^\\s*表\\s*(?:${CAPTION_NUMBER_VALUE_RE})?\\s*[：:、.．]\\s*(.+?)\\s*$`));
    if (marker) {
      let tableIndex = i + 1;
      while (tableIndex < lines.length && !lines[tableIndex].trim()) tableIndex += 1;
      if (isMarkdownTableStart(lines, tableIndex)) {
        prepared.push(`<p data-table-caption="${escapeAttr(marker[1].trim())}"></p>`);
        prepared.push("");
        i += 1;
        continue;
      }
    }
    prepared.push(line);
    i += 1;
  }
  return prepared.join("\n");
}

function isMarkdownTableSeparator(line) {
  const cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isMarkdownTableStart(lines, index) {
  return index + 1 < lines.length && lines[index].trim().startsWith("|") && isMarkdownTableSeparator(lines[index + 1]);
}

function applyTableCaptionMarkers(htmlOut) {
  const marker = /<p data-table-caption="(?<title>[^"]*)"><\/p>\s*(?<tableOpen><table\b[^>]*>)/gs;
  htmlOut = htmlOut.replace(marker, (_match, title, tableOpen) => `${tableOpen}\n<caption>${stripCaptionPrefix(title, "表")}</caption>`);
  const paragraph = new RegExp(
    `<p>\\s*(?<title>表\\s*(?:${CAPTION_NUMBER_VALUE_RE})?\\s*[：:、.．].*?)\\s*<\\/p>\\s*(?<tableOpen><table\\b[^>]*>)`,
    "gs",
  );
  return htmlOut.replace(paragraph, (_match, title, tableOpen) => `${tableOpen}\n<caption>${stripCaptionPrefix(title, "表")}</caption>`);
}

function applyTableNumericClass(htmlOut) {
  return htmlOut.replace(/<table[\s\S]*?<\/table>/gi, (table) => (
    table
      .replace(/(<t[hd])([^>]*?)\s+style="text-align:\s*right;?"/gi, '$1$2 class="numeric"')
      .replace(/(<t[hd])\s+class="([^"]*)"(\s+class="numeric")/gi, '$1 class="$2 numeric"')
  ));
}

function collapseImageParagraphs(htmlOut) {
  return htmlOut.replace(/<p>(<img\s[^>]+>)<\/p>/gi, (_match, imgTag) => {
    const title = imgTag.match(/title="([^"]+)"/i);
    if (!title) return `<figure>${imgTag}</figure>`;
    const imgNoTitle = imgTag.replace(/\s+title="[^"]+"/i, "");
    return `<figure>${imgNoTitle}<figcaption>${title[1]}</figcaption></figure>`;
  });
}

async function addImageDimensions(htmlOut, root) {
  const imgMatches = [...htmlOut.matchAll(/<img\b[^>]*>/gi)];
  let output = "";
  let lastEnd = 0;
  for (const match of imgMatches) {
    output += htmlOut.slice(lastEnd, match.index);
    output += await addDimensionsToImageTag(match[0], root);
    lastEnd = match.index + match[0].length;
  }
  output += htmlOut.slice(lastEnd);
  return output;
}

async function addDimensionsToImageTag(tag, root) {
  if (/\swidth=/i.test(tag) && /\sheight=/i.test(tag)) return tag;
  const src = tag.match(/\ssrc="([^"]+)"/i);
  if (!src) return tag;
  const imgPath = imagePathFromSrc(src[1], root);
  if (!imgPath) return tag;
  const dimensions = await readImageDimensions(imgPath);
  if (!dimensions) return tag;
  const [width, height] = dimensions;
  if (tag.trimEnd().endsWith("/>")) {
    return `${tag.trimEnd().slice(0, -2).trimEnd()} width="${width}" height="${height}" />`;
  }
  return `${tag.trimEnd().slice(0, -1).trimEnd()} width="${width}" height="${height}">`;
}

function imagePathFromSrc(src, root) {
  if (/^[a-z]+:\/\//i.test(src) || src.startsWith("//")) return null;
  const clean = decodeURIComponent(src.split("?")[0].split("#")[0]);
  if (!clean) return null;
  const candidate = path.resolve(root, clean);
  return candidate.startsWith(root) ? candidate : null;
}

async function readImageDimensions(imgPath) {
  let data;
  try {
    data = await fs.readFile(imgPath);
  } catch {
    return null;
  }

  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) && data.length >= 24) {
    return [data.readUInt32BE(16), data.readUInt32BE(20)];
  }

  if ((data.subarray(0, 6).toString() === "GIF87a" || data.subarray(0, 6).toString() === "GIF89a") && data.length >= 10) {
    return [data.readUInt16LE(6), data.readUInt16LE(8)];
  }

  if (!(data[0] === 0xff && data[1] === 0xd8)) return null;
  const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let i = 2;
  while (i + 3 < data.length) {
    if (data[i] !== 0xff) {
      i += 1;
      continue;
    }
    while (i < data.length && data[i] === 0xff) i += 1;
    if (i >= data.length) return null;
    const marker = data[i];
    i += 1;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (i + 2 > data.length) return null;
    const segmentLength = data.readUInt16BE(i);
    if (segmentLength < 2 || i + segmentLength > data.length) return null;
    if (sofMarkers.has(marker) && segmentLength >= 7) {
      return [data.readUInt16BE(i + 5), data.readUInt16BE(i + 3)];
    }
    i += segmentLength;
  }
  return null;
}

export function normalizeFigureTableNumbering(htmlOut) {
  const excludedRanges = [
    ...elementRangesWithClass(htmlOut, "section", "cover"),
    ...elementRangesWithClass(htmlOut, "section", "back-cover"),
    ...elementRangesWithClass(htmlOut, "div", "partner-logo-bar"),
  ];
  let figureCount = 0;
  let tableCount = 0;
  let output = "";
  let lastEnd = 0;

  for (const match of htmlOut.matchAll(/<figure\b[\s\S]*?<\/figure>|<table\b[\s\S]*?<\/table>/gi)) {
    output += htmlOut.slice(lastEnd, match.index);
    const block = match[0];
    const opening = block.match(/^<(figure|table)\b[^>]*>/i);
    if (!opening) {
      output += block;
      lastEnd = match.index + block.length;
      continue;
    }
    const tag = opening[1].toLowerCase();
    if (tag === "figure") {
      if (isInRanges(match.index, excludedRanges) || hasClass(opening[0], "partner-logo-card")) {
        output += block;
      } else {
        figureCount += 1;
        output += rewriteFigureCaption(block, figureCount);
      }
    } else {
      tableCount += 1;
      output += rewriteTableCaption(block, tableCount);
    }
    lastEnd = match.index + block.length;
  }
  output += htmlOut.slice(lastEnd);
  return output;
}

function stripCaptionPrefix(value, label) {
  let result = String(value ?? "").trim();
  result = result.replace(new RegExp(`^\\s*${label}\\s*(?:${CAPTION_NUMBER_VALUE_RE})?\\s*[：:、.．]\\s*`), "");
  result = result.replace(new RegExp(`^\\s*${label}\\s+(?:${CAPTION_NUMBER_VALUE_RE}\\s*)?`), "");
  return result.trim();
}

function numberedCaption(label, index, rawCaption = "") {
  const title = stripCaptionPrefix(rawCaption, label);
  return title ? `${label} ${index}：${title}` : `${label} ${index}`;
}

function rewriteFigureCaption(block, index) {
  const caption = block.match(/(<figcaption\b[^>]*>)([\s\S]*?)(<\/figcaption>)/i);
  if (caption) {
    return `${block.slice(0, caption.index)}${caption[1]}${numberedCaption("圖", index, caption[2])}${caption[3]}${block.slice(caption.index + caption[0].length)}`;
  }
  const opening = block.match(/^<figure\b[^>]*>/i);
  if (!opening) return block;
  return `${block.slice(0, opening[0].length)}<figcaption>${numberedCaption("圖", index)}</figcaption>${block.slice(opening[0].length)}`;
}

function rewriteTableCaption(block, index) {
  const caption = block.match(/(<caption\b[^>]*>)([\s\S]*?)(<\/caption>)/i);
  if (caption) {
    return `${block.slice(0, caption.index)}${caption[1]}${numberedCaption("表", index, caption[2])}${caption[3]}${block.slice(caption.index + caption[0].length)}`;
  }
  const opening = block.match(/^<table\b[^>]*>/i);
  if (!opening) return block;
  return `${block.slice(0, opening[0].length)}\n<caption>${numberedCaption("表", index)}</caption>${block.slice(opening[0].length)}`;
}

function elementRangesWithClass(htmlOut, tag, className) {
  const ranges = [];
  const pattern = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
  for (const match of htmlOut.matchAll(pattern)) {
    const opening = match[0].match(new RegExp(`^<${tag}\\b[^>]*>`, "i"));
    if (opening && hasClass(opening[0], className)) ranges.push([match.index, match.index + match[0].length]);
  }
  return ranges;
}

function hasClass(openingTag, className) {
  const match = openingTag.match(/class="([^"]*)"/i);
  return Boolean(match && match[1].split(/\s+/).includes(className));
}

function isInRanges(position, ranges) {
  return ranges.some(([start, end]) => start <= position && position < end);
}

function escapeAttr(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
