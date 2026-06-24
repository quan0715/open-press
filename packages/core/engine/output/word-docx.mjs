import path from "node:path";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const DOC_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const CORE_NS = "http://schemas.openxmlformats.org/package/2006/metadata/core-properties";
const DC_NS = "http://purl.org/dc/elements/1.1/";
const DCTERMS_NS = "http://purl.org/dc/terms/";
const XSI_NS = "http://www.w3.org/2001/XMLSchema-instance";
const WP_NS = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
const A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";
const PIC_NS = "http://schemas.openxmlformats.org/drawingml/2006/picture";
const TWIP_TO_EMU = 635;
const IMAGE_CONTENT_TYPES = new Map([
  ["png", "image/png"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
]);

const BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "div",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
]);

const CONTAINER_TAGS = new Set([
  "article",
  "aside",
  "div",
  "figure",
  "footer",
  "header",
  "main",
  "nav",
  "section",
]);

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const SKIP_TAGS = new Set(["script", "style", "template"]);
const HTML_ENTITIES = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: "\"",
};

export function wordFilenameFromPdfFilename(pdfFilename = "document.pdf") {
  const base = typeof pdfFilename === "string" && pdfFilename.trim() ? pdfFilename.trim() : "document.pdf";
  const ext = path.extname(base);
  return ext ? `${base.slice(0, -ext.length)}.docx` : `${base}.docx`;
}

export function buildWordDocument({ document, createdAt = new Date() }) {
  if (!document || typeof document !== "object") {
    throw new Error("Word export requires an OpenPress reader document.");
  }
  if (document.meta?.type && document.meta.type !== "pages") {
    throw new Error("Word export only supports page Press documents.");
  }

  const now = validDate(createdAt) ? createdAt : new Date();
  const title = trimmedString(document.meta?.title) ?? "OpenPress Document";
  const subtitle = trimmedString(document.meta?.subtitle);
  const organization = trimmedString(document.meta?.organization);
  const body = documentBodyXml({ document, title, subtitle });
  const pageSize = pageSizeTwips(document.theme);

  return createZipPackage([
    ["[Content_Types].xml", contentTypesXml()],
    ["_rels/.rels", packageRelationshipsXml()],
    ["docProps/core.xml", corePropertiesXml({ title, creator: organization ?? "OpenPress", createdAt: now })],
    ["docProps/app.xml", appPropertiesXml()],
    ["word/document.xml", documentXml({ body, pageSize })],
    ["word/_rels/document.xml.rels", documentRelationshipsXml()],
    ["word/styles.xml", stylesXml()],
  ], now);
}

export function buildVisualWordDocument({ document, images, createdAt = new Date() }) {
  if (!document || typeof document !== "object") {
    throw new Error("Word export requires an OpenPress reader document.");
  }
  if (document.meta?.type && document.meta.type !== "pages") {
    throw new Error("Word export only supports page Press documents.");
  }

  const imageParts = normalizeVisualImages(images);
  if (imageParts.length === 0) {
    throw new Error("Visual Word export requires at least one rendered page image.");
  }

  const now = validDate(createdAt) ? createdAt : new Date();
  const title = trimmedString(document.meta?.title) ?? "OpenPress Document";
  const organization = trimmedString(document.meta?.organization);
  const pageSize = pageSizeTwips(document.theme);
  const body = visualDocumentBodyXml({ images: imageParts, pageSize });
  const imageExtensions = [...new Set(imageParts.map((image) => image.extension))];

  return createZipPackage([
    ["[Content_Types].xml", contentTypesXml({ imageExtensions })],
    ["_rels/.rels", packageRelationshipsXml()],
    ["docProps/core.xml", corePropertiesXml({ title, creator: organization ?? "OpenPress", createdAt: now })],
    ["docProps/app.xml", appPropertiesXml()],
    ["word/document.xml", documentXml({ body, pageSize, margins: ZERO_PAGE_MARGINS })],
    ["word/_rels/document.xml.rels", documentRelationshipsXml({ imageParts })],
    ["word/styles.xml", stylesXml()],
    ...imageParts.map((image) => [image.partName, image.data]),
  ], now);
}

function documentBodyXml({ document, title, subtitle }) {
  const body = [];
  if (title) body.push(paragraphXml({ style: "Title", runs: [{ text: title }] }));
  if (subtitle) body.push(paragraphXml({ style: "Subtitle", runs: [{ text: subtitle }] }));

  const blocks = Array.isArray(document.blocks) ? document.blocks : [];
  blocks.forEach((block, index) => {
    if (index > 0) body.push(pageBreakXml());
    const root = parseHtmlFragment(typeof block?.html === "string" ? block.html : "");
    appendContent(root.children, body);
  });

  if (body.length === 0) {
    body.push(paragraphXml({ runs: [{ text: title || "OpenPress Document" }] }));
  }
  return body.join("");
}

function visualDocumentBodyXml({ images, pageSize }) {
  return images.map((image, index) => (
    imagePageParagraphXml({
      image,
      index,
      widthEmu: pageSize.width * TWIP_TO_EMU,
      heightEmu: pageSize.height * TWIP_TO_EMU,
    })
  )).join("");
}

function appendContent(nodes, out, context = {}) {
  let inlineNodes = [];
  const flushInline = () => {
    const runs = collectInlineRuns(inlineNodes);
    inlineNodes = [];
    if (runs.length > 0) out.push(paragraphXml({ runs }));
  };

  for (const node of nodes) {
    if (isIgnorableNode(node)) continue;
    if (isBlockNode(node)) {
      flushInline();
      appendBlockNode(node, out, context);
      continue;
    }
    inlineNodes.push(node);
  }
  flushInline();
}

function appendBlockNode(node, out, context = {}) {
  if (node.type !== "element") return;
  const tag = node.tagName;
  if (SKIP_TAGS.has(tag) || shouldSkipElement(node)) return;

  if (/^h[1-6]$/.test(tag)) {
    out.push(paragraphXml({
      style: `Heading${tag.slice(1)}`,
      runs: collectInlineRuns(node.children),
    }));
    return;
  }

  if (tag === "p" || tag === "figcaption") {
    out.push(paragraphXml({
      style: tag === "figcaption" ? "Caption" : undefined,
      runs: collectInlineRuns(node.children),
    }));
    return;
  }

  if (tag === "blockquote") {
    appendQuote(node, out);
    return;
  }

  if (tag === "pre") {
    const text = collectText(node.children, { preserve: true }).trimEnd();
    if (text) out.push(paragraphXml({ style: "Code", runs: [{ text, code: true }] }));
    return;
  }

  if (tag === "ul" || tag === "ol") {
    appendList(node, out, { ordered: tag === "ol", level: context.level ?? 0 });
    return;
  }

  if (tag === "table") {
    const table = tableXml(node);
    if (table) out.push(table);
    return;
  }

  if (tag === "hr") {
    out.push(paragraphXml({ runs: [{ text: "---" }] }));
    return;
  }

  if (CONTAINER_TAGS.has(tag) || tag === "tbody" || tag === "thead" || tag === "tfoot") {
    appendContent(node.children, out, context);
    return;
  }

  const runs = collectInlineRuns(node.children);
  if (runs.length > 0) out.push(paragraphXml({ runs }));
}

function appendQuote(node, out) {
  const before = out.length;
  appendContent(node.children, out);
  for (let i = before; i < out.length; i += 1) {
    if (out[i].includes("<w:pPr>")) {
      out[i] = out[i].replace("<w:pPr>", '<w:pPr><w:pStyle w:val="Quote"/>');
    } else {
      out[i] = out[i].replace("<w:p>", '<w:p><w:pPr><w:pStyle w:val="Quote"/></w:pPr>');
    }
  }
}

function appendList(node, out, { ordered, level }) {
  let index = 1;
  for (const item of directElements(node, "li")) {
    const direct = item.children.filter((child) => !(child.type === "element" && (child.tagName === "ul" || child.tagName === "ol")));
    const runs = collectInlineRuns(direct);
    const prefix = ordered ? `${index}. ` : "\u2022 ";
    out.push(paragraphXml({
      style: "ListParagraph",
      runs: [
        { text: `${"  ".repeat(level)}${prefix}` },
        ...runs,
      ],
    }));
    for (const nested of item.children.filter((child) => child.type === "element" && (child.tagName === "ul" || child.tagName === "ol"))) {
      appendList(nested, out, { ordered: nested.tagName === "ol", level: level + 1 });
    }
    index += 1;
  }
}

function tableXml(tableNode) {
  const rows = collectRows(tableNode);
  if (rows.length === 0) return "";
  const rowXml = rows.map((row) => {
    const cells = row.children.filter((child) => child.type === "element" && (child.tagName === "td" || child.tagName === "th"));
    if (cells.length === 0) return "";
    return `<w:tr>${cells.map((cell) => tableCellXml(cell, cell.tagName === "th")).join("")}</w:tr>`;
  }).filter(Boolean);
  if (rowXml.length === 0) return "";
  return [
    "<w:tbl>",
    "<w:tblPr><w:tblW w:w=\"0\" w:type=\"auto\"/><w:tblBorders><w:top w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"D9DEE7\"/><w:left w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"D9DEE7\"/><w:bottom w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"D9DEE7\"/><w:right w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"D9DEE7\"/><w:insideH w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"D9DEE7\"/><w:insideV w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"D9DEE7\"/></w:tblBorders></w:tblPr>",
    rowXml.join(""),
    "</w:tbl>",
  ].join("");
}

function collectRows(tableNode) {
  const rows = [];
  const visit = (node) => {
    if (node.type !== "element") return;
    if (node.tagName === "tr") {
      rows.push(node);
      return;
    }
    for (const child of node.children) visit(child);
  };
  visit(tableNode);
  return rows;
}

function tableCellXml(cell, header) {
  const cellContent = [];
  if (header) {
    const runs = collectInlineRuns(cell.children).map((run) => run.break ? run : { ...run, bold: true });
    cellContent.push(paragraphXml({ runs }));
  } else {
    appendContent(cell.children, cellContent);
    if (cellContent.length === 0) cellContent.push(paragraphXml({ runs: collectInlineRuns(cell.children) }));
  }
  return [
    "<w:tc>",
    "<w:tcPr><w:tcW w:w=\"0\" w:type=\"auto\"/></w:tcPr>",
    cellContent.join(""),
    "</w:tc>",
  ].join("");
}

function collectInlineRuns(nodes, marks = {}) {
  const runs = [];
  for (const node of nodes) {
    if (isIgnorableNode(node)) continue;
    if (node.type === "text") {
      const text = normalizeInlineText(node.value);
      if (text) runs.push({ text, ...marks });
      continue;
    }
    if (node.type !== "element" || shouldSkipElement(node)) continue;
    const tag = node.tagName;
    if (SKIP_TAGS.has(tag)) continue;
    if (tag === "br") {
      runs.push({ break: true });
      continue;
    }
    if (tag === "img") {
      const alt = trimmedString(node.attrs.alt);
      if (alt) runs.push({ text: `[Image: ${alt}]`, italic: true });
      continue;
    }
    const nextMarks = {
      ...marks,
      bold: marks.bold || tag === "strong" || tag === "b" || tag === "th",
      italic: marks.italic || tag === "em" || tag === "i" || tag === "cite",
      code: marks.code || tag === "code" || tag === "kbd" || tag === "samp",
    };
    if (BLOCK_TAGS.has(tag) && !CONTAINER_TAGS.has(tag) && tag !== "span") {
      const text = collectText([node]);
      if (text) runs.push({ text, ...nextMarks });
      continue;
    }
    runs.push(...collectInlineRuns(node.children, nextMarks));
  }
  return normalizeRuns(runs);
}

function collectText(nodes, { preserve = false } = {}) {
  const parts = [];
  const visit = (node) => {
    if (isIgnorableNode(node)) return;
    if (node.type === "text") {
      parts.push(node.value);
      return;
    }
    if (node.type !== "element" || SKIP_TAGS.has(node.tagName) || shouldSkipElement(node)) return;
    if (node.tagName === "br") parts.push("\n");
    if (node.tagName === "img" && node.attrs.alt) parts.push(node.attrs.alt);
    for (const child of node.children) visit(child);
  };
  for (const node of nodes) visit(node);
  const text = parts.join(preserve ? "" : " ");
  return preserve ? decodeHtmlEntities(text) : normalizeInlineText(text).trim();
}

function normalizeRuns(runs) {
  const out = [];
  for (const run of runs) {
    if (run.break) {
      out.push(run);
      continue;
    }
    let text = run.text ?? "";
    if (!text) continue;
    if (out.length === 0) text = text.replace(/^\s+/, "");
    const previous = out[out.length - 1];
    if (previous && !previous.break && previous.text?.endsWith(" ") && text.startsWith(" ")) {
      text = text.replace(/^\s+/, "");
    }
    if (!text) continue;
    out.push({ ...run, text });
  }
  while (out.length > 0) {
    const last = out[out.length - 1];
    if (!last.break && last.text) {
      last.text = last.text.replace(/\s+$/, "");
      if (!last.text) out.pop();
    }
    break;
  }
  return out;
}

function normalizeInlineText(value) {
  return decodeHtmlEntities(String(value ?? "")).replace(/\s+/g, " ");
}

function parseHtmlFragment(html) {
  const root = { type: "root", children: [] };
  const stack = [root];
  const source = String(html ?? "").replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<style\b[\s\S]*?<\/style>/gi, "");
  const tokenRe = /<!--[\s\S]*?-->|<![^>]*>|<\/([A-Za-z][\w:-]*)\s*>|<([A-Za-z][\w:-]*)([^>]*)>|([^<]+)/g;
  let match;
  while ((match = tokenRe.exec(source)) !== null) {
    const closing = match[1];
    const opening = match[2];
    const attrs = match[3] ?? "";
    const text = match[4];
    const current = stack[stack.length - 1];

    if (text) {
      current.children.push({ type: "text", value: decodeHtmlEntities(text) });
      continue;
    }
    if (closing) {
      const tag = closing.toLowerCase();
      for (let i = stack.length - 1; i > 0; i -= 1) {
        if (stack[i].tagName === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    if (opening) {
      const tag = opening.toLowerCase();
      const node = { type: "element", tagName: tag, attrs: parseAttrs(attrs), children: [] };
      current.children.push(node);
      if (!VOID_TAGS.has(tag) && !/\/\s*$/.test(attrs)) stack.push(node);
    }
  }
  return root;
}

function parseAttrs(source) {
  const attrs = {};
  const attrRe = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = attrRe.exec(source)) !== null) {
    attrs[match[1].toLowerCase()] = decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attrs;
}

function isBlockNode(node) {
  return node.type === "element" && BLOCK_TAGS.has(node.tagName);
}

function isIgnorableNode(node) {
  return node.type === "text" && !node.value.replace(/\s+/g, "");
}

function shouldSkipElement(node) {
  return node.attrs?.["aria-hidden"] === "true" || "data-openpress-page-folio" in (node.attrs ?? {});
}

function directElements(node, tagName) {
  return node.children.filter((child) => child.type === "element" && child.tagName === tagName);
}

function paragraphXml({ runs, style }) {
  const prop = paragraphPropertiesXml(style);
  const body = runs.length > 0 ? runs.map(runXml).join("") : "<w:r><w:t></w:t></w:r>";
  return `<w:p>${prop}${body}</w:p>`;
}

function paragraphPropertiesXml(style) {
  if (!style) return "";
  return `<w:pPr><w:pStyle w:val="${xmlAttr(style)}"/></w:pPr>`;
}

function runXml(run) {
  if (run.break) return "<w:r><w:br/></w:r>";
  const props = [];
  if (run.bold) props.push("<w:b/>");
  if (run.italic) props.push("<w:i/>");
  if (run.code) props.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:color w:val="374151"/>');
  const propXml = props.length > 0 ? `<w:rPr>${props.join("")}</w:rPr>` : "";
  const text = String(run.text ?? "");
  const preserve = /^\s|\s$/.test(text) ? ' xml:space="preserve"' : "";
  return `<w:r>${propXml}<w:t${preserve}>${xmlText(text)}</w:t></w:r>`;
}

function pageBreakXml() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

const DEFAULT_PAGE_MARGINS = {
  top: 1440,
  right: 1440,
  bottom: 1440,
  left: 1440,
  header: 720,
  footer: 720,
  gutter: 0,
};

const ZERO_PAGE_MARGINS = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  header: 0,
  footer: 0,
  gutter: 0,
};

function documentXml({ body, pageSize, margins = DEFAULT_PAGE_MARGINS }) {
  return xmlDeclaration() +
    `<w:document xmlns:w="${WORD_NS}" xmlns:r="${DOC_REL_NS}" xmlns:wp="${WP_NS}" xmlns:a="${A_NS}" xmlns:pic="${PIC_NS}">` +
    `<w:body>${body}<w:sectPr><w:pgSz w:w="${pageSize.width}" w:h="${pageSize.height}"/><w:pgMar w:top="${margins.top}" w:right="${margins.right}" w:bottom="${margins.bottom}" w:left="${margins.left}" w:header="${margins.header}" w:footer="${margins.footer}" w:gutter="${margins.gutter}"/></w:sectPr></w:body>` +
    "</w:document>";
}

function contentTypesXml({ imageExtensions = [] } = {}) {
  const imageDefaults = imageExtensions
    .map((extension) => {
      const contentType = IMAGE_CONTENT_TYPES.get(extension);
      return contentType ? `<Default Extension="${xmlAttr(extension)}" ContentType="${xmlAttr(contentType)}"/>` : "";
    })
    .join("");
  return xmlDeclaration() +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    imageDefaults +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
    "</Types>";
}

function packageRelationshipsXml() {
  return xmlDeclaration() +
    `<Relationships xmlns="${REL_NS}">` +
    `<Relationship Id="rId1" Type="${DOC_REL_NS}/officeDocument" Target="word/document.xml"/>` +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    `<Relationship Id="rId3" Type="${DOC_REL_NS}/extended-properties" Target="docProps/app.xml"/>` +
    "</Relationships>";
}

function documentRelationshipsXml({ imageParts = [] } = {}) {
  const imageRelationships = imageParts.map((image) => (
    `<Relationship Id="${xmlAttr(image.relationshipId)}" Type="${DOC_REL_NS}/image" Target="${xmlAttr(image.target)}"/>`
  )).join("");
  return xmlDeclaration() +
    `<Relationships xmlns="${REL_NS}">` +
    `<Relationship Id="rId1" Type="${DOC_REL_NS}/styles" Target="styles.xml"/>` +
    imageRelationships +
    "</Relationships>";
}

function corePropertiesXml({ title, creator, createdAt }) {
  const iso = createdAt.toISOString();
  return xmlDeclaration() +
    `<cp:coreProperties xmlns:cp="${CORE_NS}" xmlns:dc="${DC_NS}" xmlns:dcterms="${DCTERMS_NS}" xmlns:xsi="${XSI_NS}">` +
    `<dc:title>${xmlText(title)}</dc:title>` +
    `<dc:creator>${xmlText(creator)}</dc:creator>` +
    `<cp:lastModifiedBy>${xmlText(creator)}</cp:lastModifiedBy>` +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created>` +
    `<dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified>` +
    "</cp:coreProperties>";
}

function appPropertiesXml() {
  return xmlDeclaration() +
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
    "<Application>OpenPress</Application>" +
    "</Properties>";
}

function stylesXml() {
  return xmlDeclaration() +
    `<w:styles xmlns:w="${WORD_NS}">` +
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>' +
    styleXml("Normal", "Normal", { defaultStyle: true, size: 22 }) +
    styleXml("Title", "Title", { basedOn: "Normal", size: 48, bold: true, spacingAfter: 240 }) +
    styleXml("Subtitle", "Subtitle", { basedOn: "Normal", size: 28, color: "5F6B7A", spacingAfter: 240 }) +
    styleXml("Heading1", "heading 1", { basedOn: "Normal", size: 36, bold: true, spacingBefore: 320, spacingAfter: 120 }) +
    styleXml("Heading2", "heading 2", { basedOn: "Normal", size: 30, bold: true, spacingBefore: 280, spacingAfter: 100 }) +
    styleXml("Heading3", "heading 3", { basedOn: "Normal", size: 26, bold: true, spacingBefore: 240, spacingAfter: 80 }) +
    styleXml("Heading4", "heading 4", { basedOn: "Normal", size: 24, bold: true, spacingBefore: 200, spacingAfter: 60 }) +
    styleXml("Heading5", "heading 5", { basedOn: "Normal", size: 22, bold: true, spacingBefore: 160, spacingAfter: 60 }) +
    styleXml("Heading6", "heading 6", { basedOn: "Normal", size: 20, bold: true, spacingBefore: 140, spacingAfter: 60 }) +
    styleXml("ListParagraph", "List Paragraph", { basedOn: "Normal", indentLeft: 360, hanging: 180 }) +
    styleXml("Quote", "Quote", { basedOn: "Normal", italic: true, indentLeft: 360, color: "4B5563" }) +
    styleXml("Caption", "Caption", { basedOn: "Normal", italic: true, size: 18, color: "6B7280" }) +
    styleXml("Code", "Code", { basedOn: "Normal", size: 19, font: "Consolas", color: "374151" }) +
    "</w:styles>";
}

function styleXml(id, name, options = {}) {
  const props = [];
  if (options.font) props.push(`<w:rFonts w:ascii="${xmlAttr(options.font)}" w:hAnsi="${xmlAttr(options.font)}"/>`);
  if (options.bold) props.push("<w:b/>");
  if (options.italic) props.push("<w:i/>");
  if (options.size) props.push(`<w:sz w:val="${options.size}"/><w:szCs w:val="${options.size}"/>`);
  if (options.color) props.push(`<w:color w:val="${xmlAttr(options.color)}"/>`);
  const pPr = [];
  if (options.spacingBefore || options.spacingAfter) {
    pPr.push(`<w:spacing w:before="${options.spacingBefore ?? 0}" w:after="${options.spacingAfter ?? 0}"/>`);
  }
  if (options.indentLeft || options.hanging) {
    pPr.push(`<w:ind w:left="${options.indentLeft ?? 0}" w:hanging="${options.hanging ?? 0}"/>`);
  }
  return [
    `<w:style w:type="paragraph"${options.defaultStyle ? ' w:default="1"' : ""} w:styleId="${xmlAttr(id)}">`,
    `<w:name w:val="${xmlAttr(name)}"/>`,
    options.basedOn ? `<w:basedOn w:val="${xmlAttr(options.basedOn)}"/>` : "",
    pPr.length > 0 ? `<w:pPr>${pPr.join("")}</w:pPr>` : "",
    props.length > 0 ? `<w:rPr>${props.join("")}</w:rPr>` : "",
    "</w:style>",
  ].join("");
}

function imagePageParagraphXml({ image, index, widthEmu, heightEmu }) {
  const docPrId = index + 1;
  const name = `OpenPress page ${docPrId}`;
  const alt = image.alt || name;
  return [
    "<w:p>",
    '<w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr>',
    "<w:r><w:rPr><w:noProof/></w:rPr><w:drawing>",
    `<wp:inline distT="0" distB="0" distL="0" distR="0">`,
    `<wp:extent cx="${widthEmu}" cy="${heightEmu}"/>`,
    `<wp:docPr id="${docPrId}" name="${xmlAttr(name)}" descr="${xmlAttr(alt)}"/>`,
    '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>',
    '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">',
    "<pic:pic>",
    `<pic:nvPicPr><pic:cNvPr id="${docPrId}" name="${xmlAttr(image.filename)}"/><pic:cNvPicPr/></pic:nvPicPr>`,
    `<pic:blipFill><a:blip r:embed="${xmlAttr(image.relationshipId)}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`,
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>`,
    "</pic:pic>",
    "</a:graphicData></a:graphic>",
    "</wp:inline>",
    "</w:drawing></w:r>",
    "</w:p>",
  ].join("");
}

function normalizeVisualImages(images) {
  if (!Array.isArray(images)) return [];
  return images.map((image, index) => {
    const extension = imageExtension(image) ?? "png";
    const contentType = IMAGE_CONTENT_TYPES.get(extension) ?? "image/png";
    const filename = `page-${String(index + 1).padStart(3, "0")}.${extension === "jpeg" ? "jpg" : extension}`;
    const data = Buffer.isBuffer(image?.data) ? image.data : Buffer.from(image?.data ?? "");
    return {
      alt: trimmedString(image?.alt) ?? `OpenPress page ${index + 1}`,
      contentType,
      data,
      extension,
      filename,
      partName: `word/media/${filename}`,
      relationshipId: `rIdImage${index + 1}`,
      target: `media/${filename}`,
    };
  });
}

function imageExtension(image) {
  const fromContentType = typeof image?.contentType === "string"
    ? [...IMAGE_CONTENT_TYPES.entries()].find(([, contentType]) => contentType === image.contentType.toLowerCase())?.[0]
    : undefined;
  if (fromContentType) return fromContentType;
  const ext = typeof image?.filename === "string" ? path.extname(image.filename).slice(1).toLowerCase() : "";
  if (IMAGE_CONTENT_TYPES.has(ext)) return ext;
  return undefined;
}

function pageSizeTwips(theme) {
  return {
    width: cssLengthToTwips(theme?.pageWidth) ?? 11906,
    height: cssLengthToTwips(theme?.pageHeight) ?? 16838,
  };
}

function cssLengthToTwips(value) {
  if (typeof value !== "string") return null;
  const match = /^(\d+(?:\.\d+)?)(px|mm|cm|in|pt|pc)$/i.exec(value.trim());
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const inches =
    unit === "in" ? amount :
    unit === "mm" ? amount / 25.4 :
    unit === "cm" ? amount / 2.54 :
    unit === "pt" ? amount / 72 :
    unit === "pc" ? amount / 6 :
    amount / 96;
  return Math.max(1, Math.round(inches * 1440));
}

function createZipPackage(entries, date) {
  const localParts = [];
  const centralParts = [];
  const { dosTime, dosDate } = dateToDos(date);
  let offset = 0;

  for (const [name, content] of entries) {
    const nameBuffer = Buffer.from(name, "utf8");
    const data = Buffer.isBuffer(content) ? content : Buffer.from(String(content), "utf8");
    const crc = crc32(data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, nameBuffer, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, nameBuffer);

    offset += localHeader.length + nameBuffer.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dateToDos(date) {
  const year = Math.min(2107, Math.max(1980, date.getFullYear()));
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);
  return {
    dosTime: (hours << 11) | (minutes << 5) | seconds,
    dosDate: ((year - 1980) << 9) | (month << 5) | day,
  };
}

function decodeHtmlEntities(value) {
  return String(value ?? "").replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, entity) => {
    const key = entity.toLowerCase();
    if (key.startsWith("#x")) {
      const code = Number.parseInt(key.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (key.startsWith("#")) {
      const code = Number.parseInt(key.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return HTML_ENTITIES[key] ?? match;
  });
}

function xmlText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function xmlAttr(value) {
  return xmlText(value).replaceAll("\"", "&quot;");
}

function trimmedString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function validDate(value) {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function xmlDeclaration() {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
}
