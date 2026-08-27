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

export function collectNumberedCaptions(html) {
  const captions = [];
  const captionPattern = /<(figcaption|caption)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let captionMatch;

  while ((captionMatch = captionPattern.exec(String(html ?? ""))) !== null) {
    const content = captionMatch[2];
    const labelPattern = /<span\b([^>]*)>([\s\S]*?)<\/span>/gi;
    let labelMatch;

    while ((labelMatch = labelPattern.exec(content)) !== null) {
      const kind = attrValue(labelMatch[1], "data-openpress-caption-label");
      const number = Number(attrValue(labelMatch[1], "data-openpress-caption-number"));
      if ((kind !== "figure" && kind !== "table") || !Number.isInteger(number) || number < 1) continue;

      captions.push({
        id: `${kind}-${number}`,
        kind,
        number,
        label: htmlText(labelMatch[2]),
        title: htmlText(content.replace(labelMatch[0], "")),
      });
      break;
    }
  }

  return captions;
}

export function collectCaptionIndex(pages) {
  const seen = new Set();
  const captions = [];

  for (const page of pages) {
    for (const caption of collectNumberedCaptions(page.html)) {
      if (seen.has(caption.id)) continue;
      seen.add(caption.id);
      captions.push({ ...caption, pageIndex: page.pageIndex });
    }
  }

  return captions;
}

function numberTableCaptions(html, options, state) {
  // Captionless continuations must not reach across a table boundary to the next caption.
  return html.replace(/<table\b([^>]*)>((?:(?!<\/?table\b)[\s\S])*?<caption\b([^>]*)>)([\s\S]*?)(<\/caption>[\s\S]*?<\/table>)/g, (match, tableAttrs, beforeCaptionText, captionAttrs, captionText, afterCaptionText) => {
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

function htmlText(value) {
  return decodeHtmlEntities(String(value ?? "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|apos|gt|lt|nbsp|quot);/gi, (entity, token) => {
    if (token[0] !== "#") return named[token.toLowerCase()] ?? entity;
    const codePoint = token[1].toLowerCase() === "x"
      ? Number.parseInt(token.slice(2), 16)
      : Number.parseInt(token.slice(1), 10);
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
  });
}

function stringOption(value, defaultValue) {
  return typeof value === "string" && value.trim() ? value.trim() : defaultValue;
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
