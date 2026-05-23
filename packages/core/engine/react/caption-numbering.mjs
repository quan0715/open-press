const DEFAULT_CAPTION_NUMBERING = {
  figure: "Figure",
  table: "Table",
  separator: " ",
};

export function normalizeCaptionNumbering(value = {}) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    figure: stringOption(input.figure, DEFAULT_CAPTION_NUMBERING.figure),
    table: stringOption(input.table, DEFAULT_CAPTION_NUMBERING.table),
    separator: typeof input.separator === "string" ? input.separator : DEFAULT_CAPTION_NUMBERING.separator,
  };
}

export function createCaptionNumberingState() {
  return {
    figure: 0,
    table: 0,
    seenTables: new Set(),
  };
}

export function numberCaptionsInHtml(html, numbering, state = createCaptionNumberingState()) {
  if (!html) return html;
  const options = normalizeCaptionNumbering(numbering);
  let out = String(html);
  out = numberTableCaptions(out, options, state);
  out = numberFigureCaptions(out, options, state);
  return out;
}

function numberTableCaptions(html, options, state) {
  return html.replace(/<table\b([^>]*)>([\s\S]*?<caption\b([^>]*)>)([\s\S]*?)(<\/caption>[\s\S]*?<\/table>)/g, (match, tableAttrs, beforeCaptionText, captionAttrs, captionText, afterCaptionText) => {
    if (captionText.includes("data-openpress-caption-label=")) return match;
    const tableId = attrValue(tableAttrs, "data-openpress-table-id");
    if (tableId && state.seenTables.has(tableId)) return match;
    if (tableId) state.seenTables.add(tableId);
    state.table += 1;
    const label = captionLabel(options.table, state.table, options.separator);
    return `<table${tableAttrs}>${beforeCaptionText}${captionLabelSpan("table", state.table, label)} ${captionText}${afterCaptionText}`;
  });
}

function numberFigureCaptions(html, options, state) {
  return html.replace(/<figure\b([^>]*)>([\s\S]*?<figcaption\b([^>]*)>)([\s\S]*?)(<\/figcaption>[\s\S]*?<\/figure>)/g, (match, figureAttrs, beforeCaptionText, captionAttrs, captionText, afterCaptionText) => {
    if (captionText.includes("data-openpress-caption-label=")) return match;
    state.figure += 1;
    const label = captionLabel(options.figure, state.figure, options.separator);
    return `<figure${figureAttrs}>${beforeCaptionText}${captionLabelSpan("figure", state.figure, label)} ${captionText}${afterCaptionText}`;
  });
}

function captionLabel(noun, number, separator) {
  return `${noun}${separator}${number}`;
}

function captionLabelSpan(kind, number, label) {
  return `<span class="openpress-caption-label" data-openpress-caption-label="${kind}" data-openpress-caption-number="${number}">${escapeHtml(label)}</span>`;
}

function attrValue(attrs, name) {
  const pattern = new RegExp(`${name}=(["'])(.*?)\\1`);
  return attrs.match(pattern)?.[2] ?? "";
}

function stringOption(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
