import { describe, expect, it } from "vitest";
import {
  getSourceBlockMap,
  getSourceBlock,
  isReactMdxDocument,
} from "../src/openpress/document-model";
import type { ReaderDocument } from "../src/openpress/document-model";

const reactDocument: ReaderDocument = {
  meta: { title: "React Doc" },
  source: {
    type: "openpress-press-tree-mdx",
    contentDir: "document/chapters",
    editable: true,
    editMode: "source-mdx",
    blockMap: {
      "b-intro-0": {
        id: "b-intro-0",
        kind: "element",
        name: "h2",
        chapterSlug: "intro",
        path: "document/chapters/01-intro/content/01-start.mdx",
        pageIndex: 2,
        pageNumber: 3,
        source: { line: 1, column: 1, endLine: 1, endColumn: 9 },
      },
    },
  },
  blocks: [],
};

describe("OpenPress React document metadata", () => {
  it("detects Press Tree React/MDX documents without pagination metadata", () => {
    expect(isReactMdxDocument(reactDocument)).toBe(true);
    expect(getSourceBlockMap(reactDocument)).toEqual(reactDocument.source?.blockMap);
  });

  it("normalizes block map lookup for inspector consumers", () => {
    expect(getSourceBlockMap(reactDocument)).toEqual(reactDocument.source?.blockMap);
    expect(getSourceBlock(reactDocument, "b-intro-0")).toMatchObject({
      path: "document/chapters/01-intro/content/01-start.mdx",
      pageNumber: 3,
      source: { line: 1, column: 1 },
    });
    expect(getSourceBlock(reactDocument, "missing")).toBeNull();
  });

  it("does not treat non-React document metadata as pre-paginated React output", () => {
    const nonReactDocument: ReaderDocument = {
      meta: { title: "Static Doc" },
      source: { type: "static-html", contentDir: "static/pages" },
      blocks: [],
    };

    expect(isReactMdxDocument(nonReactDocument)).toBe(false);
    expect(getSourceBlockMap(nonReactDocument)).toEqual({});
  });
});
