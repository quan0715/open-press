import path from "node:path";
import { pathToFileURL } from "node:url";
import { evaluate } from "@mdx-js/mdx";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";

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

export async function compileQDocMdx({
  source,
  filePath,
  components = {},
  chapterSlug = "document",
  includeBlockIds = null,
} = {}) {
  if (typeof source !== "string") throw new Error("compileQDocMdx requires a string `source`.");
  if (typeof filePath !== "string" || !filePath.trim()) throw new Error("compileQDocMdx requires `filePath`.");
  assertNoImports(source, filePath);
  const mdxSafeSource = escapeTexBracesInDollarMath(source);

  const blocks = [];
  const remarkPlugins = [remarkGfm, [remarkQDocBlockOnlyMdx, { filePath }]];
  const rehypePlugins = [[rehypeQDocBlockIds, { blocks, filePath, chapterSlug, includeBlockIds }]];
  const mod = await evaluate(mdxSafeSource, {
    ...jsxRuntime,
    baseUrl: pathToFileURL(filePath).href,
    remarkPlugins,
    rehypePlugins,
  });
  const MdxContent = mod.default;
  const mdxComponents = wrapMdxComponents(components);

  function QDocMdxContent(props = {}) {
    return React.createElement(MdxContent, {
      ...props,
      components: {
        ...mdxComponents,
        ...(props.components ?? {}),
      },
    });
  }

  return {
    Content: QDocMdxContent,
    blocks,
    exports: mod,
  };
}

export function rehypeQDocBlockIds(options = {}) {
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

      setDataAttribute(node, "data-qdoc-block-id", id);
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

export function remarkQDocBlockOnlyMdx(options = {}) {
  const filePath = String(options.filePath ?? "document.mdx");

  return (tree) => {
    visit(tree, (node) => {
      if (node?.type !== "mdxJsxTextElement") return;
      const position = node.position?.start;
      const suffix = position ? `:${position.line}:${position.column}` : "";
      throw new Error(`MDX JSX components must be block-only in QDoc chapter prose: ${filePath}${suffix}`);
    });
  };
}

function wrapMdxComponents(components) {
  const wrapped = {};
  for (const [name, Component] of Object.entries(components ?? {})) {
    if (typeof Component !== "function") continue;
    wrapped[name] = function QDocComponentBlock(props = {}) {
      const blockId = props["data-qdoc-block-id"];
      const rest = { ...props };
      delete rest["data-qdoc-block-id"];

      if (!blockId) return React.createElement(Component, rest);

      return React.createElement(
        "div",
        {
          "data-qdoc-block-id": blockId,
          "data-qdoc-component-block": name,
        },
        React.createElement(Component, rest),
      );
    };
  }
  return wrapped;
}

function assertNoImports(source, filePath) {
  if (/^\s*import\s/m.test(source)) {
    throw new Error(`MDX imports are not supported in QDoc chapter prose: ${filePath}`);
  }
}

function escapeTexBracesInDollarMath(source) {
  const fences = [];
  const withoutFences = source.replace(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g, (match) => {
    const token = `@@QDOC_FENCE_${fences.length}@@`;
    fences.push(match);
    return token;
  });
  const escaped = escapeDollarMathSegments(withoutFences);
  return escaped.replace(/@@QDOC_FENCE_(\d+)@@/g, (_match, index) => fences[Number(index)] ?? "");
}

function escapeDollarMathSegments(source) {
  let output = "";
  let index = 0;
  while (index < source.length) {
    if (source[index] !== "$" || isEscaped(source, index)) {
      output += source[index] ?? "";
      index += 1;
      continue;
    }

    const delimiter = source[index + 1] === "$" ? "$$" : "$";
    const start = index + delimiter.length;
    const end = findClosingMathDelimiter(source, start, delimiter);
    if (end < 0) {
      output += delimiter;
      index += delimiter.length;
      continue;
    }

    output += delimiter;
    output += escapeTexBraces(source.slice(start, end));
    output += delimiter;
    index = end + delimiter.length;
  }
  return output;
}

function findClosingMathDelimiter(source, start, delimiter) {
  let index = start;
  while ((index = source.indexOf(delimiter, index)) !== -1) {
    if (!isEscaped(source, index)) return index;
    index += delimiter.length;
  }
  return -1;
}

function escapeTexBraces(value) {
  return value
    .replace(/(?<!\\)\{/g, "\\{")
    .replace(/(?<!\\)\}/g, "\\}");
}

function isEscaped(source, position) {
  let backslashes = 0;
  for (let index = position - 1; index >= 0 && source[index] === "\\"; index -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
}

function blockInfo(node) {
  if (node?.type === "element" && PAGINABLE_TAGS.has(node.tagName)) {
    return { kind: "element", name: node.tagName };
  }
  if (node?.type === "mdxJsxFlowElement" && typeof node.name === "string" && node.name) {
    return { kind: "component", name: node.name };
  }
  return null;
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
