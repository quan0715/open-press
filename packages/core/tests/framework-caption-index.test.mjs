import { test } from "node:test";
import assert from "node:assert/strict";
import {
  collectCaptionIndex,
  collectCaptionReferenceIndex,
  createCaptionNumberingState,
  numberCaptionsInHtml,
  resolveCrossReferencesInHtml,
} from "../engine/react/caption-numbering.mjs";

test("a captionless table continuation cannot consume the next table's caption", () => {
  const state = createCaptionNumberingState();
  const pages = [
    '<table data-openpress-table-id="scale"><caption>Scale table</caption><tbody><tr><td>First rows</td></tr></tbody></table>',
    [
      '<table data-openpress-table-id="scale"><tbody><tr><td>Remaining rows</td></tr></tbody></table>',
      '<p>A paragraph between the tables.</p>',
      '<table data-openpress-table-id="questions"><caption class="custom-caption" data-openpress-block-id="questions-caption">Question <em>examples</em></caption><tbody><tr><td>Question</td></tr></tbody></table>',
    ].join(""),
  ].map((html, pageIndex) => ({ pageIndex, html: numberCaptionsInHtml(html, { table: "表" }, state) }));

  assert.deepEqual(collectCaptionIndex(pages), [
    { id: "table-1", kind: "table", number: 1, label: "表 1", title: "Scale table", pageIndex: 0 },
    { id: "table-2", kind: "table", number: 2, label: "表 2", title: "Question examples", pageIndex: 1 },
  ]);
  assert.match(pages[1].html, /<caption class="custom-caption" data-openpress-block-id="questions-caption"><span[^>]*>表 2<\/span> Question <em>examples<\/em><\/caption>/);
});

test("an uncaptioned table cannot claim the ID used to deduplicate a later captioned table", () => {
  const state = createCaptionNumberingState();
  const captionedTable = '<table data-openpress-table-id="captioned"><caption>First caption</caption><tr><td>Value</td></tr></table>';
  const pages = [
    '<table data-openpress-table-id="uncaptioned"><tr><td>No caption</td></tr></table>' + captionedTable,
    captionedTable + '<table data-openpress-table-id="next"><caption>Next caption</caption><tr><td>Value</td></tr></table>',
  ].map((html, pageIndex) => ({ pageIndex, html: numberCaptionsInHtml(html, undefined, state) }));

  assert.deepEqual(collectCaptionIndex(pages), [
    { id: "table-1", kind: "table", number: 1, label: "Table 1", title: "First caption", pageIndex: 0 },
    { id: "table-2", kind: "table", number: 2, label: "Table 2", title: "Next caption", pageIndex: 1 },
  ]);
  assert.ok(pages[1].html.startsWith(captionedTable), "a repeated fragment must not receive another number");
});

test("multiple captioned tables on one page stay numbered exactly once", () => {
  const html = [
    '<table><caption>First</caption><tr><td>A</td></tr></table>',
    '<p>Between tables</p>',
    '<table><caption>Second</caption><tr><td>B</td></tr></table>',
  ].join("");
  const numbered = numberCaptionsInHtml(html);
  assert.deepEqual(collectCaptionIndex([{ pageIndex: 0, html: numbered }]), [
    { id: "table-1", kind: "table", number: 1, label: "Table 1", title: "First", pageIndex: 0 },
    { id: "table-2", kind: "table", number: 2, label: "Table 2", title: "Second", pageIndex: 0 },
  ]);
  assert.equal(numberCaptionsInHtml(numbered), numbered);
});

test("collectCaptionIndex preserves document order and deduplicates repeated table fragments", () => {
  const pages = [
    {
      pageIndex: 2,
      html: [
        '<figcaption><span data-openpress-caption-label="figure" data-openpress-caption-number="1">圖 1</span> 架構 &amp; 流程</figcaption>',
        '<caption><span data-openpress-caption-label="table" data-openpress-caption-number="1">表 1</span> 支援格式</caption>',
      ].join(""),
    },
    {
      pageIndex: 3,
      html: [
        '<caption><span data-openpress-caption-label="table" data-openpress-caption-number="1">表 1</span> 支援格式</caption>',
        '<figcaption><span data-openpress-caption-label="figure" data-openpress-caption-number="2">圖 2</span> 輸出結果</figcaption>',
      ].join(""),
    },
  ];

  assert.deepEqual(collectCaptionIndex(pages), [
    { id: "figure-1", kind: "figure", number: 1, label: "圖 1", title: "架構 & 流程", pageIndex: 2 },
    { id: "table-1", kind: "table", number: 1, label: "表 1", title: "支援格式", pageIndex: 2 },
    { id: "figure-2", kind: "figure", number: 2, label: "圖 2", title: "輸出結果", pageIndex: 3 },
  ]);
});

test("cross-references resolve forward and backward targets from the numbered caption index", () => {
  const state = createCaptionNumberingState();
  const pages = [
    [
      '<p>See <a class="openpress-cross-reference" href="#fig-flow" data-openpress-cross-reference="fig-flow">@fig-flow</a>.</p>',
      '<p>Again <a class="openpress-cross-reference" href="#fig-flow" data-openpress-cross-reference="fig-flow">@fig-flow</a>, with <a class="openpress-cross-reference" href="#tbl-results" data-openpress-cross-reference="tbl-results">@tbl-results</a>.</p>',
      '<table id="tbl-results"><caption>Results</caption><tr><td>42</td></tr></table>',
    ].join(""),
    [
      '<figure id="fig-flow"><div>Flow</div><figcaption>System flow</figcaption></figure>',
      '<p>Compare <a class="openpress-cross-reference" href="#tbl-results" data-openpress-cross-reference="tbl-results">@tbl-results</a>.</p>',
    ].join(""),
  ].map((html) => numberCaptionsInHtml(html, { figure: "圖", table: "表" }, state));

  const references = collectCaptionReferenceIndex(pages);
  const resolved = pages.map((html) => resolveCrossReferencesInHtml(html, references));

  assert.deepEqual(Array.from(references.values()), [
    { id: "tbl-results", kind: "table", number: 1, label: "表 1" },
    { id: "fig-flow", kind: "figure", number: 1, label: "圖 1" },
  ]);
  assert.match(resolved[0], /data-openpress-cross-reference="fig-flow">圖 1<\/a>/);
  assert.equal(resolved.join("").match(/data-openpress-cross-reference="fig-flow">圖 1<\/a>/g)?.length, 2);
  assert.equal(resolved.join("").match(/data-openpress-cross-reference="tbl-results">表 1<\/a>/g)?.length, 2);
  assert.match(resolved[1], /data-openpress-cross-reference="tbl-results">表 1<\/a>/);
});

test("cross-reference validation rejects missing, duplicate, and cross-kind targets", () => {
  assert.throws(
    () => resolveCrossReferencesInHtml(
      '<p><a href="#fig-missing" data-openpress-cross-reference="fig-missing">@fig-missing</a></p>',
      new Map(),
    ),
    /Unresolved cross-reference "@fig-missing"/,
  );

  const duplicate = [
    '<figure id="fig-flow"><figcaption>One</figcaption></figure>',
    '<figure id="fig-flow"><figcaption>Two</figcaption></figure>',
  ];
  const state = createCaptionNumberingState();
  const numbered = duplicate.map((html) => numberCaptionsInHtml(html, undefined, state));
  assert.throws(() => collectCaptionReferenceIndex(numbered), /Duplicate cross-reference target "fig-flow"/);
  assert.throws(
    () => numberCaptionsInHtml('<table id="fig-wrong"><caption>Wrong kind</caption></table>'),
    /target "fig-wrong" is attached to a table/,
  );
});
