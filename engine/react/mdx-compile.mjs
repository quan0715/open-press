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
  const mdxSource = normalizeSingleLineDisplayMath(source);

  const blocks = [];
  const remarkPlugins = [[remarkMath, { singleDollarTextMath: true }], remarkGfm, [remarkQDocBlockOnlyMdx, { filePath }]];
  const rehypePlugins = [rehypeKatex, [rehypeQDocBlockIds, { blocks, filePath, chapterSlug, includeBlockIds }]];
  const mod = await evaluate(mdxSource, {
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

function normalizeSingleLineDisplayMath(source) {
  const fences = [];
  const withoutFences = source.replace(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g, (match) => {
    const token = `@@QDOC_FENCE_${fences.length}@@`;
    fences.push(match);
    return token;
  });

  const normalized = withoutFences.replace(/^([ \t]*)\$\$([^\n]+?)\$\$[ \t]*$/gm, (_match, indent, math) => (
    `${indent}$$\n${indent}${math.trim()}\n${indent}$$`
  ));

  return normalized.replace(/@@QDOC_FENCE_(\d+)@@/g, (_match, index) => fences[Number(index)] ?? "");
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
