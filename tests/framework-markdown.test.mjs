import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeFigureTableNumbering, renderMarkdown } from "../engine/markdown-renderer.mjs";
import { renderToc, splitChapterSections } from "../engine/page-renderer.mjs";

const FIXTURES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "workspace");

const render = (md) => renderMarkdown(md, FIXTURES_DIR);

test("report and toc pages are wrapped in formal page shell", () => {
  const chapterHtml = splitChapterSections("<h2>Section</h2><p>Body.</p>", 1, { value: 0 });
  const tocHtml = renderToc();
  for (const html of [chapterHtml, tocHtml]) {
    assert.ok(html.includes('class="page-frame"'));
    assert.ok(html.includes('class="page-header"'));
    assert.ok(html.includes('class="page-body"'));
    assert.ok(html.includes('class="page-footer"'));
  }
  assert.ok(chapterHtml.includes('<main class="page-body">\n<h2'));
  assert.match(tocHtml, /<h2 id="toc-title"(?: class="[^"]+")?>[^<]+<\/h2>/);
});

test("server chapter split keeps h3 inside chapter page", () => {
  const chapterHtml = splitChapterSections(
    "<h2>Section</h2><p>Lead.</p><h3>Sub</h3><p>Sub body.</p>",
    1,
    { value: 0 },
  );
  const occurrences = chapterHtml.split('class="reader-page report-page"').length - 1;
  assert.equal(occurrences, 1);
  assert.ok(chapterHtml.includes("<h3>Sub</h3>"));
});

test("markdown image title gets generated figure number", async () => {
  const html = await render('![alt](media/test-1x1.png "圖 4：Sample caption.")');
  const numbered = normalizeFigureTableNumbering(html);
  assert.match(numbered, /<figcaption>圖 1[：:]Sample caption\.<\/figcaption>/);
  assert.ok(!numbered.includes("圖 4"));
});

test("rendered images include intrinsic dimensions for layout measurement", async () => {
  const html = await render("![alt](media/test-1x1.png)");
  assert.match(html, /<img [^>]*src="media\/test-1x1\.png"/);
  assert.match(html, /<img [^>]*width="[1-9][0-9]*"/);
  assert.match(html, /<img [^>]*height="[1-9][0-9]*"/);
});

test("css chart figure without image is counted as figure", () => {
  const html = `
<figure class="sample-stage-chart" aria-label="Stage chart">
  <figcaption>圖：Sample stage chart caption.</figcaption>
  <ul class="stage-list"><li>25</li></ul>
</figure>
`;
  const numbered = normalizeFigureTableNumbering(html);
  assert.match(numbered, /圖 1[：:]Sample stage chart caption\./);
});

test("figure captions without an explicit caption are appended at the bottom", () => {
  const html = '<figure class="sample-stage-chart"><div class="chart-body">42</div></figure>';
  const numbered = normalizeFigureTableNumbering(html);
  assert.match(numbered, /<div class="chart-body">42<\/div><figcaption>圖 1<\/figcaption><\/figure>/);
});

test("markdown table without title gets generated table number", async () => {
  const html = await render(`| Col | Body |
|---|---|
| A | B |`);
  const numbered = normalizeFigureTableNumbering(html);
  assert.ok(numbered.includes("<caption>表 1</caption>"));
});

test("markdown table title marker becomes numbered caption", async () => {
  const html = await render(`表：Sample table caption
| Col | Body |
|---|---|
| A | B |`);
  const numbered = normalizeFigureTableNumbering(html);
  assert.match(numbered, /<caption>表 1[：:]Sample table caption<\/caption>/);
  assert.ok(!numbered.includes("<p>表：Sample table caption</p>"));
});

test("markdown inline latex renders as katex without touching currency text", async () => {
  const html = await render("Euler identity: $e^{i\\pi}+1=0$. The fee is $5.");
  assert.match(html, /<span class="katex"/);
  assert.match(html, /<math/);
  assert.ok(!html.includes("$e^{i\\pi}+1=0$"));
  assert.ok(html.includes("The fee is $5."));
});

test("markdown display latex renders as a katex display block", async () => {
  const html = await render(`Before

$$
A(x)=6x^5+5x^3-4x^2+8
$$

After`);
  assert.match(html, /<span class="katex-display"/);
  assert.match(html, /A/);
  assert.ok(!html.includes("$$"));
});

test("markdown latex also supports parenthesis and bracket delimiters", async () => {
  const html = await render(`Inline \\(\\alpha+\\beta\\).

\\[
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
\\]`);
  assert.match(html, /<span class="katex"/);
  assert.match(html, /<span class="katex-display"/);
  assert.ok(!html.includes("\\("));
  assert.ok(!html.includes("\\["));
});

test("markdown latex inside code spans stays literal", async () => {
  const html = await render("Use `$x^2$` literally, then render $x^2$.");
  assert.match(html, /<code>\$x\^2\$<\/code>/);
  const katexCount = html.match(/class="katex"/g)?.length ?? 0;
  assert.equal(katexCount, 1);
});

test("raw html table caption is normalized", () => {
  const html = `
<table>
  <caption>表 7:Out-of-order caption.</caption>
  <thead><tr><th>Col</th></tr></thead>
  <tbody><tr><td>A</td></tr></tbody>
</table>
`;
  const numbered = normalizeFigureTableNumbering(html);
  assert.match(numbered, /<caption>表 1[：:]Out-of-order caption\.<\/caption>/);
  assert.ok(!numbered.includes("表 7"));
});

test("excluded figures are not counted", () => {
  const html = `
<section class="reader-page cover">
  <figure><img src="media/cover.png" alt=""></figure>
</section>
<section class="reader-page report-page">
  <div class="partner-logo-bar">
    <figure class="partner-logo-card"><img src="media/logo.png" alt=""><figcaption>Partner</figcaption></figure>
  </div>
  <figure><img src="media/product.png" alt=""><figcaption>Product shot</figcaption></figure>
</section>
`;
  const numbered = normalizeFigureTableNumbering(html);
  assert.match(numbered, /<figcaption>圖 1[：:]Product shot<\/figcaption>/);
  assert.ok(numbered.includes("<figcaption>Partner</figcaption>"));
  assert.ok(!numbered.includes("圖 2"));
});
