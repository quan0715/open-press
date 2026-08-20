import { describe, expect, it } from "vitest";
import { calculateCommentLocationMarkerPosition } from "../src/openpress/workbench/inspector/CommentLocationMarker";

describe("comment location marker", () => {
  const pageRect = { left: 40, right: 640, top: 80, bottom: 880 };

  it("sits beside the selected content like a proposal marker", () => {
    expect(calculateCommentLocationMarkerPosition({
      targetRect: { left: 120, right: 500, top: 240, bottom: 300 },
      pageRect,
      placement: "block",
    })).toEqual({ left: 92, top: 242 });
  });

  it("stays inside the page rail for edge and before-block targets", () => {
    expect(calculateCommentLocationMarkerPosition({
      targetRect: { left: 46, right: 620, top: 84, bottom: 120 },
      pageRect,
      placement: "before",
    })).toEqual({ left: 46, top: 86 });
  });
});
