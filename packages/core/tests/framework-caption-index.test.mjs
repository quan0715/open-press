import { test } from "node:test";
import assert from "node:assert/strict";
import { collectCaptionIndex } from "../engine/react/caption-numbering.mjs";

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
