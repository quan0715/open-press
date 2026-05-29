import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { exportReactDocument } from "../engine/react/document-export.mjs";

async function withTempWorkspace(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-object-entities-"));
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
