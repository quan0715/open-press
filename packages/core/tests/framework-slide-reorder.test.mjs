import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { reorderSlidesInSource } from "../engine/react/slide-reorder.mjs";

const SAMPLE = `import { Press, Slide } from "@open-press/core";

export default function MyPress() {
  return (
    <Press title="My Press">
      <Slide id="a"><p>A</p></Slide>
      <Slide id="b"><p>B</p></Slide>
      <Slide id="c"><p>C</p></Slide>
    </Press>
  );
}`;

describe("reorderSlidesInSource", () => {
  it("reorders slides to the specified order", () => {
    const result = reorderSlidesInSource(SAMPLE, ["c", "a", "b"]);
    const cIdx = result.indexOf('id="c"');
    const aIdx = result.indexOf('id="a"');
    const bIdx = result.indexOf('id="b"');
    assert.ok(cIdx < aIdx, "c should come before a");
    assert.ok(aIdx < bIdx, "a should come before b");
  });

  it("preserves source when order is already correct", () => {
    const result = reorderSlidesInSource(SAMPLE, ["a", "b", "c"]);
    assert.equal(result, SAMPLE);
  });

  it("throws for unknown slide id", () => {
    assert.throws(
      () => reorderSlidesInSource(SAMPLE, ["a", "b", "x"]),
      /Slide id "x" not found/,
    );
  });

  it("throws when order length does not match slide count", () => {
    assert.throws(
      () => reorderSlidesInSource(SAMPLE, ["a", "b"]),
      /Order length 2 does not match slide count 3/,
    );
  });
});
