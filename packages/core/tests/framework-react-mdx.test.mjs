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

  assert.match(html, /<h2 data-openpress-block-id="b-linked-list-01-list-and-node-0" data-openpress-object-id="mdx-block:b-linked-list-01-list-and-node-0">Linked List<\/h2>/);
  assert.match(html, /<p data-openpress-block-id="b-linked-list-01-list-and-node-1" data-openpress-object-id="mdx-block:b-linked-list-01-list-and-node-1">A node stores data and a next pointer\.<\/p>/);
  assert.match(
    html,
    /<div data-openpress-block-id="b-linked-list-01-list-and-node-2" data-openpress-object-id="mdx-block:b-linked-list-01-list-and-node-2" data-openpress-component-block="LinkedListVisual">/,
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

test("compileMdx renders GitHub-flavored markdown tables as row-splittable table elements", async () => {
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

  assert.match(html, /<table data-openpress-table-id="b-linked-list-01-list-and-node-0">/);
  assert.match(html, /<thead>/);
  assert.match(html, /<tr data-openpress-block-id="b-linked-list-01-list-and-node-0-h0" data-openpress-object-id="mdx-block:b-linked-list-01-list-and-node-0-h0" data-openpress-block-layout="attached">/);
  assert.match(html, /<tbody>/);
  assert.match(html, /<tr data-openpress-block-id="b-linked-list-01-list-and-node-0-r0" data-openpress-object-id="mdx-block:b-linked-list-01-list-and-node-0-r0">/);
  assert.match(html, /<tr data-openpress-block-id="b-linked-list-01-list-and-node-0-r1" data-openpress-object-id="mdx-block:b-linked-list-01-list-and-node-0-r1">/);
  // Each cell carries its own cell-precision object id so inspector comments
  // can target a single cell instead of the whole row.
  assert.match(html, /<td data-openpress-object-id="mdx-block:b-linked-list-01-list-and-node-0-r0:cell:0" data-openpress-table-cell-index="0">/);
  assert.match(html, /<td data-openpress-object-id="mdx-block:b-linked-list-01-list-and-node-0-r0:cell:1" data-openpress-table-cell-index="1">/);
  assert.match(html, /<th data-openpress-object-id="mdx-block:b-linked-list-01-list-and-node-0-h0:cell:0" data-openpress-table-cell-index="0">/);
  assert.match(html, /<code>p-&gt;next<\/code>/);
  assert.deepEqual(
    result.blocks.map((block) => [block.id, block.kind, block.name, block.layout]),
    [
      ["b-linked-list-01-list-and-node-0-h0", "table-row", "table-header-row", "attached"],
      ["b-linked-list-01-list-and-node-0-r0", "table-row", "table-row", undefined],
      ["b-linked-list-01-list-and-node-0-r1", "table-row", "table-row", undefined],
    ],
  );
});

test("compileMdx can render only selected table row block ids", async () => {
  const result = await compileMdx({
    source: [
      "| 寫法 | 意義 |",
      "| --- | --- |",
      "| `p` | 節點位址 |",
      "| `p->next` | 下一個節點 |",
      "| `tail` | 尾端節點 |",
    ].join("\n"),
    filePath: "/tmp/openpress/document/chapters/04-linked-list/content/01-list-and-node.mdx",
    chapterSlug: "linked-list",
    includeBlockIds: ["b-linked-list-01-list-and-node-0-r1"],
  });
  const html = renderToStaticMarkup(React.createElement(result.Content));

  assert.match(html, /<table data-openpress-table-id="b-linked-list-01-list-and-node-0">/);
  assert.doesNotMatch(html, /<thead>/);
  assert.doesNotMatch(html, /節點位址/);
  assert.match(html, /下一個節點/);
  assert.doesNotMatch(html, /尾端節點/);
  assert.deepEqual(
    result.blocks.map((block) => block.id),
    ["b-linked-list-01-list-and-node-0-r1"],
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

  assert.match(html, /<table data-openpress-table-id="b-linked-list-01-list-and-node-0">/);
  assert.match(html, /<caption data-openpress-block-id="b-linked-list-01-list-and-node-0-caption" data-openpress-object-id="mdx-block:b-linked-list-01-list-and-node-0-caption">Pointer syntax<\/caption>/);
  assert.doesNotMatch(html, /TableCaption/);
  assert.deepEqual(
    result.blocks.map((block) => [block.id, block.kind, block.name, block.source]),
    [
      [
        "b-linked-list-01-list-and-node-0-caption",
        "element",
        "caption",
        { line: 1, column: 1, endLine: 1, endColumn: 44 },
      ],
      [
        "b-linked-list-01-list-and-node-0-h0",
        "table-row",
        "table-header-row",
        { line: 3, column: 1, endLine: 3, endColumn: 12 },
      ],
      [
        "b-linked-list-01-list-and-node-0-r0",
        "table-row",
        "table-row",
        { line: 5, column: 1, endLine: 5, endColumn: 15 },
      ],
    ],
  );
});

test("compileMdx splits bullet lists into per-item paginable blocks", async () => {
  const result = await compileMdx({
    source: [
      "- 第一條",
      "- 第二條",
      "- 第三條",
    ].join("\n"),
    filePath: "/tmp/openpress/document/chapters/04-linked-list/content/02-bullets.mdx",
    chapterSlug: "linked-list",
  });
  const html = renderToStaticMarkup(React.createElement(result.Content));

  assert.match(html, /<ul data-openpress-list-id="b-linked-list-02-bullets-0">/);
  assert.match(html, /<li data-openpress-block-id="b-linked-list-02-bullets-0-i0" data-openpress-object-id="mdx-block:b-linked-list-02-bullets-0-i0">/);
  assert.match(html, /<li data-openpress-block-id="b-linked-list-02-bullets-0-i1" data-openpress-object-id="mdx-block:b-linked-list-02-bullets-0-i1">/);
  assert.match(html, /<li data-openpress-block-id="b-linked-list-02-bullets-0-i2" data-openpress-object-id="mdx-block:b-linked-list-02-bullets-0-i2">/);
  assert.deepEqual(
    result.blocks.map((block) => [block.id, block.kind, block.listTag, block.itemIndex]),
    [
      ["b-linked-list-02-bullets-0-i0", "list-item", "ul", 0],
      ["b-linked-list-02-bullets-0-i1", "list-item", "ul", 1],
      ["b-linked-list-02-bullets-0-i2", "list-item", "ul", 2],
    ],
  );
});

test("compileMdx renders only selected list-item blocks and preserves ordered-list numbering", async () => {
  const result = await compileMdx({
    source: [
      "1. 第一條",
      "2. 第二條",
      "3. 第三條",
      "4. 第四條",
    ].join("\n"),
    filePath: "/tmp/openpress/document/chapters/04-linked-list/content/03-numbered.mdx",
    chapterSlug: "linked-list",
    includeBlockIds: [
      "b-linked-list-03-numbered-0-i2",
      "b-linked-list-03-numbered-0-i3",
    ],
  });
  const html = renderToStaticMarkup(React.createElement(result.Content));

  // Continuation page renders only items 2 and 3, with start=3 so the
  // browser numbers them as 3 and 4 (matching the original list).
  assert.match(html, /<ol[^>]*start="3"/);
  assert.doesNotMatch(html, /第一條/);
  assert.doesNotMatch(html, /第二條/);
  assert.match(html, /第三條/);
  assert.match(html, /第四條/);
  assert.deepEqual(
    result.blocks.map((block) => block.id),
    ["b-linked-list-03-numbered-0-i2", "b-linked-list-03-numbered-0-i3"],
  );
});

test("compileMdx keeps nested lists attached to their parent <li>", async () => {
  const result = await compileMdx({
    source: [
      "- 外層第一",
      "  - 內層 A",
      "  - 內層 B",
      "- 外層第二",
    ].join("\n"),
    filePath: "/tmp/openpress/document/chapters/04-linked-list/content/04-nested.mdx",
    chapterSlug: "linked-list",
  });
  const html = renderToStaticMarkup(React.createElement(result.Content));

  // Only two top-level <li> blocks emitted; the nested ul is part of item 0
  // and does NOT receive its own list-id (would otherwise allow the nested
  // list to be split independently of its parent item).
  assert.deepEqual(
    result.blocks.map((block) => block.id),
    [
      "b-linked-list-04-nested-0-i0",
      "b-linked-list-04-nested-0-i1",
    ],
  );
  assert.match(html, /內層 A/);
  assert.match(html, /內層 B/);
  // Outer list gets the list-id; inner ul stays a plain element.
  assert.match(html, /<ul data-openpress-list-id="b-linked-list-04-nested-0">/);
  const innerListMatches = html.match(/<ul/g) ?? [];
  assert.equal(innerListMatches.length, 2, "expected one outer + one nested ul");
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
