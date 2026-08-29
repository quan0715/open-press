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
  const caption = '<TableCaption id="tbl-results">Old caption</TableCaption>';
  const result = applySourceBlockTextEditToText(`${caption}\n\n| A | B |\n`, {
    kind: "element",
    name: "caption",
    source: { line: 1, column: 1, endLine: 1, endColumn: caption.length + 1 },
    text: "New caption",
  });

  assert.equal(result.text, '<TableCaption id="tbl-results">New caption</TableCaption>\n\n| A | B |\n');
  assert.equal(result.edit.after, '<TableCaption id="tbl-results">New caption</TableCaption>');
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

test("source mode reads and replaces only the exact MDX source range", () => {
  const blockSource = "Formula $G_t$ and `GET Question(index)`";
  const documentText = `Prefix ${blockSource} suffix\nNext line\n`;
  const start = documentText.indexOf(blockSource);
  const source = {
    line: 1,
    column: start + 1,
    endLine: 1,
    endColumn: start + blockSource.length + 1,
  };

  assert.equal(readSourceBlockTextFromText(documentText, { source }), blockSource);

  const replacement = "Formula $F_t$ and `POST Grade(results*)`";
  const result = applySourceBlockSourceEditToText(documentText, {
    blockId: "b-mixed-inline",
    source,
    text: replacement,
  });

  assert.equal(result.text, `Prefix ${replacement} suffix\nNext line\n`);
  assert.equal(result.edit.before, blockSource);
  assert.equal(result.edit.after, replacement);
});

test("source mode preserves indentation around a source-mapped block", () => {
  const documentText = "Before\n  <HeroFigure tone=\"quiet\" /> trailing\nAfter\n";
  const blockSource = "<HeroFigure tone=\"quiet\" />";
  const source = {
    line: 2,
    column: 3,
    endLine: 2,
    endColumn: blockSource.length + 3,
  };
  const result = applySourceBlockSourceEditToText(documentText, {
    blockId: "b-indented-component",
    source,
    text: "<HeroFigure tone=\"bold\" />",
  });

  assert.equal(
    result.text,
    "Before\n  <HeroFigure tone=\"bold\" /> trailing\nAfter\n",
  );
});

test("source edit endpoint applies a rendered text block edit", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-source-edit-"));
  try {
    await fs.writeFile(
      path.join(workspace, "package.json"),
      JSON.stringify({ name: "edit-fixture", private: true }, null, 2),
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

test("source edit endpoint applies a markdown table cell edit", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-table-cell-edit-"));
  try {
    await fs.writeFile(
      path.join(workspace, "package.json"),
      JSON.stringify({ name: "table-cell-edit-fixture", private: true }, null, 2),
    );
    await fs.mkdir(path.join(workspace, "press", "report", "chapters", "01-intro", "content"), { recursive: true });
    await fs.writeFile(
      path.join(workspace, "press", "report", "press.tsx"),
      `import { Press } from "@open-press/core";\nimport { mdxSource } from "@open-press/core/mdx";\nexport default function Doc() {\n  return (<Press slug="report" title="Table Edit Fixture" sources={[mdxSource({ id: "story", preset: "section-folders", root: "report/chapters" })]}>Cover</Press>);\n}\n`,
      "utf8",
    );
    const sourcePath = path.join(workspace, "press", "report", "chapters", "01-intro", "content", "01-start.mdx");
    await fs.writeFile(sourcePath, "| Keep | Old cell |\n| --- | --- |\n", "utf8");

    const response = await requestSourceEdit({
      root: workspace,
      body: {
        blockId: "b-table-row",
        path: "press/report/chapters/01-intro/content/01-start.mdx",
        kind: "table-cell",
        name: "td",
        source: { line: 1, column: 1, endLine: 1, endColumn: 20 },
        cellIndex: 1,
        text: "New cell",
        refreshDocument: false,
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.edit.cellIndex, 1);
    assert.equal(await fs.readFile(sourcePath, "utf8"), "| Keep | New cell |\n| --- | --- |\n");
  } finally {
    await rmWithRetry(workspace);
  }
});

test("source edit endpoint reads and replaces a complete MDX source file", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-source-file-edit-"));
  try {
    await fs.writeFile(
      path.join(workspace, "package.json"),
      JSON.stringify({ name: "file-edit-fixture", private: true }, null, 2),
    );
    await fs.mkdir(path.join(workspace, "press", "report", "chapters", "01-intro", "content"), { recursive: true });
    await fs.writeFile(
      path.join(workspace, "press", "report", "press.tsx"),
      `import { Press } from "@open-press/core";\nimport { mdxSource } from "@open-press/core/mdx";\nexport default function Doc() {\n  return (<Press slug="report" title="Edit Fixture" sources={[mdxSource({ id: "story", preset: "section-folders", root: "report/chapters" })]}>Cover</Press>);\n}\n`,
      "utf8",
    );
    const sourcePath = path.join(workspace, "press", "report", "chapters", "01-intro", "content", "01-start.mdx");
    await fs.writeFile(sourcePath, "## Old heading\n\nParagraph text.\n", "utf8");

    const readResponse = await requestSourceFileRead({
      root: workspace,
      path: "press/report/chapters/01-intro/content/01-start.mdx",
    });

    assert.equal(readResponse.status, 200);
    assert.equal(readResponse.body.ok, true);
    assert.equal(readResponse.body.source.text, "## Old heading\n\nParagraph text.\n");

    const writeResponse = await requestSourceEdit({
      root: workspace,
      body: {
        type: "source-file-edit",
        path: "press/report/chapters/01-intro/content/01-start.mdx",
        text: "## New heading\n\nUpdated paragraph.\n",
        refreshDocument: false,
      },
    });

    assert.equal(writeResponse.status, 200);
    assert.equal(writeResponse.body.ok, true);
    assert.equal(writeResponse.body.edit.path, "press/report/chapters/01-intro/content/01-start.mdx");
    assert.equal(await fs.readFile(sourcePath, "utf8"), "## New heading\n\nUpdated paragraph.\n");
  } finally {
    await rmWithRetry(workspace);
  }
});

test("source edit endpoint previews a complete MDX source file without writing it", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-source-file-preview-"));
  try {
    await fs.writeFile(
      path.join(workspace, "package.json"),
      JSON.stringify({ name: "file-preview-fixture", private: true }, null, 2),
    );
    await fs.mkdir(path.join(workspace, "press", "report", "chapters", "01-intro", "content"), { recursive: true });
    await fs.writeFile(
      path.join(workspace, "press", "report", "press.tsx"),
      `import { Frame, MdxArea, Press } from "@open-press/core";\nimport { mdxSource } from "@open-press/core/mdx";\nimport { Sections } from "@open-press/core/manuscript";\nfunction Page({ frameKey, chainId }) {\n  return (<Frame frameKey={frameKey} role="manuscript.content"><MdxArea chainId={chainId} /></Frame>);\n}\nexport default function Doc() {\n  return (<Press slug="report" title="Preview Fixture" sources={[mdxSource({ id: "story", preset: "section-folders", root: "report/chapters" })]}><Sections source="story" page={Page} /></Press>);\n}\n`,
      "utf8",
    );
    const sourcePath = path.join(workspace, "press", "report", "chapters", "01-intro", "content", "01-start.mdx");
    await fs.writeFile(sourcePath, "## Old heading\n\nParagraph text.\n", "utf8");

    const previewResponse = await requestSourceEdit({
      root: workspace,
      body: {
        type: "source-file-preview",
        path: "press/report/chapters/01-intro/content/01-start.mdx",
        text: "## Draft heading\n\nPreview paragraph.\n",
      },
    });

    assert.equal(previewResponse.status, 200, JSON.stringify(previewResponse.body));
    assert.equal(previewResponse.body.ok, true);
    assert.equal(previewResponse.body.preview.path, "press/report/chapters/01-intro/content/01-start.mdx");
    assert.match(previewResponse.body.document.blocks[0].html, /Draft heading/);
    assert.equal(await fs.readFile(sourcePath, "utf8"), "## Old heading\n\nParagraph text.\n");
  } finally {
    await rmWithRetry(workspace);
  }
});

test("source edit endpoint applies a source-mapped object text edit in the React document entry", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-object-text-edit-"));
  try {
    await fs.writeFile(
      path.join(workspace, "package.json"),
      JSON.stringify({ name: "object-text-edit-fixture", private: true }, null, 2),
    );
    await fs.mkdir(path.join(workspace, "press", "report"), { recursive: true });
    const entryPath = path.join(workspace, "press", "report", "press.tsx");
    await fs.writeFile(
      entryPath,
      `import { Frame, Press, Text } from "@open-press/core";\nconst title = "Old slide title";\nexport default function Doc() {\n  return <Press slug="report" title="Source Edit"><Frame frameKey="slide-01"><Text label="title" source={{ path: "press/report/press.tsx", source: { line: 2, column: 16, endLine: 2, endColumn: 31 } }}>{title}</Text></Frame></Press>;\n}\n`,
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

test("source edit endpoint updates an existing static slide note", async () => {
  const workspace = await createSlideNotesWorkspace({
    source: `import { Frame } from "@open-press/core";

export const notes = \`Old speaker note\`;

export default function CoverSlide() {
  return <Frame frameKey="cover">Cover</Frame>;
}
`,
  });
  try {
    const response = await requestSourceEdit({
      root: workspace,
      body: {
        type: "slide-notes",
        slug: "deck",
        id: "cover",
        notes: "Line one\nLine \"two\"",
        refreshDocument: false,
      },
    });

    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.deepEqual(response.body.slide, {
      id: "cover",
      notes: "Line one\nLine \"two\"",
    });
    const source = await readSlideNotesFixture(workspace);
    assert.match(source, /export const notes = "Line one\\nLine \\"two\\"";/);
    assert.match(source, /return <Frame frameKey="cover">Cover<\/Frame>;/);
    assert.doesNotMatch(source, /Old speaker note/);
  } finally {
    await rmWithRetry(workspace);
  }
});

test("source edit endpoint adds a static slide note when the export is missing", async () => {
  const workspace = await createSlideNotesWorkspace({
    source: `import { Frame } from "@open-press/core";

export default function CoverSlide() {
  return <Frame frameKey="cover">Cover</Frame>;
}
`,
  });
  try {
    const response = await requestSourceEdit({
      root: workspace,
      body: {
        type: "slide-notes",
        slug: "deck",
        id: "cover",
        notes: "New speaker note",
        refreshDocument: false,
      },
    });

    assert.equal(response.status, 200, JSON.stringify(response.body));
    const source = await readSlideNotesFixture(workspace);
    assert.match(source, /export const notes = "New speaker note";\n\nexport default function CoverSlide/);
  } finally {
    await rmWithRetry(workspace);
  }
});

test("source edit endpoint adds a blank slide without reading a legacy template request", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-slide-template-edit-"));
  try {
    await fs.writeFile(
      path.join(workspace, "package.json"),
      JSON.stringify({ name: "slide-template-edit-fixture", private: true }, null, 2),
    );
    await fs.mkdir(path.join(workspace, "press", "deck", "slides", "cover"), { recursive: true });
    await fs.writeFile(
      path.join(workspace, "press", "deck", "press.tsx"),
      `import { Press, Slide } from "@open-press/core";
export default function Deck() {
  return <Press slug="deck" title="Deck" type="slides" page="slide-16-9"><Slide id="cover" /></Press>;
}
`,
      "utf8",
    );
    await fs.writeFile(
      path.join(workspace, "press", "deck", "slides", "cover", "slide.tsx"),
      `export default function CoverSlide() { return null; }\n`,
      "utf8",
    );
    await fs.mkdir(path.join(workspace, "press", "deck", "slide-style", "templates", "statement"), { recursive: true });
    await fs.writeFile(
      path.join(workspace, "press", "deck", "slide-style", "manifest.json"),
      JSON.stringify({
        id: "fixture-style",
        version: "1.0.0",
        defaultTemplate: "blank",
        templates: {
          statement: { source: "templates/statement/slide.tsx", description: "Statement" },
        },
      }, null, 2),
      "utf8",
    );
    await fs.writeFile(
      path.join(workspace, "press", "deck", "slide-style", "templates", "statement", "slide.tsx"),
      `import { Frame, Slide, Text } from "@open-press/core";
export default function __SLIDE_COMPONENT__() {
  return (
    <Slide id="__SLIDE_ID__">
      <Frame frameKey="copy"><Text as="h1">Copied statement template for __SLIDE_ID__</Text></Frame>
    </Slide>
  );
}
`,
      "utf8",
    );

    const response = await requestSourceEdit({
      root: workspace,
      body: {
        type: "slide-add",
        slug: "deck",
        id: "closing",
        template: "statement",
        refreshDocument: false,
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.slide.id, "closing");
    const slide = await fs.readFile(path.join(workspace, "press", "deck", "slides", "closing", "slide.tsx"), "utf8");
    assert.match(slide, /New slide placeholder for closing/);
    assert.match(slide, /export default function ClosingSlide/);
  } finally {
    await rmWithRetry(workspace);
  }
});

async function requestSourceFileRead({ root, path: sourcePath }) {
  const req = Readable.from([]);
  req.method = "GET";
  req.url = `/__openpress/source-edit?type=source-file&path=${encodeURIComponent(sourcePath)}`;
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

async function createSlideNotesWorkspace({ source }) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-slide-notes-edit-"));
  await fs.writeFile(
    path.join(workspace, "package.json"),
    JSON.stringify({ name: "slide-notes-edit-fixture", private: true }, null, 2),
  );
  await fs.mkdir(path.join(workspace, "press", "deck", "slides", "cover"), { recursive: true });
  await fs.writeFile(
    path.join(workspace, "press", "deck", "press.tsx"),
    `import { Press, Slide } from "@open-press/core";
export default function Deck() {
  return <Press slug="deck" title="Deck" type="slides" page="slide-16-9"><Slide id="cover" /></Press>;
}
`,
    "utf8",
  );
  await fs.writeFile(
    path.join(workspace, "press", "deck", "slides", "cover", "slide.tsx"),
    source,
    "utf8",
  );
  return workspace;
}

function readSlideNotesFixture(workspace) {
  return fs.readFile(path.join(workspace, "press", "deck", "slides", "cover", "slide.tsx"), "utf8");
}

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
