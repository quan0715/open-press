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

export function collectCaptionReferenceIndex(htmlValues) {
  const references = new Map();
  for (const html of htmlValues ?? []) {
    const labelPattern = /<span\b([^>]*)>([\s\S]*?)<\/span>/gi;
    let labelMatch;
    while ((labelMatch = labelPattern.exec(String(html ?? ""))) !== null) {
      const referenceId = attrValue(labelMatch[1], "data-openpress-reference-id");
      if (!referenceId) continue;
      const kind = attrValue(labelMatch[1], "data-openpress-caption-label");
      const number = Number(attrValue(labelMatch[1], "data-openpress-caption-number"));
      const label = htmlText(labelMatch[2]);
      if ((kind !== "figure" && kind !== "table") || !Number.isInteger(number) || number < 1 || !label) continue;
      if (references.has(referenceId)) {
        throw new Error(`Duplicate cross-reference target "${referenceId}". Figure and table target IDs must be unique within a Press.`);
      }
      references.set(referenceId, { id: referenceId, kind, number, label });
    }
  }
  return references;
}

export function resolveCrossReferencesInHtml(html, references) {
  if (!html || !String(html).includes("data-openpress-cross-reference=")) return html;
  return String(html).replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (match, anchorAttrs) => {
    const referenceId = attrValue(anchorAttrs, "data-openpress-cross-reference");
    if (!referenceId) return match;
    const target = references?.get(referenceId);
    if (!target) {
      throw new Error(`Unresolved cross-reference "@${referenceId}". Add a captioned target with id="${referenceId}" or update the reference.`);
    }
    return `<a${anchorAttrs}>${escapeHtml(target.label)}</a>`;
  });
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
    const referenceId = referenceIdForCaption(tableAttrs, "table");
    return `<table${tableAttrs}>${beforeCaptionText}${captionLabelSpan("table", state.table, label, referenceId)} ${captionText}${afterCaptionText}`;
  });
}

function numberFigureCaptions(html, options, state) {
  return html.replace(/<figure\b([^>]*)>([\s\S]*?<figcaption\b([^>]*)>)([\s\S]*?)(<\/figcaption>[\s\S]*?<\/figure>)/g, (match, figureAttrs, beforeCaptionText, captionAttrs, captionText, afterCaptionText) => {
    if (captionText.includes("data-openpress-caption-label=")) return match;
    state.figure += 1;
    const label = captionLabel(options.figure, state.figure, options.separator);
    const referenceId = referenceIdForCaption(figureAttrs, "figure");
    return `<figure${figureAttrs}>${beforeCaptionText}${captionLabelSpan("figure", state.figure, label, referenceId)} ${captionText}${afterCaptionText}`;
  });
}

function captionLabel(noun, number, separator) {
  return `${noun}${separator}${number}`;
}

function captionLabelSpan(kind, number, label, referenceId = "") {
  const referenceAttribute = referenceId ? ` data-openpress-reference-id="${escapeHtml(referenceId)}"` : "";
  return `<span class="openpress-caption-label" data-openpress-caption-label="${kind}" data-openpress-caption-number="${number}"${referenceAttribute}>${escapeHtml(label)}</span>`;
}

function referenceIdForCaption(containerAttrs, kind) {
  const referenceId = attrValue(containerAttrs, "id");
  if (!referenceId || (!referenceId.startsWith("fig-") && !referenceId.startsWith("tbl-"))) return "";
  const expectedPrefix = kind === "figure" ? "fig-" : "tbl-";
  if (!referenceId.startsWith(expectedPrefix)) {
    throw new Error(`Cross-reference target "${referenceId}" is attached to a ${kind}; use the "${expectedPrefix}" prefix.`);
  }
  if (!/^(?:fig|tbl)-[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(referenceId)) {
    throw new Error(`Invalid cross-reference target id "${referenceId}". Use lowercase letters, numbers, hyphens, or underscores.`);
  }
  return referenceId;
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
