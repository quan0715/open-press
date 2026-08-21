import { describe, expect, it } from "vitest";
import { getCommentReviewPosition } from "../src/openpress/workbench/inspector/CommentReviewDock";

describe("comment review position", () => {
  it("counts an unsaved draft as the next one-based comment", () => {
    expect(getCommentReviewPosition({
      activeIndex: 0,
      total: 3,
      hasSelectedComment: false,
      hasDraftTarget: true,
    })).toEqual({ current: 4, total: 4 });

    expect(getCommentReviewPosition({
      activeIndex: 0,
      total: 0,
      hasSelectedComment: false,
      hasDraftTarget: true,
    })).toEqual({ current: 1, total: 1 });
  });

  it("keeps saved comments one-based", () => {
    expect(getCommentReviewPosition({
      activeIndex: 1,
      total: 3,
      hasSelectedComment: true,
      hasDraftTarget: false,
    })).toEqual({ current: 2, total: 3 });
  });
});
