import { describe, expect, it } from "vitest";
import type { SourceBlock } from "../src/openpress/document-model";
import {
  groupSourceBlocksByPath,
  resolveInlineSavedComment,
} from "../src/openpress/workbench/inspector/inlineCommentModel";

describe("inline comment source resolution", () => {
  it("matches comment endpoint press paths to document source paths", () => {
    const sourceBlock: SourceBlock = {
      id: "b-intro-1",
      path: "userstory/chapters/01-intro/content/01-intro.mdx",
      pageIndex: 2,
      source: { line: 3, column: 1, endLine: 3, endColumn: 20 },
    };
    const sourceBlocksByPath = groupSourceBlocksByPath({ [sourceBlock.id]: sourceBlock });

    expect(resolveInlineSavedComment({
      id: "comment-1",
      path: "press/userstory/chapters/01-intro/content/01-intro.mdx",
      line: 3,
      note: "Clarify the opening.",
      hint: "openpress-react-inspector placement=block",
    }, sourceBlocksByPath)).toEqual([expect.objectContaining({
      id: "comment-1",
      blockId: "b-intro-1",
      path: "press/userstory/chapters/01-intro/content/01-intro.mdx",
      placement: "block",
    })]);
  });
});
