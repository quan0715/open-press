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
const TABLE_CAPTION_MARKER_RE = /^\s*表\s*(?:[\d一二三四五六七八九十百千〇零]+(?:[-－.．][\d一二三四五六七八九十百千〇零]+)?)?\s*[：:、.．]\s*(.+?)\s*$/u;

export async function compileMdx({
  source,
  filePath,
  components = {},
  chapterSlug = "document",
  includeBlockIds = null,
} = {}) {
  if (typeof source !== "string") throw new Error("compileMdx requires a string `source`.");
  if (typeof filePath !== "string" || !filePath.trim()) throw new Error("compileMdx requires `filePath`.");
  assertNoImports(source, filePath);
  const mdxSource = normalizeSingleLineDisplayMath(source);

  const blocks = [];
  const remarkPlugins = [[remarkMath, { singleDollarTextMath: true }], remarkGfm, [remarkBlockOnlyMdx, { filePath }]];
  const rehypePlugins = [rehypeKatex, rehypeTableCaptions, [rehypeBlockIds, { blocks, filePath, chapterSlug, includeBlockIds }]];
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
    normalizeTableCaptionMarkers(tree);
  };
}

export function rehypeBlockIds(options = {}) {
  const blocks = Array.isArray(options.blocks) ? options.blocks : [];
  const filePath = String(options.filePath ?? "document.mdx");
  const chapterSlug = slugPart(options.chapterSlug ?? "document");
  const sourceSlug = slugPart(path.basename(filePath, path.extname(filePath)));
  const includeBlockIds = Array.isArray(options.includeBlockIds) ? new Set(options.includeBlockIds) : null;
  let counter = 0;

  return (tree) => {
    filterTree(tree, (node) => {
      const block = blockInfo(node);
      if (!block) return true;

      const id = `b-${chapterSlug}-${sourceSlug}-${counter}`;
      counter += 1;
      if (includeBlockIds && !includeBlockIds.has(id)) return false;

      setDataAttribute(node, "data-openpress-block-id", id);
      blocks.push({
        id,
        kind: block.kind,
        name: block.name,
        filePath,
        chapterSlug,
        source: sourcePosition(node.position),
      });
      return true;
    });
  };
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

function normalizeTableCaptionMarkers(node) {
  if (!Array.isArray(node?.children)) return;

  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    normalizeTableCaptionMarkers(child);

    const captionText = tableCaptionText(child);
    if (!captionText) continue;

    const tableIndex = nextElementIndex(node.children, index + 1);
    const table = tableIndex === -1 ? null : node.children[tableIndex];
    if (!table || table.type !== "element" || table.tagName !== "table") continue;

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

function tableCaptionText(node) {
  if (node?.type !== "element" || node.tagName !== "p") return "";
  const match = textContent(node).match(TABLE_CAPTION_MARKER_RE);
  return match?.[1]?.trim() ?? "";
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
    return { kind: "element", name: node.tagName };
  }
  if (node?.type === "element" && node.tagName === "span" && hasClassName(node, "katex-display")) {
    return { kind: "element", name: "math" };
  }
  if (node?.type === "mdxJsxFlowElement" && typeof node.name === "string" && node.name) {
    return { kind: "component", name: node.name };
  }
  return null;
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
