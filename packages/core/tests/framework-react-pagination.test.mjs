import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { normalizeConfig } from "../engine/config.mjs";
import { buildReactMeasurementCss } from "../engine/react/measurement-css.mjs";
import { measureBlocksInChromium, paginateMeasuredBlocks } from "../engine/react/pagination.mjs";
import { discoverReactWorkspace } from "../engine/react/workspace-discovery.mjs";

async function writeFile(filePath, source) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, source, "utf8");
}

test("paginateMeasuredBlocks groups measured block ids without splitting atomic blocks", () => {
  const result = paginateMeasuredBlocks(
    [
      { id: "b-intro-0", height: 35 },
      { id: "b-intro-1", height: 40 },
      { id: "b-intro-2", height: 45 },
      { id: "b-intro-3", height: 10 },
    ],
    { pageSafeHeightPx: 80 },
  );

  assert.deepEqual(result.pages, [
    { pageIndex: 0, blockIds: ["b-intro-0", "b-intro-1"], breakAfter: "b-intro-1" },
    { pageIndex: 1, blockIds: ["b-intro-2", "b-intro-3"], breakAfter: "b-intro-3" },
  ]);
  assert.deepEqual(result.warnings, []);
});

test("paginateMeasuredBlocks keeps an overlong block atomic and emits an overflow warning", () => {
  const result = paginateMeasuredBlocks(
    [
      { id: "b-intro-0", height: 20 },
      { id: "b-intro-1", height: 140 },
      { id: "b-intro-2", height: 20 },
    ],
    { pageSafeHeightPx: 80 },
  );

  assert.deepEqual(
    result.pages.map((page) => page.blockIds),
    [["b-intro-0"], ["b-intro-1"], ["b-intro-2"]],
  );
  assert.deepEqual(result.warnings, [
    {
      code: "block-overflows-page",
      blockId: "b-intro-1",
      height: 140,
      pageSafeHeightPx: 80,
    },
  ]);
});

test("measureBlocksInChromium derives safe height from rendered page body when no fixed height is configured", async () => {
  const result = await measureBlocksInChromium({
    html: `
      <section class="reader-page reader-page--content" data-page-kind="content">
        <div class="page-frame">
          <main class="page-body">
            <p class="block" data-openpress-block-id="b-1"></p>
            <p class="block" data-openpress-block-id="b-2"></p>
            <p class="block" data-openpress-block-id="b-3"></p>
          </main>
        </div>
      </section>
    `,
    css: `
      .reader-page { width: 200px; height: 200px; }
      .page-frame { height: 100%; }
      .page-body { height: 100px; }
      .block { display: block; height: 40px; margin: 0; }
    `,
    viewport: { width: 240, height: 240 },
  });

  assert.deepEqual(
    result.pages.map((page) => page.blockIds),
    [["b-1", "b-2"], ["b-3"]],
  );
  assert.ok(result.pageSafeHeightPx < 100);
});

test("buildReactMeasurementCss includes real theme, component and chapter scoped CSS", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-react-measure-css-"));
  try {
    await writeFile(path.join(root, "document/theme/fonts.css"), '@font-face { font-family: "Fixture"; src: url("/openpress/fonts/fixture.woff2"); }\n');
    await writeFile(path.join(root, "document/theme/fonts/fixture.woff2"), "font");
    await writeFile(path.join(root, "document/theme/tokens.css"), ":root { --fixture-token: 1; }\n");
    for (const cssFile of [
      "base/page-contract.css",
      "base/typography.css",
      "page-surfaces/cover.css",
      "page-surfaces/back-cover.css",
      "page-surfaces/toc.css",
      "shell/reader-controls.css",
      "base/print.css",
    ]) {
      await writeFile(path.join(root, "document/theme", cssFile), `/* ${cssFile} */\n`);
    }
    await writeFile(path.join(root, "document/theme/patterns/card.css"), ".card { padding: 1px; }\n");
    await writeFile(path.join(root, "document/components/Diagram/style.css"), ".diagram { display: block; }\n");
    await writeFile(path.join(root, "document/components/Diagram/index.tsx"), "export default function Diagram() { return null; }\n");
    await writeFile(path.join(root, "document/chapters/01-intro/content/01-start.mdx"), "## Intro\n");
    await writeFile(path.join(root, "document/chapters/01-intro/styles/chapter.css"), "h2 { color: red; }\n");

    const config = normalizeConfig(root, {
      title: "Measurement CSS",
      documentDir: "document",
      sourceDir: "chapters",
      themeDir: "theme",
      componentsDir: "components",
    });
    const workspace = await discoverReactWorkspace(root, config);
    const css = await buildReactMeasurementCss(root, config, workspace);

    assert.match(css, /font-family: "Fixture"/);
    assert.match(css, /file:\/\/.*fixture\.woff2/);
    assert.match(css, /--fixture-token: 1/);
    assert.match(css, /base\/page-contract\.css/);
    assert.match(css, /\.card \{ padding: 1px; \}/);
    assert.match(css, /\.diagram \{ display: block; \}/);
    assert.match(css, /\[data-chapter-slug="intro"\] :where\(h2\)/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
