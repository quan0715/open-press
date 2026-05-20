import { describe, expect, it } from "vitest";
import {
  getQDocReactBlockMap,
  getQDocReactBlockSource,
  getQDocReactPagination,
  hasQDocBuildTimePagination,
  isQDocReactMdxDocument,
} from "../src/qdoc/reactDocumentMetadata";
import type { QDocDocument } from "../src/qdoc/types";

const reactDocument: QDocDocument = {
  meta: { title: "React Doc" },
  source: {
    type: "qdoc-react-mdx",
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
    pagination: {
      mode: "build-time-block-measurement",
      pageSafeHeightPx: 930,
      warnings: [],
    },
  },
  blocks: [],
};

describe("QDoc React document metadata", () => {
  it("detects React/MDX documents with build-time pagination metadata", () => {
    expect(isQDocReactMdxDocument(reactDocument)).toBe(true);
    expect(hasQDocBuildTimePagination(reactDocument)).toBe(true);
    expect(getQDocReactPagination(reactDocument)).toEqual({
      mode: "build-time-block-measurement",
      pageSafeHeightPx: 930,
      warnings: [],
    });
  });

  it("normalizes block map lookup for inspector consumers", () => {
    expect(getQDocReactBlockMap(reactDocument)).toEqual(reactDocument.source?.blockMap);
    expect(getQDocReactBlockSource(reactDocument, "b-intro-0")).toMatchObject({
      path: "document/chapters/01-intro/content/01-start.mdx",
      pageNumber: 3,
      source: { line: 1, column: 1 },
    });
    expect(getQDocReactBlockSource(reactDocument, "missing")).toBeNull();
  });

  it("does not treat legacy documents as pre-paginated React output", () => {
    const legacyDocument: QDocDocument = {
      meta: { title: "Legacy Doc" },
      source: { type: "markdown", contentDir: "document/content" },
      blocks: [],
    };

    expect(isQDocReactMdxDocument(legacyDocument)).toBe(false);
    expect(hasQDocBuildTimePagination(legacyDocument)).toBe(false);
    expect(getQDocReactBlockMap(legacyDocument)).toEqual({});
  });
});
