import path from "node:path";
import { pathToFileURL } from "node:url";
import { evaluate } from "@mdx-js/mdx";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

const PAGINABLE_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "pre",
  "blockquote",
  "figure",
  "table",
]);
const TABLE_CAPTION_COMPONENT_NAME = "TableCaption";
const LEGACY_TABLE_CAPTION_MARKER_RE = /^\s*表\s*(?:[\d一二三四五六七八九十百千〇零]+(?:[-－.．][\d一二三四五六七八九十百千〇零]+)?)?\s*[：:、.．]\s*(.+?)\s*$/u;

export async function compileMdx({
  source,
  filePath,
  components = {},
  chapterSlug = "document",
  includeBlockIds = null,
  blockAttributes = null,
} = {}) {
  if (typeof source !== "string") throw new Error("compileMdx requires a string `source`.");
  if (typeof filePath !== "string" || !filePath.trim()) throw new Error("compileMdx requires `filePath`.");
  assertNoImports(source, filePath);
  const mdxSource = normalizeSingleLineDisplayMath(source);

  const blocks = [];
  const remarkPlugins = [[remarkMath, { singleDollarTextMath: true }], remarkGfm, [remarkBlockOnlyMdx, { filePath }]];
  const rehypePlugins = [rehypeKatex, rehypeTableCaptions, [rehypeBlockIds, { blocks, filePath, chapterSlug, includeBlockIds, blockAttributes }]];
  const mod = await evaluate(mdxSource, {
    ...jsxRuntime,
    baseUrl: pathToFileURL(filePath).href,
    remarkPlugins,
    rehypePlugins,
  });
  const MdxContent = mod.default;
  const mdxComponents = wrapMdxComponents(components);

  function MdxContentWrapper(props = {}) {
    return React.createElement(MdxContent, {
      ...props,
      components: {
        ...mdxComponents,
        ...(props.components ?? {}),
      },
    });
  }

  return {
    Content: MdxContentWrapper,
    blocks,
    exports: mod,
  };
}

export function rehypeTableCaptions() {
  return (tree) => {
    normalizeTableCaptions(tree);
  };
}

export function rehypeBlockIds(options = {}) {
  const blocks = Array.isArray(options.blocks) ? options.blocks : [];
  const filePath = String(options.filePath ?? "document.mdx");
  const chapterSlug = slugPart(options.chapterSlug ?? "document");
  const sourceSlug = slugPart(path.basename(filePath, path.extname(filePath)));
  const includeBlockIds = Array.isArray(options.includeBlockIds) ? new Set(options.includeBlockIds) : null;
  const blockAttributes = normalizeBlockAttributes(options.blockAttributes);
  let counter = 0;

  return (tree) => {
    filterTree(tree, (node) => {
      const block = blockInfo(node);
      if (!block) return true;

      const id = `b-${chapterSlug}-${sourceSlug}-${counter}`;
      counter += 1;
      if (block.name === "table") {
        return applyTableRowBlocks({
          node,
          id,
          blocks,
          filePath,
          chapterSlug,
          includeBlockIds,
        });
      }
      if (includeBlockIds && !includeBlockIds.has(id)) return false;

      setDataAttribute(node, "data-openpress-block-id", id);
      const extraAttributes = blockAttributes.get(id);
      if (extraAttributes) {
        for (const [name, value] of Object.entries(extraAttributes)) {
          if (value == null || value === "") continue;
          setDataAttribute(node, name, String(value));
        }
      }
      blocks.push({
        id,
        kind: block.kind,
        name: block.name,
        text: block.text,
        filePath,
        chapterSlug,
        source: sourcePosition(node.position),
      });
      return "skip";
    });
  };
}

function applyTableRowBlocks({
  node,
  id,
  blocks,
  filePath,
  chapterSlug,
  includeBlockIds,
}) {
  const rows = tableBodyRows(node);
  if (rows.length === 0) {
    if (includeBlockIds && !includeBlockIds.has(id)) return false;
    setDataAttribute(node, "data-openpress-block-id", id);
    blocks.push({
      id,
      kind: "element",
      name: "table",
      text: textContent(node).trim() || undefined,
      filePath,
      chapterSlug,
      source: sourcePosition(node.position),
    });
    return "skip";
  }

  const rowRecords = rows.map((row, index) => ({
    id: `${id}-r${index}`,
    node: row,
    index,
  }));
  const selected = includeBlockIds
    ? rowRecords.filter((row) => includeBlockIds.has(row.id))
    : rowRecords;
  if (selected.length === 0) return false;

  setDataAttribute(node, "data-openpress-table-id", id);
  const selectedNodes = new Set(selected.map((row) => row.node));
  pruneUnselectedTableRows(node, new Set(rowRecords.map((row) => row.node)), selectedNodes);
  if (selected[0]?.index > 0) stripTableHeader(node);

  for (const row of selected) {
    setDataAttribute(row.node, "data-openpress-block-id", row.id);
    blocks.push({
      id: row.id,
      kind: "table-row",
      name: "table-row",
      text: textContent(row.node).trim() || undefined,
      filePath,
      chapterSlug,
      tableId: id,
      rowIndex: row.index,
      source: sourcePosition(row.node.position ?? node.position),
    });
  }
  return "skip";
}

export function remarkBlockOnlyMdx(options = {}) {
  const filePath = String(options.filePath ?? "document.mdx");

  return (tree) => {
    visit(tree, (node) => {
      if (node?.type !== "mdxJsxTextElement") return;
      const position = node.position?.start;
      const suffix = position ? `:${position.line}:${position.column}` : "";
      throw new Error(`MDX JSX components must be block-only in OpenPress chapter prose: ${filePath}${suffix}`);
    });
  };
}

function normalizeTableCaptions(node) {
  if (!Array.isArray(node?.children)) return;

  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    normalizeTableCaptions(child);

    const legacyCaptionText = legacyTableCaptionText(child);
    if (legacyCaptionText) {
      throw new Error(`Legacy table caption markers are not supported. Use <TableCaption>${legacyCaptionText}</TableCaption> before the table.`);
    }

    const captionText = tableCaptionText(child);
    if (!captionText) continue;

    const tableIndex = nextElementIndex(node.children, index + 1);
    const table = tableIndex === -1 ? null : node.children[tableIndex];
    if (!table || table.type !== "element" || table.tagName !== "table") {
      throw new Error(`<${TABLE_CAPTION_COMPONENT_NAME}> must appear immediately before a Markdown table.`);
    }

    if (!table.children?.some((item) => item.type === "element" && item.tagName === "caption")) {
      table.children ??= [];
      table.children.unshift({
        type: "element",
        tagName: "caption",
        properties: {},
        children: [{ type: "text", value: captionText }],
      });
    }

    node.children.splice(index, tableIndex - index);
    index -= 1;
  }
}

function legacyTableCaptionText(node) {
  if (node?.type !== "element" || node.tagName !== "p") return "";
  const match = textContent(node).match(LEGACY_TABLE_CAPTION_MARKER_RE);
  return match?.[1]?.trim() ?? "";
}

function tableCaptionText(node) {
  if (node?.type !== "mdxJsxFlowElement" || node.name !== TABLE_CAPTION_COMPONENT_NAME) return "";
  const caption = textContent(node).trim();
  if (!caption) throw new Error(`<${TABLE_CAPTION_COMPONENT_NAME}> requires caption text.`);
  return caption;
}

function nextElementIndex(children, start) {
  for (let index = start; index < children.length; index += 1) {
    const child = children[index];
    if (child?.type === "text" && !String(child.value ?? "").trim()) continue;
    return child?.type === "element" ? index : -1;
  }
  return -1;
}

function textContent(node) {
  if (node?.type === "text") return String(node.value ?? "");
  if (!Array.isArray(node?.children)) return "";
  return node.children.map(textContent).join("");
}

function wrapMdxComponents(components) {
  const wrapped = {};
  for (const [name, Component] of Object.entries(components ?? {})) {
    if (typeof Component !== "function") continue;
    wrapped[name] = function ComponentBlock(props = {}) {
      const blockId = props["data-openpress-block-id"];
      const rest = { ...props };
      delete rest["data-openpress-block-id"];

      if (!blockId) return React.createElement(Component, rest);

      return React.createElement(
        "div",
        {
          "data-openpress-block-id": blockId,
          "data-openpress-component-block": name,
        },
        React.createElement(Component, rest),
      );
    };
  }
  return wrapped;
}

function assertNoImports(source, filePath) {
  if (/^\s*import\s/m.test(source)) {
    throw new Error(`MDX imports are not supported in OpenPress chapter prose: ${filePath}`);
  }
}

function normalizeSingleLineDisplayMath(source) {
  const fences = [];
  const withoutFences = source.replace(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g, (match) => {
    const token = `@@MDX_FENCE_${fences.length}@@`;
    fences.push(match);
    return token;
  });

  const normalized = withoutFences.replace(/^([ \t]*)\$\$([^\n]+?)\$\$[ \t]*$/gm, (_match, indent, math) => (
    `${indent}$$\n${indent}${math.trim()}\n${indent}$$`
  ));

  return normalized.replace(/@@MDX_FENCE_(\d+)@@/g, (_match, index) => fences[Number(index)] ?? "");
}

function blockInfo(node) {
  if (node?.type === "element" && PAGINABLE_TAGS.has(node.tagName)) {
    return { kind: "element", name: node.tagName, text: headingText(node) };
  }
  if (node?.type === "element" && node.tagName === "span" && hasClassName(node, "katex-display")) {
    return { kind: "element", name: "math" };
  }
  if (node?.type === "mdxJsxFlowElement" && typeof node.name === "string" && node.name) {
    return { kind: "component", name: node.name };
  }
  return null;
}

function tableBodyRows(table) {
  if (table?.type !== "element" || table.tagName !== "table") return [];
  const rows = [];
  for (const child of table.children ?? []) {
    if (child?.type === "element" && child.tagName === "tbody") {
      for (const row of child.children ?? []) {
        if (row?.type === "element" && row.tagName === "tr") rows.push(row);
      }
    }
  }
  if (rows.length > 0) return rows;
  return (table.children ?? []).filter((child) => child?.type === "element" && child.tagName === "tr");
}

function pruneUnselectedTableRows(node, rowNodes, selectedNodes) {
  if (!Array.isArray(node?.children)) return;
  node.children = node.children.filter((child) => {
    if (!rowNodes.has(child)) return true;
    return selectedNodes.has(child);
  });
  for (const child of node.children) pruneUnselectedTableRows(child, rowNodes, selectedNodes);
}

function stripTableHeader(table) {
  if (!Array.isArray(table?.children)) return;
  table.children = table.children.filter((child) => {
    if (child?.type !== "element") return true;
    return child.tagName !== "caption" && child.tagName !== "thead";
  });
}

function headingText(node) {
  if (!/^h[1-6]$/.test(String(node?.tagName ?? ""))) return undefined;
  return textContent(node).trim() || undefined;
}

function normalizeBlockAttributes(value) {
  if (!value) return new Map();
  if (value instanceof Map) return value;
  if (typeof value === "object") return new Map(Object.entries(value));
  return new Map();
}

function hasClassName(node, className) {
  const raw = node?.properties?.className;
  if (Array.isArray(raw)) return raw.includes(className);
  if (typeof raw === "string") return raw.split(/\s+/).includes(className);
  return false;
}

function setDataAttribute(node, name, value) {
  if (node.type === "mdxJsxFlowElement") {
    node.attributes ??= [];
    node.attributes.push({
      type: "mdxJsxAttribute",
      name,
      value,
    });
    return;
  }

  node.properties ??= {};
  node.properties[name] = value;
}

function visit(node, visitor) {
  visitor(node);
  if (!Array.isArray(node?.children)) return;
  for (const child of node.children) visit(child, visitor);
}

function filterTree(node, visitor) {
  const keep = visitor(node);
  if (!keep) return false;
  if (keep === "skip") return true;
  if (!Array.isArray(node?.children)) return true;
  node.children = node.children.filter((child) => filterTree(child, visitor));
  return true;
}

function sourcePosition(position) {
  if (!position?.start || !position?.end) return undefined;
  return {
    line: position.start.line,
    column: position.start.column,
    endLine: position.end.line,
    endColumn: position.end.column,
  };
}

function slugPart(value) {
  const slug = String(value)
    .trim()
    .replace(/\.[^.]+$/, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug || "document";
}
