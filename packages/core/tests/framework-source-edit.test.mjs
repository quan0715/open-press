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
import { rmWithRetry } from "./_temp.mjs";

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

test("source block text edit replaces custom component caption prop", () => {
  const result = applySourceBlockTextEditToText("<CustomFigure caption=\"Old custom caption\" />\n", {
    kind: "component-caption",
    name: "CustomFigure",
    source: { line: 1, column: 1, endLine: 1, endColumn: 44 },
    text: "New custom caption",
  });

  assert.equal(result.text, "<CustomFigure caption=\"New custom caption\" />\n");
  assert.match(result.edit.after, /caption="New custom caption"/);
});

test("source block text edit replaces source-mapped object text", () => {
  const result = applySourceBlockTextEditToText("const title = \"Old slide title\";\n", {
    kind: "object-text",
    name: "text",
    blockId: "object-text:text:slide-01:title",
    source: { line: 1, column: 16, endLine: 1, endColumn: 31 },
    text: "New slide title",
  });

  assert.equal(result.text, "const title = \"New slide title\";\n");
  assert.equal(result.edit.after, "const title = \"New slide title\";");
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
    await fs.mkdir(path.join(workspace, "press", "report", "chapters", "01-intro", "content"), { recursive: true });
    await fs.writeFile(
      path.join(workspace, "press", "report", "press.tsx"),
      `import { Press } from "@open-press/core";\nimport { mdxSource } from "@open-press/core/mdx";\nexport default function Doc() {\n  return (<Press slug="report" title="Edit Fixture" sources={[mdxSource({ id: "story", preset: "section-folders", root: "report/chapters" })]}>Cover</Press>);\n}\n`,
      "utf8",
    );
    const sourcePath = path.join(workspace, "press", "report", "chapters", "01-intro", "content", "01-start.mdx");
    await fs.writeFile(sourcePath, "## Old heading\n\nParagraph text.\n", "utf8");

    const response = await requestSourceEdit({
      root: workspace,
      body: {
        blockId: "b-heading",
        path: "press/report/chapters/01-intro/content/01-start.mdx",
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
    await rmWithRetry(workspace);
  }
});

test("source edit endpoint applies a source-mapped object text edit in the React document entry", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-object-text-edit-"));
  try {
    await fs.writeFile(
      path.join(workspace, "package.json"),
      JSON.stringify({ name: "object-text-edit-fixture", private: true, openpress: {} }, null, 2),
    );
    await fs.mkdir(path.join(workspace, "press", "report"), { recursive: true });
    const entryPath = path.join(workspace, "press", "report", "press.tsx");
    await fs.writeFile(
      entryPath,
      `import { Frame, Press, Text } from "@open-press/core";\nconst title = "Old slide title";\nexport default function Doc() {\n  return <Press slug="report" title="Slides" type="slides" page="slide-16-9"><Frame frameKey="slide-01"><Text objectId="title" label="Title" source={{ path: "press/report/press.tsx", source: { line: 2, column: 16, endLine: 2, endColumn: 31 } }}>{title}</Text></Frame></Press>;\n}\n`,
      "utf8",
    );

    const response = await requestSourceEdit({
      root: workspace,
      body: {
        blockId: "object-text:text:slide-01:title",
        path: "press/report/press.tsx",
        kind: "object-text",
        name: "text",
        source: { line: 2, column: 16, endLine: 2, endColumn: 31 },
        text: "New slide title",
        refreshDocument: false,
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.ok, true);
    assert.match(await fs.readFile(entryPath, "utf8"), /const title = "New slide title";/);
  } finally {
    await rmWithRetry(workspace);
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
