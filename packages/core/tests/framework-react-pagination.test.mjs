import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { normalizeConfig } from "../engine/runtime/config.mjs";
import { buildReactMeasurementCss } from "../engine/react/measurement-css.mjs";
import { measureFrames } from "../engine/react/pipeline/frame-measurement.mjs";
import { paginateMeasuredBlocks } from "../engine/react/pagination.mjs";
import { discoverSectionStyles } from "../engine/react/style-discovery.mjs";

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

test("measureFrames applies a 4 percent capacity safety inset", async () => {
  const measurement = await measureFrames({
    pressHtml: [
      '<section class="reader-page" data-openpress-frame-key="fixture">',
      '  <div class="page-frame">',
      '    <main class="page-body">',
      '      <div class="openpress-mdx-area" data-openpress-mdx-area="true" data-openpress-mdx-area-chain="story:intro"></div>',
      "    </main>",
      "  </div>",
      "</section>",
    ].join(""),
    sources: {},
    renderRegistry: new Map(),
    css: [
      ".reader-page { display: block; width: 100px; height: 1000px; }",
      ".page-frame, .page-body { height: 1000px; }",
    ].join("\n"),
    viewport: { width: 100, height: 1000 },
  });

  assert.equal(Math.round(measurement.mdxAreas[0].rawHeight), 1000);
  assert.equal(Math.round(measurement.mdxAreas[0].capacity), 960);
});

test("measureFrames measures MdxArea slots even when theme sets final area height auto", async () => {
  const measurement = await measureFrames({
    pressHtml: [
      '<section class="reader-page reader-page--toc" data-openpress-frame-key="toc">',
      '  <div class="page-frame">',
      '    <main class="page-body">',
      '      <div class="openpress-mdx-area openpress-toc-area" data-openpress-mdx-area="true" data-openpress-mdx-area-chain="toc:story"></div>',
      "    </main>",
      "  </div>",
      "</section>",
    ].join(""),
    sources: {},
    renderRegistry: new Map(),
    css: [
      ".reader-page { display: block; width: 100px; height: 1000px; }",
      ".page-frame, .page-body { height: 1000px; }",
      ".reader-page--toc .openpress-toc-area { display: flow-root; height: auto; }",
    ].join("\n"),
    viewport: { width: 100, height: 1000 },
  });

  assert.equal(Math.round(measurement.mdxAreas[0].rawHeight), 1000);
  assert.equal(Math.round(measurement.mdxAreas[0].capacity), 960);
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
    const workspace = await discoverSectionStyles(root, config);
    const css = await buildReactMeasurementCss(root, config, workspace);

    assert.match(css, /font-family: "Fixture"/);
    assert.match(css, /file:\/\/.*fixture\.woff2/);
    assert.match(css, /--fixture-token: 1/);
    assert.match(css, /base\/page-contract\.css/);
    assert.match(css, /\.card \{ padding: 1px; \}/);
    assert.match(css, /\.diagram \{ display: block; \}/);
    assert.match(css, /\[data-section-id="intro"\] :where\(h2\)/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
