import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  applySourceBlockTextEditToText,
  applySourceBlockSourceEditToText,
  readSourceBlockTextFromText,
} from "../engine/runtime/source-text-tools.mjs";
import { handleSourceEditRequest } from "../engine/react/source-edit-endpoint.mjs";

test("source block text edit preserves markdown heading syntax", () => {
  const result = applySourceBlockTextEditToText("## Old heading\n\nParagraph text.\n", {
    kind: "element",
    name: "h2",
    source: { line: 1, column: 1, endLine: 1, endColumn: 15 },
    text: "New heading",
  });

  assert.equal(result.text, "## New heading\n\nParagraph text.\n");
  assert.equal(result.edit.before, "## Old heading");
  assert.equal(result.edit.after, "## New heading");
});

test("source block text edit preserves markdown list item syntax", () => {
  const result = applySourceBlockTextEditToText("- Old item\n- Next item\n", {
    kind: "list-item",
    name: "list-item",
    source: { line: 1, column: 1, endLine: 1, endColumn: 11 },
    text: "New item",
  });

  assert.equal(result.text, "- New item\n- Next item\n");
  assert.equal(result.edit.after, "- New item");
});

test("source block text edit replaces one markdown table cell", () => {
  const result = applySourceBlockTextEditToText("| Keep | Old cell |\n| Next | Value |\n", {
    kind: "table-cell",
    name: "td",
    source: { line: 1, column: 1, endLine: 1, endColumn: 19 },
    cellIndex: 1,
    text: "New cell",
  });

  assert.equal(result.text, "| Keep | New cell |\n| Next | Value |\n");
  assert.equal(result.edit.before, "| Keep | Old cell |");
  assert.equal(result.edit.after, "| Keep | New cell |");
});

test("source block text edit replaces fenced code block contents", () => {
  const result = applySourceBlockTextEditToText("```text\nold prompt\n- item\n```\n\nNext\n", {
    kind: "element",
    name: "pre",
    source: { line: 1, column: 1, endLine: 4, endColumn: 4 },
    text: "new prompt\n- first\n- second",
  });

  assert.equal(result.text, "```text\nnew prompt\n- first\n- second\n```\n\nNext\n");
  assert.equal(result.edit.before, "```text\nold prompt\n- item\n```");
  assert.equal(result.edit.after, "```text\nnew prompt\n- first\n- second\n```");
});

test("source block text edit replaces TableCaption text", () => {
  const result = applySourceBlockTextEditToText("<TableCaption>Old caption</TableCaption>\n\n| A | B |\n", {
    kind: "element",
    name: "caption",
    source: { line: 1, column: 1, endLine: 1, endColumn: 41 },
    text: "New caption",
  });

  assert.equal(result.text, "<TableCaption>New caption</TableCaption>\n\n| A | B |\n");
  assert.equal(result.edit.after, "<TableCaption>New caption</TableCaption>");
});

test("source block text edit replaces MediaFigure caption prop", () => {
  const sourceText = [
    "<MediaFigure",
    "  src=\"diagram.png\"",
    "  alt=\"Diagram\"",
    "  caption=\"Old figure caption\"",
    "/>",
    "",
  ].join("\n");
  const result = applySourceBlockTextEditToText(sourceText, {
    kind: "component-caption",
    name: "MediaFigure",
    source: { line: 1, column: 1, endLine: 5, endColumn: 3 },
    text: "New figure caption",
  });

  assert.equal(result.text, [
    "<MediaFigure",
    "  src=\"diagram.png\"",
    "  alt=\"Diagram\"",
    "  caption=\"New figure caption\"",
    "/>",
    "",
  ].join("\n"));
  assert.match(result.edit.after, /caption="New figure caption"/);
});

test("source block text edit rejects rendered component blocks", () => {
  assert.throws(
    () => applySourceBlockTextEditToText("<HeroFigure />\n", {
      kind: "component",
      name: "HeroFigure",
      source: { line: 1, column: 1, endLine: 1, endColumn: 15 },
      text: "New text",
    }),
    /Only rendered text blocks can be edited/,
  );
});

test("source mode reads and replaces raw component source", () => {
  const text = "Intro\n\n<HeroFigure tone=\"quiet\" />\n";
  const source = { line: 3, column: 1, endLine: 3, endColumn: 29 };

  assert.equal(readSourceBlockTextFromText(text, { source }), "<HeroFigure tone=\"quiet\" />");

  const result = applySourceBlockSourceEditToText(text, {
    blockId: "b-component",
    source,
    text: "<HeroFigure tone=\"bold\" />",
  });

  assert.equal(result.text, "Intro\n\n<HeroFigure tone=\"bold\" />\n");
  assert.equal(result.edit.before, "<HeroFigure tone=\"quiet\" />");
  assert.equal(result.edit.after, "<HeroFigure tone=\"bold\" />");
});

test("source edit endpoint applies a rendered text block edit", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-source-edit-"));
  try {
    await fs.writeFile(
      path.join(workspace, "package.json"),
      JSON.stringify({ name: "edit-fixture", private: true, openpress: {} }, null, 2),
    );
    await fs.mkdir(path.join(workspace, "press", "chapters", "01-intro", "content"), { recursive: true });
    await fs.writeFile(
      path.join(workspace, "press", "index.tsx"),
      `import { Workspace, Press } from "@open-press/core";\nimport { mdxSource } from "@open-press/core/mdx";\nexport default function Doc() {\n  return (<Workspace><Press title="Edit Fixture" sources={[mdxSource({ id: "story", preset: "section-folders", root: "chapters" })]}>Cover</Press></Workspace>);\n}\n`,
      "utf8",
    );
    const sourcePath = path.join(workspace, "press", "chapters", "01-intro", "content", "01-start.mdx");
    await fs.writeFile(sourcePath, "## Old heading\n\nParagraph text.\n", "utf8");

    const response = await requestSourceEdit({
      root: workspace,
      body: {
        blockId: "b-heading",
        path: "chapters/01-intro/content/01-start.mdx",
        kind: "element",
        name: "h2",
        source: { line: 1, column: 1, endLine: 1, endColumn: 15 },
        text: "New heading",
        refreshDocument: false,
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.edit.blockId, "b-heading");
    assert.equal(await fs.readFile(sourcePath, "utf8"), "## New heading\n\nParagraph text.\n");
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
});

async function requestSourceEdit({ root, body }) {
  const req = Readable.from([JSON.stringify(body)]);
  req.method = "POST";
  const chunks = [];
  const res = {
    status: 0,
    writeHead(status) {
      this.status = status;
    },
    end(chunk) {
      if (chunk) chunks.push(String(chunk));
    },
  };

  await handleSourceEditRequest(req, res, { root, refreshDocument: false });

  return {
    status: res.status,
    body: JSON.parse(chunks.join("")),
  };
}
