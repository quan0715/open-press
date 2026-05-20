import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { compileQDocMdx } from "../engine/react/mdx-compile.mjs";

async function withTempDir(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "qdoc-react-mdx-"));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function writeFile(filePath, source) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, source, "utf8");
}

test("compileQDocMdx renders MDX with stable block ids and component wrappers", async () => {
  function LinkedListVisual() {
    return React.createElement("svg", { role: "img", "aria-label": "linked list" });
  }

  const result = await compileQDocMdx({
    source: [
      "## Linked List",
      "",
      "A node stores data and a next pointer.",
      "",
      "<LinkedListVisual />",
    ].join("\n"),
    filePath: "/tmp/qdoc/document/chapters/04-linked-list/content/01-list-and-node.mdx",
    components: { LinkedListVisual },
    chapterSlug: "linked-list",
  });

  const html = renderToStaticMarkup(React.createElement(result.Content));

  assert.match(html, /<h2 data-qdoc-block-id="b-linked-list-01-list-and-node-0">Linked List<\/h2>/);
  assert.match(html, /<p data-qdoc-block-id="b-linked-list-01-list-and-node-1">A node stores data and a next pointer\.<\/p>/);
  assert.match(
    html,
    /<div data-qdoc-block-id="b-linked-list-01-list-and-node-2" data-qdoc-component-block="LinkedListVisual">/,
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

test("compileQDocMdx rejects import declarations in chapter prose", async () => {
  await assert.rejects(
    () => compileQDocMdx({
      source: "import Thing from './Thing'\n\n# Bad",
      filePath: "/tmp/qdoc/document/chapters/04-linked-list/content/01-bad.mdx",
      components: {},
      chapterSlug: "linked-list",
    }),
    /MDX imports are not supported/i,
  );
});

test("compileQDocMdx can render only selected block ids for pagination subtrees", async () => {
  const result = await compileQDocMdx({
    source: [
      "## First block",
      "",
      "This paragraph should be kept.",
      "",
      "This paragraph should be removed.",
    ].join("\n"),
    filePath: "/tmp/qdoc/document/chapters/01-intro/content/01-start.mdx",
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

test("compileQDocMdx rejects inline JSX components inside prose", async () => {
  await assert.rejects(
    () => compileQDocMdx({
      source: "Use <Badge /> inside prose.",
      filePath: "/tmp/qdoc/document/chapters/04-linked-list/content/01-bad-inline.mdx",
      components: { Badge: () => React.createElement("span", null, "Badge") },
      chapterSlug: "linked-list",
    }),
    /MDX JSX components must be block-only.+01-bad-inline\.mdx:1:5/i,
  );
});

test("compileQDocMdx pre-renders legacy qdoc-component tags as safe MDX blocks", async () => {
  await withTempDir(async (documentRoot) => {
    await writeFile(
      path.join(documentRoot, "components/sample-visual/component.mjs"),
      `export function render({ attrs, helpers }) {
  return '<figure class="sample-visual"><div data-rendered-name="' + helpers.escapeAttr(attrs.name) + '">Legacy visual</div><figcaption>Sample</figcaption></figure>';
}
`,
    );

    const result = await compileQDocMdx({
      source: [
        "## Intro",
        "",
        '<qdoc-component name="sample-visual" />',
      ].join("\n"),
      filePath: path.join(documentRoot, "chapters/01-intro/content/01-start.mdx"),
      components: {},
      chapterSlug: "intro",
      legacyComponentRoot: documentRoot,
    });
    const html = renderToStaticMarkup(React.createElement(result.Content));

    assert.match(html, /data-qdoc-component="sample-visual"/);
    assert.match(html, /data-rendered-name="sample-visual"/);
    assert.match(html, /<figcaption>Sample<\/figcaption>/);
    assert.deepEqual(
      result.blocks.map((block) => [block.kind, block.name]),
      [
        ["element", "h2"],
        ["component", "QDocLegacyHtml"],
      ],
    );
  });
});

test("compileQDocMdx renders GitHub-flavored markdown tables as table elements", async () => {
  const result = await compileQDocMdx({
    source: [
      "| 寫法 | 意義 |",
      "| --- | --- |",
      "| `p` | 節點位址 |",
      "| `p->next` | 下一個節點 |",
    ].join("\n"),
    filePath: "/tmp/qdoc/document/chapters/04-linked-list/content/01-list-and-node.mdx",
    chapterSlug: "linked-list",
  });
  const html = renderToStaticMarkup(React.createElement(result.Content));

  assert.match(html, /<table data-qdoc-block-id="b-linked-list-01-list-and-node-0">/);
  assert.match(html, /<thead>/);
  assert.match(html, /<tbody>/);
  assert.match(html, /<code>p-&gt;next<\/code>/);
  assert.deepEqual(
    result.blocks.map((block) => [block.kind, block.name]),
    [["element", "table"]],
  );
});

test("compileQDocMdx treats TeX braces inside dollar math as prose instead of MDX expressions", async () => {
  const result = await compileQDocMdx({
    source: "深度為 $k$ 的二元樹最多有 $2^{i-1}$ 個節點。",
    filePath: "/tmp/qdoc/document/chapters/05-tree/content/01-tree.mdx",
    chapterSlug: "tree",
  });
  const html = renderToStaticMarkup(React.createElement(result.Content));

  assert.match(html, /\$2\^\{i-1\}\$/);
});
