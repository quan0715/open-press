import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderMarkdown } from "../engine/markdown-renderer.mjs";
import { renderChartFigure } from "../src/qdoc/chartRenderer.js";

const FIXTURES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "workspace");

const render = (md) => renderMarkdown(md, FIXTURES_DIR);

test("renderChartFigure produces a bar chart with the requested variant class", () => {
  const html = renderChartFigure({
    type: "bar",
    data: {
      title: "Bar",
      caption: "Bar caption.",
      items: [{ label: "A", value: 50 }, { label: "B", value: 80 }],
    },
    variant: "sample-bar",
  });
  assert.ok(html.includes('class="chart-frame qdoc-chart qdoc-chart--bar sample-bar"'));
  assert.ok(html.includes('data-qdoc-chart="bar"'));
});

test("renderChartFigure produces a donut chart with the requested variant class", () => {
  const html = renderChartFigure({
    type: "donut",
    data: {
      title: "Donut",
      caption: "Donut caption.",
      items: [{ name: "A", value: 70 }, { name: "B", value: 30 }],
    },
    variant: "sample-donut",
  });
  assert.ok(html.includes('class="chart-frame qdoc-chart qdoc-chart--donut sample-donut"'));
  assert.ok(html.includes('data-qdoc-chart="donut"'));
});

test("renderChartFigure produces a line chart with the requested variant class", () => {
  const html = renderChartFigure({
    type: "line",
    data: {
      title: "Line",
      caption: "Line caption.",
      min: 0,
      max: 100,
      items: [{ label: "Y1", value: 10 }, { label: "Y2", value: 60 }],
    },
    variant: "sample-line",
  });
  assert.ok(html.includes('class="chart-frame qdoc-chart qdoc-chart--line sample-line"'));
  assert.ok(html.includes('data-qdoc-chart="line"'));
});

test("renderMarkdown resolves a built-in chart package by name", async () => {
  const html = await render('<qdoc-component name="sample-bar" />');
  assert.ok(html.includes('class="qdoc-component-frame qdoc-component-frame--sample-bar"'));
  assert.ok(html.includes('data-qdoc-component-body="sample-bar"'));
  assert.ok(html.includes('class="qdoc-component-frame__body chart-frame qdoc-chart qdoc-chart--bar sample-bar"'));
  assert.ok(html.includes('data-qdoc-chart="bar"'));
  assert.ok(html.includes("Generic caption for the sample bar chart."));
});

test("component figure captions are rendered through the qdoc container contract", async () => {
  const html = await render('<qdoc-component name="sample-figure" />');
  assert.ok(html.includes('class="qdoc-component-frame qdoc-component-frame--sample-figure"'));
  assert.ok(html.includes('data-qdoc-component="sample-figure"'));
  assert.ok(html.includes('class="qdoc-component-frame__body sample-figure"'));
  assert.ok(html.includes('data-qdoc-component-body="sample-figure"'));
  assert.match(html, /<\/div>\s*<figcaption>Sample figure caption\.<\/figcaption>\s*<\/figure>/);
});

test("renderMarkdown resolves a workspace renderer package and passes attrs / data / helpers", async () => {
  const html = await render('<qdoc-component name="sample-renderer" />');
  assert.ok(html.includes('data-qdoc-component="sample-renderer"'));
  assert.ok(html.includes("Hello from the default data file."));
  assert.ok(html.includes('data-tag="default"'));
});

test("renderMarkdown uses data variant when markdown passes data=\"<variant>\"", async () => {
  const html = await render('<qdoc-component name="sample-renderer" data="alt" />');
  assert.ok(html.includes("Hello from the alt variant data file."));
  assert.ok(html.includes('data-tag="alt"'));
});

test("renderMarkdown forwards arbitrary attributes (e.g. variant=) to the workspace renderer", async () => {
  const html = await render('<qdoc-component name="sample-renderer" variant="emphasized" />');
  assert.ok(html.includes('data-variant="emphasized"'));
});

test("renderMarkdown throws a helpful error when a built-in chartType is missing and no component.mjs exists", async () => {
  await assert.rejects(
    () => render('<qdoc-component name="missing-package" />'),
    /qdoc-component missing-package: no component\.mjs/,
  );
});
