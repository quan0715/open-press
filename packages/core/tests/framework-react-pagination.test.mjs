import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { normalizeConfig } from "../engine/runtime/config.mjs";
import { buildReactMeasurementCss } from "../engine/react/measurement-css.mjs";
import { allocateChains } from "../engine/react/pipeline/allocate.mjs";
import { measureFrames } from "../engine/react/pipeline/frame-measurement.mjs";
import { paginateMeasuredBlocks } from "../engine/react/pagination.mjs";
import { resolveAllSources } from "../engine/react/sources/mdx-resolver.mjs";
import { discoverSectionStyles } from "../engine/react/style-discovery.mjs";
import { rmWithRetry } from "./_temp.mjs";

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

test("allocateChains uses source pagination metadata for keep-with-next", () => {
  const frames = [
    {
      frameKey: "page-0",
      mdxAreas: [{ chainId: "story:intro", overflow: "extend", indexInFrame: 0 }],
    },
    {
      frameKey: "page-1",
      mdxAreas: [{ chainId: "story:intro", overflow: "extend", indexInFrame: 0 }],
    },
  ];
  const mdxAreas = [
    { frameKey: "page-0", chainId: "story:intro", indexInFrame: 0, capacity: 120, overflow: "extend" },
    { frameKey: "page-1", chainId: "story:intro", indexInFrame: 0, capacity: 120, overflow: "extend" },
  ];
  const blockHeights = [
    { chainId: "story:intro", id: "lead", height: 40 },
    { chainId: "story:intro", id: "label", height: 30 },
    { chainId: "story:intro", id: "body", height: 80 },
  ];
  const sources = {
    story: {
      chains: {
        "story:intro": [
          { id: "lead", name: "paragraph" },
          { id: "label", name: "paragraph", pagination: { keepWithNext: true } },
          { id: "body", name: "paragraph" },
        ],
      },
    },
  };

  const result = allocateChains({ frames, mdxAreas, blockHeights, sources });

  assert.deepEqual(result.allocation["page-0"]["story:intro"][0], ["lead"]);
  assert.deepEqual(result.allocation["page-1"]["story:intro"][0], ["label", "body"]);
});

test("allocateChains avoids starting a row-split table when too few rows fit", () => {
  const frames = [
    {
      frameKey: "page-0",
      mdxAreas: [{ chainId: "story:intro", overflow: "extend", indexInFrame: 0 }],
    },
    {
      frameKey: "page-1",
      mdxAreas: [{ chainId: "story:intro", overflow: "extend", indexInFrame: 0 }],
    },
  ];
  const mdxAreas = [
    { frameKey: "page-0", chainId: "story:intro", indexInFrame: 0, capacity: 200, overflow: "extend" },
    { frameKey: "page-1", chainId: "story:intro", indexInFrame: 0, capacity: 200, overflow: "extend" },
  ];
  const blockHeights = [
    { chainId: "story:intro", id: "lead", height: 80 },
    { chainId: "story:intro", id: "table-r0", height: 70 },
    { chainId: "story:intro", id: "table-r1", height: 35 },
    { chainId: "story:intro", id: "table-r2", height: 35 },
    { chainId: "story:intro", id: "table-r3", height: 35 },
  ];
  const sources = {
    story: {
      chains: {
        "story:intro": [
          { id: "lead", name: "paragraph" },
          { id: "table-r0", kind: "table-row", name: "table-row", tableId: "table", rowIndex: 0 },
          { id: "table-r1", kind: "table-row", name: "table-row", tableId: "table", rowIndex: 1 },
          { id: "table-r2", kind: "table-row", name: "table-row", tableId: "table", rowIndex: 2 },
          { id: "table-r3", kind: "table-row", name: "table-row", tableId: "table", rowIndex: 3 },
        ],
      },
    },
  };

  const result = allocateChains({ frames, mdxAreas, blockHeights, sources });

  assert.deepEqual(result.allocation["page-0"]["story:intro"][0], ["lead"]);
  assert.deepEqual(result.allocation["page-1"]["story:intro"][0], [
    "table-r0",
    "table-r1",
    "table-r2",
    "table-r3",
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

test("measureFrames applies author MdxArea class context to table block measurements", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-table-measurement-"));
  try {
    await writeFile(
      path.join(workspace, "press/report/chapters/01-intro/content/01-start.mdx"),
      [
        "| Name | Value |",
        "| --- | --- |",
        "| Row 1 | A |",
        "| Row 2 | B |",
      ].join("\n"),
    );
    const { resolved: sources, renderData: renderRegistry } = await resolveAllSources({
      sources: {
        story: { type: "mdx", preset: "section-folders", root: "report/chapters" },
      },
      documentRoot: path.join(workspace, "press"),
      globalComponents: {},
    });

    const measurement = await measureFrames({
      pressHtml: [
        '<section class="reader-page" data-openpress-frame-key="fixture">',
        '  <div class="page-frame">',
        '    <main class="page-body">',
        '      <div class="openpress-mdx-area table-measurement-prose" data-openpress-mdx-area="true" data-openpress-mdx-area-chain="story:intro"></div>',
        "    </main>",
        "  </div>",
        "</section>",
      ].join(""),
      sources,
      renderRegistry,
      css: [
        ".reader-page { display: block; width: 600px; height: 600px; }",
        ".page-frame, .page-body { height: 600px; }",
        ".table-measurement-prose table { border-collapse: collapse; }",
        ".table-measurement-prose th, .table-measurement-prose td { padding-top: 20px; padding-bottom: 20px; }",
      ].join("\n"),
      viewport: { width: 600, height: 600 },
    });
    const secondRow = measurement.blockHeights.find((block) => block.id === "b-intro-01-start-0-r1");

    assert.ok(secondRow, "expected table second row to be measured");
    assert.ok(secondRow.height >= 50, `expected MdxArea descendant cell padding in row height, got ${secondRow.height}`);
  } finally {
    await rmWithRetry(workspace);
  }
});

test("frame measurement keeps TOC visual styling out of the measurement shell", async () => {
  const source = await fs.readFile(
    new URL("../engine/react/pipeline/frame-measurement.mjs", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /MEASUREMENT_TOC_CSS/);
  assert.doesNotMatch(source, /\.toc-level-2/);
});

test("buildReactMeasurementCss includes real theme, component and chapter scoped CSS", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-react-measure-css-"));
  try {
    await writeFile(path.join(root, "press/shared/theme/fonts.css"), '@font-face { font-family: "Fixture"; src: url("/openpress/fonts/fixture.woff2"); }\n');
    await writeFile(path.join(root, "press/shared/theme/fonts/fixture.woff2"), "font");
    await writeFile(path.join(root, "press/shared/theme/tokens.css"), ":root { --fixture-token: 1; }\n");
    await writeFile(path.join(root, "press/report/components/Diagram/style.css"), ".diagram { display: block; }\n");
    await writeFile(path.join(root, "press/report/components/Diagram/index.tsx"), "export default function Diagram() { return null; }\n");
    await writeFile(path.join(root, "press/report/chapters/01-intro/content/01-start.mdx"), "## Intro\n");
    await writeFile(path.join(root, "press/report/chapters/01-intro/styles/chapter.css"), "h2 { color: red; }\n");

    const config = normalizeConfig(root, {
      title: "Measurement CSS",
    });
    const workspace = await discoverSectionStyles(root, config, {
      sectionRoots: [path.join(root, "press", "report", "chapters")],
    });
    const css = await buildReactMeasurementCss(root, config, workspace);

    assert.match(css, /font-family: "Fixture"/);
    assert.match(css, /file:\/\/.*fixture\.woff2/);
    assert.match(css, /--fixture-token: 1/);
    // page-contract.css is now prepended by engine from the framework package
    assert.match(css, /framework\/openpress\/page-contract\.css/);
    assert.match(css, /\.diagram \{ display: block; \}/);
    assert.match(css, /\[data-section-id="intro"\] :where\(h2\)/);
  } finally {
    await rmWithRetry(root);
  }
});

test("buildReactMeasurementCss strips viewport media that would make page measurement responsive", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-react-measure-css-media-"));
  try {
    await writeFile(path.join(root, "press/shared/theme/tokens.css"), ":root { --fixture-token: 1; }\n");
    // page-contract.css is now framework-owned. Test the media-stripping behavior via
    // a per-Press theme file, which is the supported CSS escape hatch.
    await writeFile(
      path.join(root, "press/report/theme/fixture.css"),
      [
        ".fixture { color: red; }",
        "@media (max-width: 900px) {",
        "  .fixture { color: blue; }",
        "}",
        "@media print {",
        "  .fixture { break-after: page; }",
        "}",
      ].join("\n"),
    );
    const config = normalizeConfig(root, {
      title: "Measurement CSS",
    });
    const workspace = await discoverSectionStyles(root, config);
    const css = await buildReactMeasurementCss(root, config, workspace);

    // Viewport media queries from workspace CSS should be stripped
    assert.doesNotMatch(css, /\.fixture\s*\{\s*color:\s*blue/);
    // Print media queries should be preserved
    assert.match(css, /@media print/);
    assert.match(css, /break-after:\s*page/);
  } finally {
    await rmWithRetry(root);
  }
});
