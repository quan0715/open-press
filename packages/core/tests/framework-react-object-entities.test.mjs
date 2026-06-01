import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exportReactDocument } from "../engine/react/document-export.mjs";
import { addLiteralTextSourceProps } from "../engine/react/text-source-transform.mjs";
import { rmWithRetry } from "./_temp.mjs";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..", "..", "..");

async function withTempWorkspace(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-object-entities-"));
  try {
    return await fn(dir);
  } finally {
    await rmWithRetry(dir);
  }
}

async function writeFile(filePath, source) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, source, "utf8");
}

async function writeMinimalTheme(workspace) {
  await writeFile(
    path.join(workspace, "press/theme/base/page-contract.css"),
    [
      ".reader-page { display: block; width: 794px; height: 1123px; }",
      ".page-frame { height: 100%; display: grid; grid-template-rows: 24px minmax(0, 1fr) 24px; padding: 40px; }",
      ".page-body { min-height: 0; }",
      ".openpress-mdx-area { height: 100%; }",
    ].join("\n"),
  );
  for (const cssFile of ["tokens.css", "base/typography.css", "page-surfaces/toc.css", "page-surfaces/cover.css", "page-surfaces/back-cover.css", "shell/reader-controls.css", "base/print.css"]) {
    await writeFile(path.join(workspace, "press/theme", cssFile), `/* ${cssFile} */\n`);
  }
  await fs.mkdir(path.join(workspace, "press/media"), { recursive: true });
}

const PRESS_FIXTURE = `import { Frame, MdxArea, Press, Workspace } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections } from "@open-press/core/manuscript";

function Page({ frameKey, chainId }) {
  return (
    <Frame frameKey={frameKey} role="manuscript.content">
      <div className="page-frame">
        <main className="page-body">
          <MdxArea chainId={chainId} />
        </main>
      </div>
    </Frame>
  );
}

export default function FixturePress() {
  return (
    <Workspace>
      <Press
        title="Object Entity Fixture"
        sources={[mdxSource({ id: "story", preset: "section-folders", root: "chapters" })]}
      >
        <Sections source="story" page={Page} />
      </Press>
    </Workspace>
  );
}
`;

const KERNEL_OBJECT_FIXTURE = `import { Frame, Press, Text, Workspace } from "@open-press/core";

function Cover() {
  return (
    <Frame frameKey="cover" role="document.cover" chrome={false} data-page-title="Cover">
      <Frame frameKey="hero" role="region" className="hero-region">
        <Text
          as="p"
          objectId="title"
          label="Cover title"
          source={{ path: "press/index.tsx", kind: "tsx-text", objectId: "title", scope: "Cover" }}
        >
          Kernel title
        </Text>
      </Frame>
    </Frame>
  );
}

export default function FixturePress() {
  return (
    <Workspace>
      <Press title="Kernel Object Fixture">
        <Cover />
      </Press>
    </Workspace>
  );
}
`;

const AUTO_TEXT_SOURCE_FIXTURE = `import { Frame, Press, Text, Workspace } from "@open-press/core";

export default function FixturePress() {
  return (
    <Workspace>
      <Press title="Auto Text Source Fixture" page="slide-16-9">
        <Frame frameKey="slide-01" role="canvas.slide" chrome={false}>
          <Text as="h1" objectId="title" label="Slide title">
            Auto mapped title
          </Text>
        </Frame>
      </Press>
    </Workspace>
  );
}
`;

test("exportReactDocument emits rendered object entities", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(path.join(workspace, "press/index.tsx"), PRESS_FIXTURE);
    await writeFile(
      path.join(workspace, "press/chapters/01-intro/content/01-start.mdx"),
      "## Introduction\n\nThis is a source backed paragraph.\n",
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));

    const contentFrame = documentJson.source.frames.find((frame) => frame.role === "manuscript.content");
    assert.ok(contentFrame, "should have a content frame");
    const area = contentFrame.mdxAreas[0];
    const blockId = area.blockIds[0];

    const entities = documentJson.source.objectEntities;
    const pageId = `page:${encodeURIComponent(contentFrame.frameKey)}`;
    const frameId = `frame:${encodeURIComponent(contentFrame.frameKey)}`;
    const areaId = `mdx-area:${encodeURIComponent(contentFrame.frameKey)}:${encodeURIComponent(area.chainId)}:${area.indexInFrame}`;

    assert.ok(entities[pageId]);
    assert.ok(entities[frameId]);
    assert.ok(entities[areaId]);
    assert.ok(entities[`mdx-block:${blockId}`]);
    assert.equal(entities[`mdx-block:${blockId}`].source.path.endsWith(".mdx"), true);
  });
});

test("exportReactDocument indexes author-declared Text and nested Frame entities", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(path.join(workspace, "press/index.tsx"), KERNEL_OBJECT_FIXTURE);

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));

    const entities = documentJson.source.objectEntities;
    const pageId = "page:cover";
    const rootFrameId = "frame:cover";
    const nestedFrameId = "frame:frame%3Acover:hero";
    const textId = "text:frame%3Aframe%253Acover%3Ahero:title";

    assert.equal(documentJson.blocks[0].role, "document.cover");
    assert.equal(entities[pageId].kind, "page");
    assert.equal(entities[rootFrameId].kind, "frame");
    assert.equal(entities[nestedFrameId].kind, "frame");
    assert.equal(entities[nestedFrameId].parentId, rootFrameId);
    assert.equal(entities[nestedFrameId].pageId, pageId);
    assert.equal(entities[textId].kind, "text");
    assert.equal(entities[textId].label, "Cover title");
    assert.equal(entities[textId].parentId, nestedFrameId);
    assert.equal(entities[textId].source.path, "press/index.tsx");
    assert.equal(entities[textId].source.kind, "tsx-text");
  });
});

test("exportReactDocument derives source ranges for literal Text children", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    const entryPath = path.join(workspace, "press/index.tsx");
    await writeFile(entryPath, AUTO_TEXT_SOURCE_FIXTURE);

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));

    const textId = "text:frame%3Aslide-01:title";
    const textEntity = documentJson.source.objectEntities[textId];
    assert.equal(textEntity.kind, "text");
    assert.equal(textEntity.source.path, "press/index.tsx");
    assert.equal(sourceRangeText(AUTO_TEXT_SOURCE_FIXTURE, textEntity.source.source), "Auto mapped title");
    assert.match(documentJson.blocks[0].html, /data-openpress-object-source=/);
    assert.equal(documentJson.blocks[0].html.includes("press/index.tsx"), true);
  });
});

test("addLiteralTextSourceProps leaves expression-backed Text source explicit", () => {
  const source = `import { Text } from "@open-press/core";
const title = "Expression title";
export function Title() {
  return (
    <>
      <Text objectId="title" label="Title">{title}</Text>
      <Text objectId="caption" label="Caption" source={{ path: "press/index.tsx" }}>Manual caption</Text>
    </>
  );
}
`;

  const result = addLiteralTextSourceProps(source, {
    filePath: "/workspace/press/index.tsx",
    sourcePath: "press/index.tsx",
  });

  assert.equal(result.match(/source=/g)?.length, 1);
  assert.match(result, /Manual caption/);
  assert.match(result, /{title}/);
});

test("addLiteralTextSourceProps only targets OpenPress Text imports", () => {
  const localText = `function Text({ children }) {
  return <span>{children}</span>;
}
export function Title() {
  return <Text>Local text</Text>;
}
`;
  const aliasedText = `import { Text as EditableText } from "@open-press/core";
export function Title() {
  return <EditableText objectId="title" label="Title">Editable title</EditableText>;
}
`;

  assert.equal(addLiteralTextSourceProps(localText), localText);
  assert.match(addLiteralTextSourceProps(aliasedText), /source=\{\{/);
});

test("dogfood social Press declares source-backed Text objects", async () => {
  const entryPath = path.join(REPO_ROOT, "press/index.tsx");
  const source = await fs.readFile(entryPath, "utf8");
  const transformed = addLiteralTextSourceProps(source, {
    filePath: entryPath,
    sourcePath: "press/index.tsx",
  });
  const socialStart = transformed.indexOf("function SocialPlaceholder");
  const socialEnd = transformed.indexOf("// Minimal slide Press");

  assert.ok(socialStart > -1, "should find the dogfood social Press");
  assert.ok(socialEnd > socialStart, "should isolate the dogfood social Press");

  const socialBlock = transformed.slice(socialStart, socialEnd);
  assert.match(socialBlock, /objectId="title"[\s\S]*source=\{\{/);
  assert.match(socialBlock, /objectId="lede"[\s\S]*source=\{\{/);
  assert.match(socialBlock, /objectId="workflow-quote"[\s\S]*source=\{\{/);
  assert.doesNotMatch(socialBlock, /socialFixturePages\.map/);
});

function sourceRangeText(sourceText, sourceRange) {
  const lines = sourceText.split(/\r?\n/);
  const line = lines[sourceRange.line - 1] ?? "";
  assert.equal(sourceRange.line, sourceRange.endLine);
  return line.slice(sourceRange.column - 1, sourceRange.endColumn - 1);
}
