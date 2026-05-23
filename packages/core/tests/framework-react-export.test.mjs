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
  await writeFile(
    path.join(workspace, "document/theme/base/page-contract.css"),
    [
      ".reader-page { display: block; width: 794px; height: 1123px; }",
      ".page-frame { height: 100%; display: grid; grid-template-rows: 24px minmax(0, 1fr) 24px; padding: 40px; }",
      ".reader-page--toc .page-frame { grid-template-rows: auto minmax(0, 1fr); }",
      ".page-body { min-height: 0; }",
      ".openpress-mdx-area { height: 100%; }",
    ].join("\n"),
  );
  await writeFile(
    path.join(workspace, "document/theme/page-surfaces/toc.css"),
    [
      ".toc-list { margin: 0; padding: 0; list-style: none; }",
      ".toc-list a { display: grid; grid-template-columns: 24px 1fr 32px; }",
      ".toc-list li { padding: 4px 0; }",
    ].join("\n"),
  );
  for (const cssFile of ["base/typography.css", "page-surfaces/cover.css", "page-surfaces/back-cover.css", "shell/reader-controls.css", "base/print.css"]) {
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

test("exportReactDocument keeps short TOC chains in one Toc frame", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(path.join(workspace, "document/index.tsx"), PRESS_FIXTURE);
    for (const [dir, title] of [
      ["01-intro", "Introduction"],
      ["02-method", "Method"],
      ["03-results", "Results"],
    ]) {
      await writeFile(
        path.join(workspace, `document/chapters/${dir}/content/01-start.mdx`),
        `## ${title}\n\nShort section.\n`,
      );
    }

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    const tocFrames = documentJson.source.frames.filter((f) => f.role === "manuscript.toc");

    assert.equal(tocFrames.length, 1);
    assert.deepEqual(tocFrames[0].mdxAreas[0].blockIds, [
      "toc-story-intro",
      "toc-story-method",
      "toc-story-results",
    ]);
  });
});

test("exportReactDocument builds TOC titles and heading numbers from MDX headings", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(path.join(workspace, "document/index.tsx"), PRESS_FIXTURE);
    await writeFile(
      path.join(workspace, "document/chapters/01-intro/content/01-start.mdx"),
      [
        "## Real Introduction",
        "",
        "Opening paragraph.",
        "",
        "### First Topic",
        "",
        "Topic paragraph.",
      ].join("\n"),
    );
    await writeFile(
      path.join(workspace, "document/chapters/02-method/content/01-start.mdx"),
      "## Methodology\n\nShort section.\n",
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    const tocBlock = documentJson.blocks.find((block) => block.role === "manuscript.toc");
    const introHtml = documentJson.blocks
      .filter((block) => block.role === "manuscript.content" && block.frameKey.startsWith("story:intro:content:"))
      .map((block) => block.html)
      .join("\n");

    assert.ok(tocBlock, "should render a TOC frame");
    assert.match(tocBlock.html, /Real Introduction/);
    assert.match(tocBlock.html, /First Topic/);
    assert.match(tocBlock.html, /data-toc-index="01"/);
    assert.match(tocBlock.html, /data-toc-index="1\.1"/);
    assert.doesNotMatch(tocBlock.html, />Intro</);

    assert.ok(introHtml, "should render the intro content frames");
    assert.match(introHtml, /<h2[^>]+id="section-intro"[^>]+data-chapter="01"[^>]*>Real Introduction<\/h2>/);
    assert.match(introHtml, /<h3[^>]+data-section="1\.1"[^>]*>First Topic<\/h3>/);
  });
});

test("exportReactDocument paginates TOC entries with list margin and gap", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "document/theme/page-surfaces/toc.css"),
      [
        ".reader-page { height: 600px; }",
        ".reader-page--toc .toc-header { display: none; }",
        ".reader-page--toc .openpress-toc-area { height: 552px; }",
        ".toc-list { display: flex; flex-direction: column; gap: 20px; margin: 100px 0 0; padding: 0; list-style: none; }",
        ".toc-list a { display: grid; grid-template-columns: 24px 1fr 32px; }",
        ".toc-list li { box-sizing: border-box; height: 100px; padding: 0; }",
      ].join("\n"),
    );
    await writeFile(path.join(workspace, "document/index.tsx"), PRESS_FIXTURE);
    for (const [dir, title] of [
      ["01-one", "One"],
      ["02-two", "Two"],
      ["03-three", "Three"],
      ["04-four", "Four"],
      ["05-five", "Five"],
      ["06-six", "Six"],
    ]) {
      await writeFile(
        path.join(workspace, `document/chapters/${dir}/content/01-start.mdx`),
        `## ${title}\n\nShort section.\n`,
      );
    }

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    const tocFrames = documentJson.source.frames.filter((f) => f.role === "manuscript.toc");

    assert.equal(tocFrames.length, 2);
    assert.deepEqual(tocFrames.map((frame) => frame.mdxAreas[0].blockIds.length), [3, 3]);
  });
});

test("exportReactDocument uses a 4 percent capacity safety inset", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "document/theme/base/page-contract.css"),
      [
        ".reader-page { display: block; width: 794px; height: 1123px; }",
        ".page-frame { height: 100%; display: grid; grid-template-rows: minmax(0, 1fr); padding: 40px; }",
        ".page-body { min-height: 0; }",
        ".openpress-mdx-area { height: 100%; }",
      ].join("\n"),
    );
    await writeFile(
      path.join(workspace, "document/theme/base/typography.css"),
      [
        "[data-openpress-block-id] { box-sizing: border-box; margin: 0 !important; padding: 0 !important; }",
        "h2[data-openpress-block-id] { height: 100px !important; min-height: 100px !important; }",
        "p[data-openpress-block-id] { height: 880px !important; min-height: 880px !important; }",
      ].join("\n"),
    );
    await writeFile(path.join(workspace, "document/index.tsx"), PRESS_FIXTURE);
    await writeFile(
      path.join(workspace, "document/chapters/01-intro/content/01-start.mdx"),
      "## Intro\n\nThis paragraph should fit with a 4 percent safety inset.\n",
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    const contentFrames = documentJson.source.frames.filter((f) => f.frameKey.startsWith("story:intro:content:"));

    assert.equal(contentFrames.length, 1);
    assert.deepEqual(contentFrames[0].mdxAreas[0].blockIds, [
      "b-intro-01-start-0",
      "b-intro-01-start-1",
    ]);
  });
});

test("exportReactDocument keeps headings with the following block when paginating", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "document/theme/base/page-contract.css"),
      [
        ".reader-page { display: block; width: 794px; height: 1123px; }",
        ".page-frame { height: 100%; display: grid; grid-template-rows: minmax(0, 1fr); padding: 40px; }",
        ".page-body { min-height: 0; }",
        ".openpress-mdx-area { height: 100%; }",
      ].join("\n"),
    );
    await writeFile(
      path.join(workspace, "document/theme/base/typography.css"),
      [
        "[data-openpress-block-id] { box-sizing: border-box; margin: 0 !important; padding: 0 !important; }",
        "h2[data-openpress-block-id] { height: 100px !important; min-height: 100px !important; }",
        "h3[data-openpress-block-id] { height: 60px !important; min-height: 60px !important; }",
        "p[data-openpress-block-id] { height: 120px !important; min-height: 120px !important; }",
        'p[data-openpress-block-id="b-intro-01-start-1"] { height: 830px !important; min-height: 830px !important; }',
      ].join("\n"),
    );
    await writeFile(path.join(workspace, "document/index.tsx"), PRESS_FIXTURE);
    await writeFile(
      path.join(workspace, "document/chapters/01-intro/content/01-start.mdx"),
      [
        "## Intro",
        "",
        "Opening paragraph.",
        "",
        "### Must Not Be Isolated",
        "",
        "This paragraph should stay with its heading.",
      ].join("\n"),
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    const contentFrames = documentJson.source.frames.filter((f) => f.frameKey.startsWith("story:intro:content:"));

    assert.equal(contentFrames.length, 2);
    assert.deepEqual(contentFrames[0].mdxAreas[0].blockIds, [
      "b-intro-01-start-0",
      "b-intro-01-start-1",
    ]);
    assert.deepEqual(contentFrames[1].mdxAreas[0].blockIds, [
      "b-intro-01-start-2",
      "b-intro-01-start-3",
    ]);
  });
});

test("exportReactDocument splits markdown tables by row across content frames", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "document/theme/base/page-contract.css"),
      [
        ".reader-page { display: block; width: 794px; height: 520px; }",
        ".page-frame { height: 100%; display: grid; grid-template-rows: minmax(0, 1fr); padding: 0; }",
        ".page-body { min-height: 0; }",
        ".openpress-mdx-area { height: 100%; }",
      ].join("\n"),
    );
    await writeFile(
      path.join(workspace, "document/theme/base/typography.css"),
      [
        "[data-openpress-block-id], table, tr { box-sizing: border-box; margin: 0 !important; padding: 0 !important; }",
        "h2[data-openpress-block-id] { height: 60px !important; min-height: 60px !important; }",
        "thead { height: 40px !important; min-height: 40px !important; }",
        "tr { height: 120px !important; min-height: 120px !important; }",
      ].join("\n"),
    );
    await writeFile(path.join(workspace, "document/index.tsx"), PRESS_FIXTURE);
    await writeFile(
      path.join(workspace, "document/chapters/01-intro/content/01-start.mdx"),
      [
        "## Table",
        "",
        "| Name | Value |",
        "| --- | --- |",
        "| Row 1 | A |",
        "| Row 2 | B |",
        "| Row 3 | C |",
        "| Row 4 | D |",
        "| Row 5 | E |",
      ].join("\n"),
    );

    const result = await exportReactDocument(workspace, { syncAssets: false });
    const documentJson = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    const contentFrames = documentJson.source.frames.filter((f) => f.frameKey.startsWith("story:intro:content:"));
    const pageHtml = documentJson.blocks
      .filter((block) => block.frameKey?.startsWith("story:intro:content:"))
      .map((block) => block.html);

    assert.equal(contentFrames.length, 2);
    assert.deepEqual(contentFrames[0].mdxAreas[0].blockIds, [
      "b-intro-01-start-0",
      "b-intro-01-start-1-r0",
      "b-intro-01-start-1-r1",
    ]);
    assert.deepEqual(contentFrames[1].mdxAreas[0].blockIds, [
      "b-intro-01-start-1-r2",
      "b-intro-01-start-1-r3",
      "b-intro-01-start-1-r4",
    ]);
    assert.match(pageHtml[0], /Row 1/);
    assert.match(pageHtml[0], /Row 2/);
    assert.doesNotMatch(pageHtml[0], /Row 3/);
    assert.doesNotMatch(pageHtml[1], /<thead>/);
    assert.match(pageHtml[1], /Row 3/);
    assert.match(pageHtml[1], /Row 4/);
    assert.match(pageHtml[1], /Row 5/);
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
