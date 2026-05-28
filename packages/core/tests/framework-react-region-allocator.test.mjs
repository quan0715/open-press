import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allocateBlocksToRegions,
  estimateRegionsNeeded,
  fixedRegionStream,
  multiColumnRegionStream,
  paginateMeasuredBlocks,
  pagesFromRegions,
  singleColumnRegionStream,
} from "../engine/react/pagination.mjs";

const blocks = (entries) => entries.map(([id, height]) => ({ id, height }));

test("singleColumnRegionStream emits one region per page with the supplied capacity", () => {
  const stream = singleColumnRegionStream({ pageSafeHeightPx: 100 });
  const r0 = stream.next();
  const r1 = stream.next();
  const r2 = stream.next();
  assert.deepEqual(r0, { id: "page-0-col-0", capacity: 100, pageIndex: 0, columnIndex: 0 });
  assert.deepEqual(r1, { id: "page-1-col-0", capacity: 100, pageIndex: 1, columnIndex: 0 });
  assert.equal(r2.pageIndex, 2);
});

test("multiColumnRegionStream emits N regions per pageIndex before advancing", () => {
  const stream = multiColumnRegionStream({ pageSafeHeightPx: 100, columnCount: 2 });
  const [a, b, c, d] = [stream.next(), stream.next(), stream.next(), stream.next()];
  assert.equal(a.pageIndex, 0); assert.equal(a.columnIndex, 0);
  assert.equal(b.pageIndex, 0); assert.equal(b.columnIndex, 1);
  assert.equal(c.pageIndex, 1); assert.equal(c.columnIndex, 0);
  assert.equal(d.pageIndex, 1); assert.equal(d.columnIndex, 1);
});

test("paginateMeasuredBlocks default single-column matches legacy behaviour", () => {
  const result = paginateMeasuredBlocks(
    blocks([["b-0", 35], ["b-1", 40], ["b-2", 45], ["b-3", 10]]),
    { pageSafeHeightPx: 80 },
  );
  assert.deepEqual(result.pages, [
    { pageIndex: 0, blockIds: ["b-0", "b-1"], breakAfter: "b-1" },
    { pageIndex: 1, blockIds: ["b-2", "b-3"], breakAfter: "b-3" },
  ]);
  assert.equal(result.warnings.length, 0);
});

test("paginateMeasuredBlocks remaps overflow warning to legacy block-overflows-page schema", () => {
  const result = paginateMeasuredBlocks(
    blocks([["b-0", 20], ["b-1", 140], ["b-2", 20]]),
    { pageSafeHeightPx: 80 },
  );
  assert.deepEqual(result.warnings, [
    { code: "block-overflows-page", blockId: "b-1", height: 140, pageSafeHeightPx: 80 },
  ]);
});

test("two-column stream fills column 0 then column 1 before advancing to next page", () => {
  const result = paginateMeasuredBlocks(
    blocks([
      ["b-0", 40], ["b-1", 40], // col 0 page 0 (80, fits exactly)
      ["b-2", 40], ["b-3", 40], // col 1 page 0
      ["b-4", 40],              // col 0 page 1
    ]),
    { regions: multiColumnRegionStream({ pageSafeHeightPx: 80, columnCount: 2 }) },
  );
  assert.deepEqual(
    result.regions.map((r) => [r.pageIndex, r.columnIndex, r.blockIds]),
    [
      [0, 0, ["b-0", "b-1"]],
      [0, 1, ["b-2", "b-3"]],
      [1, 0, ["b-4"]],
    ],
  );
  // Pages flatten regions in column order
  assert.deepEqual(result.pages, [
    { pageIndex: 0, blockIds: ["b-0", "b-1", "b-2", "b-3"], breakAfter: "b-3" },
    { pageIndex: 1, blockIds: ["b-4"], breakAfter: "b-4" },
  ]);
});

test("heterogeneous fixed region stream supports a wide region followed by narrow columns", () => {
  // E.g. research-article first page: wide abstract on top + two narrow body
  // columns underneath. Same allocator, just a different region stream.
  const layout = [
    { id: "p0-abstract", capacity: 60, pageIndex: 0, columnIndex: 0 },
    { id: "p0-col-0",    capacity: 100, pageIndex: 0, columnIndex: 1 },
    { id: "p0-col-1",    capacity: 100, pageIndex: 0, columnIndex: 2 },
  ];
  const result = paginateMeasuredBlocks(
    blocks([
      ["abstract", 50],
      ["body-0", 60], ["body-1", 50], // 110 > 100 → body-1 overflows to next region
      ["body-2", 40], // fits in col-1
    ]),
    { regions: fixedRegionStream(layout) },
  );
  assert.deepEqual(
    result.regions.map((r) => [r.regionId, r.blockIds]),
    [
      ["p0-abstract", ["abstract"]],
      ["p0-col-0",    ["body-0"]],
      ["p0-col-1",    ["body-1", "body-2"]],
    ],
  );
});

test("allocator emits out-of-regions warning when stream exhausts mid-flow", () => {
  const layout = [
    { id: "only-region", capacity: 50, pageIndex: 0, columnIndex: 0 },
  ];
  const result = allocateBlocksToRegions(
    blocks([["b-0", 40], ["b-1", 40]]),
    fixedRegionStream(layout),
  );
  assert.equal(result.regions.length, 1);
  assert.equal(result.regions[0].blockIds.length, 1);
  assert.equal(result.warnings[0].code, "out-of-regions");
});

test("pagesFromRegions is the inverse view: groups regions by pageIndex preserving column order", () => {
  const filled = [
    { regionId: "r-1", pageIndex: 0, columnIndex: 1, blockIds: ["b-c"] },
    { regionId: "r-0", pageIndex: 0, columnIndex: 0, blockIds: ["b-a", "b-b"] },
    { regionId: "r-2", pageIndex: 1, columnIndex: 0, blockIds: ["b-d"] },
  ];
  assert.deepEqual(pagesFromRegions(filled), [
    { pageIndex: 0, blockIds: ["b-a", "b-b", "b-c"], breakAfter: "b-c" },
    { pageIndex: 1, blockIds: ["b-d"], breakAfter: "b-d" },
  ]);
});

test("allocator can keep headings with the following block", () => {
  const result = allocateBlocksToRegions(
    [
      { id: "intro", name: "p", height: 60 },
      { id: "heading", name: "h2", height: 20 },
      { id: "body", name: "p", height: 70 },
    ],
    fixedRegionStream([
      { id: "page-0", capacity: 80, pageIndex: 0, columnIndex: 0 },
      { id: "page-1", capacity: 100, pageIndex: 1, columnIndex: 0 },
    ]),
    {
      keepWithNext(block) {
        return /^h[1-6]$/.test(String(block?.name ?? ""));
      },
    },
  );

  assert.deepEqual(result.regions.map((region) => region.blockIds), [
    ["intro"],
    ["heading", "body"],
  ]);
  assert.equal(result.consumedCount, 3);
});

test("estimateRegionsNeeded uses the same keep-with-next behavior", () => {
  const needed = estimateRegionsNeeded(
    [
      { id: "intro", name: "p", height: 60 },
      { id: "heading", name: "h2", height: 20 },
      { id: "body", name: "p", height: 70 },
    ],
    100,
    {
      keepWithNext(block) {
        return /^h[1-6]$/.test(String(block?.name ?? ""));
      },
    },
  );

  assert.equal(needed, 2);
});
