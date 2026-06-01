import test from "node:test";
import assert from "node:assert/strict";
import { parsePageSelector, resolvePageSelector } from "../engine/runtime/page-selector.mjs";

test("parses a single page", () => {
  assert.deepEqual(parsePageSelector("3"), [{ kind: "single", value: 3 }]);
});

test("parses comma-separated pages, trimming whitespace", () => {
  assert.deepEqual(parsePageSelector(" 3 , 5 , 7 "), [
    { kind: "single", value: 3 },
    { kind: "single", value: 5 },
    { kind: "single", value: 7 },
  ]);
});

test("parses closed ranges", () => {
  assert.deepEqual(parsePageSelector("3-7"), [{ kind: "range", from: 3, to: 7 }]);
});

test("parses open-ended ranges", () => {
  assert.deepEqual(parsePageSelector("15-"), [{ kind: "range", from: 15, to: null }]);
  assert.deepEqual(parsePageSelector("-5"), [{ kind: "range", from: null, to: 5 }]);
});

test("parses mixed selectors", () => {
  assert.deepEqual(parsePageSelector("3,5-7,12,15-"), [
    { kind: "single", value: 3 },
    { kind: "range", from: 5, to: 7 },
    { kind: "single", value: 12 },
    { kind: "range", from: 15, to: null },
  ]);
});

test("rejects empty input", () => {
  assert.throws(() => parsePageSelector(""), /empty/);
  assert.throws(() => parsePageSelector("   "), /empty/);
});

test("rejects backwards ranges", () => {
  assert.throws(() => parsePageSelector("9-3"), /backwards/);
});

test("rejects bare dash and double dash", () => {
  assert.throws(() => parsePageSelector("-"), /bare "-"/);
  assert.throws(() => parsePageSelector("3--5"), /too many dashes/);
});

test("rejects zero and negative page numbers", () => {
  assert.throws(() => parsePageSelector("0"), /out-of-range/);
  assert.throws(() => parsePageSelector("-0"), /out-of-range/);
});

test("rejects non-integer tokens", () => {
  assert.throws(() => parsePageSelector("3,abc"), /non-integer/);
  assert.throws(() => parsePageSelector("1.5"), /non-integer/);
});

test("resolves singles and ranges against total page count", () => {
  const spec = parsePageSelector("3,5-7,12,15-");
  assert.deepEqual(resolvePageSelector(spec, 20), [3, 5, 6, 7, 12, 15, 16, 17, 18, 19, 20]);
});

test("resolves open-ended bottom ranges", () => {
  const spec = parsePageSelector("-4,8");
  assert.deepEqual(resolvePageSelector(spec, 12), [1, 2, 3, 4, 8]);
});

test("dedupes overlapping segments", () => {
  const spec = parsePageSelector("3,3-5,4");
  assert.deepEqual(resolvePageSelector(spec, 10), [3, 4, 5]);
});

test("clamps ranges that overshoot the total", () => {
  const spec = parsePageSelector("8-100");
  assert.deepEqual(resolvePageSelector(spec, 10), [8, 9, 10]);
});

test("rejects singles that exceed total page count", () => {
  const spec = parsePageSelector("3,11");
  assert.throws(() => resolvePageSelector(spec, 10), /out of range; document has 10 page/);
});

test("rejects ranges whose start exceeds total page count", () => {
  const spec = parsePageSelector("12-");
  assert.throws(() => resolvePageSelector(spec, 10), /Range start 12 is out of range/);
});

test("returns empty array when document has zero pages", () => {
  const spec = parsePageSelector("3");
  assert.deepEqual(resolvePageSelector(spec, 0), []);
});
