import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { injectObjectLocators } from "../engine/react/object-locator-transform.mjs";

describe("object locator transform", () => {
  it("injects deterministic build-local data-op-id attributes into editable elements and primitives", () => {
    const source = `export default function Cover() {
  return <Press><Slide id="cover"><Text>Hello</Text><TitleSlide.Title>Headline</TitleSlide.Title><h1>DOM</h1></Slide></Press>
}`;
    const result = injectObjectLocators({ source, filename: "/repo/press/deck/slides/cover/slide.tsx", slideId: "cover" });
    assert.doesNotMatch(result.code, /<Press data-op-id/);
    assert.doesNotMatch(result.code, /<Slide data-op-id/);
    assert.match(result.code, /<Text data-op-id="cover::text:0"/);
    assert.match(result.code, /<TitleSlide.Title data-op-id="cover::title-slide-title:1"/);
    assert.match(result.code, /<h1 data-op-id="cover::h1:2"/);
    assert.equal(result.map["cover::text:0"].slideId, "cover");
    assert.equal(result.map["cover::text:0"].elementType, "Text");
  });

  it("rejects hand-authored object identity props", () => {
    assert.throws(
      () => injectObjectLocators({ source: '<Text objectId="x" />', filename: "slide.tsx", slideId: "cover" }),
      /hand-authored objectId/,
    );
  });
});
