import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { compileMdx } from "../engine/react/mdx-compile.mjs";

test("compileMdx renders MDX with stable block ids and component wrappers", async () => {
  function LinkedListVisual() {
    return React.createElement("svg", { role: "img", "aria-label": "linked list" });
  }

  const result = await compileMdx({
    source: [
      "## Linked List",
      "",
      "A node stores data and a next pointer.",
      "",
      "<LinkedListVisual />",
    ].join("\n"),
    filePath: "/tmp/openpress/document/chapters/04-linked-list/content/01-list-and-node.mdx",
    components: { LinkedListVisual },
    chapterSlug: "linked-list",
  });

  const html = renderToStaticMarkup(React.createElement(result.Content));

  assert.match(html, /<h2 data-openpress-block-id="b-linked-list-01-list-and-node-0">Linked List<\/h2>/);
  assert.match(html, /<p data-openpress-block-id="b-linked-list-01-list-and-node-1">A node stores data and a next pointer\.<\/p>/);
  assert.match(
    html,
    /<div data-openpress-block-id="b-linked-list-01-list-and-node-2" data-openpress-component-block="LinkedListVisual">/,
  );
  assert.match(html, /<svg role="img" aria-label="linked list"><\/svg>/);
  assert.deepEqual(
    result.blocks.map((block) => ({
      id: block.id,
      kind: block.kind,
      name: block.name,
      source: block.source,
    })),
    [
      {
        id: "b-linked-list-01-list-and-node-0",
        kind: "element",
        name: "h2",
        source: { line: 1, column: 1, endLine: 1, endColumn: 15 },
      },
      {
        id: "b-linked-list-01-list-and-node-1",
        kind: "element",
        name: "p",
        source: { line: 3, column: 1, endLine: 3, endColumn: 39 },
      },
      {
        id: "b-linked-list-01-list-and-node-2",
        kind: "component",
        name: "LinkedListVisual",
        source: { line: 5, column: 1, endLine: 5, endColumn: 21 },
      },
    ],
  );
});

test("compileMdx rejects import declarations in chapter prose", async () => {
  await assert.rejects(
    () => compileMdx({
      source: "import Thing from './Thing'\n\n# Bad",
      filePath: "/tmp/openpress/document/chapters/04-linked-list/content/01-bad.mdx",
      components: {},
      chapterSlug: "linked-list",
    }),
    /MDX imports are not supported/i,
  );
});

test("compileMdx can render only selected block ids for pagination subtrees", async () => {
  const result = await compileMdx({
    source: [
      "## First block",
      "",
      "This paragraph should be kept.",
      "",
      "This paragraph should be removed.",
    ].join("\n"),
    filePath: "/tmp/openpress/document/chapters/01-intro/content/01-start.mdx",
    components: {},
    chapterSlug: "intro",
    includeBlockIds: ["b-intro-01-start-0", "b-intro-01-start-1"],
  });

  const html = renderToStaticMarkup(React.createElement(result.Content));

  assert.match(html, /First block/);
  assert.match(html, /This paragraph should be kept/);
  assert.doesNotMatch(html, /This paragraph should be removed/);
  assert.deepEqual(
    result.blocks.map((block) => block.id),
    ["b-intro-01-start-0", "b-intro-01-start-1"],
  );
});

test("compileMdx rejects inline JSX components inside prose", async () => {
  await assert.rejects(
    () => compileMdx({
      source: "Use <Badge /> inside prose.",
      filePath: "/tmp/openpress/document/chapters/04-linked-list/content/01-bad-inline.mdx",
      components: { Badge: () => React.createElement("span", null, "Badge") },
      chapterSlug: "linked-list",
    }),
    /MDX JSX components must be block-only.+01-bad-inline\.mdx:1:5/i,
  );
});

test("compileMdx renders GitHub-flavored markdown tables as table elements", async () => {
  const result = await compileMdx({
    source: [
      "| 寫法 | 意義 |",
      "| --- | --- |",
      "| `p` | 節點位址 |",
      "| `p->next` | 下一個節點 |",
    ].join("\n"),
    filePath: "/tmp/openpress/document/chapters/04-linked-list/content/01-list-and-node.mdx",
    chapterSlug: "linked-list",
  });
  const html = renderToStaticMarkup(React.createElement(result.Content));

  assert.match(html, /<table data-openpress-block-id="b-linked-list-01-list-and-node-0">/);
  assert.match(html, /<thead>/);
  assert.match(html, /<tbody>/);
  assert.match(html, /<code>p-&gt;next<\/code>/);
  assert.deepEqual(
    result.blocks.map((block) => [block.kind, block.name]),
    [["element", "table"]],
  );
});

test("compileMdx converts TableCaption components into table captions", async () => {
  const result = await compileMdx({
    source: [
      "<TableCaption>Pointer syntax</TableCaption>",
      "",
      "| 寫法 | 意義 |",
      "| --- | --- |",
      "| `p` | 節點位址 |",
    ].join("\n"),
    filePath: "/tmp/openpress/document/chapters/04-linked-list/content/01-list-and-node.mdx",
    chapterSlug: "linked-list",
  });
  const html = renderToStaticMarkup(React.createElement(result.Content));

  assert.match(html, /<table data-openpress-block-id="b-linked-list-01-list-and-node-0">/);
  assert.match(html, /<caption>Pointer syntax<\/caption>/);
  assert.doesNotMatch(html, /TableCaption/);
  assert.deepEqual(
    result.blocks.map((block) => [block.kind, block.name]),
    [["element", "table"]],
  );
});

test("compileMdx rejects legacy table title markers", async () => {
  await assert.rejects(
    () => compileMdx({
      source: [
        "表：Pointer syntax",
        "",
        "| 寫法 | 意義 |",
        "| --- | --- |",
        "| `p` | 節點位址 |",
      ].join("\n"),
      filePath: "/tmp/openpress/document/chapters/04-linked-list/content/01-list-and-node.mdx",
      chapterSlug: "linked-list",
    }),
    /Use <TableCaption>Pointer syntax<\/TableCaption> before the table/i,
  );
});

test("compileMdx renders inline LaTeX math without treating braces as MDX expressions", async () => {
  const result = await compileMdx({
    source: "深度為 $k$ 的二元樹最多有 $2^{i-1}$ 個節點。",
    filePath: "/tmp/openpress/document/chapters/05-tree/content/01-tree.mdx",
    chapterSlug: "tree",
  });
  const html = renderToStaticMarkup(React.createElement(result.Content));

  assert.match(html, /<span class="katex/);
  assert.match(html, /<math/);
  assert.ok(!html.includes("$2^{i-1}$"));
});

test("compileMdx renders display LaTeX math as a paginable block", async () => {
  const result = await compileMdx({
    source: [
      "Before",
      "",
      "$$",
      "N(h)=N(h-1)+N(h-2)+1",
      "$$",
      "",
      "After",
    ].join("\n"),
    filePath: "/tmp/openpress/document/chapters/05-tree/content/01-tree.mdx",
    chapterSlug: "tree",
  });
  const html = renderToStaticMarkup(React.createElement(result.Content));

  assert.match(html, /class="katex-display"/);
  assert.ok(!html.includes("$$"));
  assert.deepEqual(
    result.blocks.map((block) => [block.kind, block.name]),
    [
      ["element", "p"],
      ["element", "math"],
      ["element", "p"],
    ],
  );
});

test("compileMdx treats a whole-line double-dollar formula as display math", async () => {
  const result = await compileMdx({
    source: "$$A(x)=6x^5+5x^3-4x^2+8$$",
    filePath: "/tmp/openpress/document/chapters/04-linked-list/content/05-applications.mdx",
    chapterSlug: "linked-list",
  });
  const html = renderToStaticMarkup(React.createElement(result.Content));

  assert.match(html, /class="katex-display"/);
  assert.deepEqual(
    result.blocks.map((block) => [block.kind, block.name]),
    [["element", "math"]],
  );
});
