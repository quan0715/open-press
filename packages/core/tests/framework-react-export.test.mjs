import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { exportDocument } from "../engine/document-export.mjs";
import { exportReactDocument } from "../engine/react/document-export.mjs";

async function withTempWorkspace(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-press-tree-export-"));
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
  await writeFile(path.join(workspace, "document/theme/tokens.css"), ":root { --fixture: 1; }\n");
  for (const cssFile of [
    "base/page-contract.css",
    "base/typography.css",
    "page-surfaces/cover.css",
    "page-surfaces/back-cover.css",
    "page-surfaces/toc.css",
    "shell/reader-controls.css",
    "base/print.css",
  ]) {
    await writeFile(path.join(workspace, "document/theme", cssFile), `/* ${cssFile} */\n`);
  }
  await fs.mkdir(path.join(workspace, "document/media"), { recursive: true });
}

const PRESS_FIXTURE = `import { Frame, MdxArea, Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections, Toc } from "@open-press/core/manuscript";

export const config = {
  title: "Fixture Press Doc",
  subtitle: "MDX export",
  publicDir: "public/openpress",
  outputDir: "dist",
};

export const sources = {
  story: mdxSource({ preset: "section-folders", root: "chapters" }),
};

function Cover() {
  return (
    <Frame frameKey="cover" role="manuscript.cover" chrome={false} data-page-title="Cover" id="cover">
      <h1>Fixture Press Doc</h1>
    </Frame>
  );
}

function BackCover() {
  return (
    <Frame frameKey="back-cover" role="manuscript.back-cover" chrome={false} data-page-title="Back Cover" id="back-cover">
      <p>Done</p>
    </Frame>
  );
}

function Page({ frameKey, chainId, pageIndex, totalPages, sectionSlug }) {
  return (
    <Frame
      frameKey={frameKey}
      role="manuscript.content"
      data-page-index={pageIndex}
      data-total-pages={totalPages}
      data-section-id={sectionSlug}
    >
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
    <Press>
      <Cover />
      <Toc source="story" />
      <Sections source="story" page={Page} />
      <BackCover />
    </Press>
  );
}
`;

test("exportReactDocument writes a Press tree document.json with cover/toc/sections/back frames", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(path.join(workspace, "document/index.tsx"), PRESS_FIXTURE);
    await writeFile(
      path.join(workspace, "document/chapters/01-intro/content/01-intro.mdx"),
      "## Introduction\n\nThis is a short fixture chapter.\n\nIt has two paragraphs.\n",
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    assert.ok(result, "export should return a result");
    assert.ok(result.pageCount > 0, "pageCount should be > 0");

    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    assert.equal(documentJson.meta.title, "Fixture Press Doc");
    assert.equal(documentJson.meta.version, "openpress-press-tree-v1");

    const roles = documentJson.source.frames.map((f) => f.role);
    assert.ok(roles.includes("manuscript.cover"), `expected cover role in ${JSON.stringify(roles)}`);
    assert.ok(roles.includes("manuscript.toc"), `expected toc role in ${JSON.stringify(roles)}`);
    assert.ok(roles.includes("manuscript.content"), `expected content role in ${JSON.stringify(roles)}`);
    assert.ok(roles.includes("manuscript.back-cover"), `expected back-cover role in ${JSON.stringify(roles)}`);

    assert.deepEqual(documentJson.source.chains, ["story:intro", "toc:story"]);

    const tocFrame = documentJson.source.frames.find((f) => f.role === "manuscript.toc");
    assert.ok(tocFrame, "should have a toc frame");
    assert.equal(tocFrame.mdxAreas[0].chainId, "toc:story");
    const tocBlock = documentJson.blocks.find((block) => block.role === "manuscript.toc");
    assert.match(tocBlock.html, /Intro/);
    assert.match(tocBlock.html, /class="toc-page"/);

    const contentFrame = documentJson.source.frames.find((f) => f.role === "manuscript.content");
    assert.ok(contentFrame, "should have a content frame");
    assert.ok(contentFrame.mdxAreas.length === 1, "content frame should have 1 mdx area");
    assert.equal(contentFrame.mdxAreas[0].chainId, "story:intro");
    assert.ok(contentFrame.mdxAreas[0].blockIds.length > 0, "blocks should be allocated");

    // block IDs in blockMap point to source positions
    const blockId = contentFrame.mdxAreas[0].blockIds[0];
    const blockMeta = documentJson.source.blockMap[blockId];
    assert.ok(blockMeta, `blockMap should contain ${blockId}`);
    assert.equal(blockMeta.sectionSlug, "intro");
  });
});

test("exportDocument delegates to React export when document/index.tsx is present", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(path.join(workspace, "document/index.tsx"), PRESS_FIXTURE);
    await writeFile(
      path.join(workspace, "document/chapters/01-intro/content/01-intro.mdx"),
      "## Intro\n\nFirst paragraph.\n",
    );

    const result = await exportDocument(workspace);
    assert.ok(result);
    assert.ok(result.documentPath.endsWith("document.json"));
  });
});

test("exportReactDocument rejects source roots that escape document root", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "document/index.tsx"),
      `import { Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";

export const config = {
  title: "Escaping Source",
  publicDir: "public/openpress",
  outputDir: "dist",
};

export const sources = {
  story: mdxSource({ preset: "section-files", root: "../outside" }),
};

export default function EscapingPress() {
  return <Press />;
}
`,
    );
    await writeFile(path.join(workspace, "outside/01-leak.mdx"), "## Outside\n");

    await assert.rejects(
      () => exportReactDocument(workspace, { syncAssets: false }),
      /document root|contains "\.\."/i,
    );
  });
});

test("exportReactDocument rejects Frames without frameKey", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "document/index.tsx"),
      `import { Frame, Press } from "@open-press/core";

export const config = {
  title: "Missing Frame Key",
  publicDir: "public/openpress",
  outputDir: "dist",
};

export default function MissingFrameKeyPress() {
  return (
    <Press>
      <Frame role="manuscript.cover">Cover</Frame>
    </Press>
  );
}
`,
    );

    await assert.rejects(
      () => exportReactDocument(workspace, { syncAssets: false }),
      /frameKey/i,
    );
  });
});
