import { describe, expect, it } from "vitest";
import {
  createBlockObjectEntityId,
  createMdxAreaObjectEntityId,
  getObjectEntity,
  getObjectEntityMap,
  sourceBlockToObjectEntity,
  type ReaderDocument,
  type SourceBlock,
} from "../src/openpress/document-model";

describe("object entity model", () => {
  it("encodes object id segments", () => {
    expect(createMdxAreaObjectEntityId("cover.1", "chapter:intro", 0)).toBe(
      "mdx-area:cover.1:chapter%3Aintro:0",
    );
  });

  it("maps source blocks into editable rendered objects", () => {
    const block: SourceBlock = {
      id: "b-intro-0",
      kind: "element",
      name: "h2",
      path: "document/chapters/01-intro/content/01-start.mdx",
      frameKey: "intro.1",
      source: { line: 2, column: 1 },
    };

    expect(sourceBlockToObjectEntity(block)).toMatchObject({
      id: createBlockObjectEntityId("b-intro-0"),
      kind: "mdx-block",
      blockId: "b-intro-0",
      frameKey: "intro.1",
      pageId: "page:intro.1",
      source: {
        path: "document/chapters/01-intro/content/01-start.mdx",
        line: 2,
      },
    });
  });

  it("reads entities from ReaderDocument source metadata", () => {
    const document: ReaderDocument = {
      meta: { title: "Entities" },
      source: {
        type: "openpress-press-tree-mdx",
        objectEntities: {
          "page:cover": { id: "page:cover", kind: "page", label: "Cover" },
        },
      },
      blocks: [],
    };

    expect(Object.keys(getObjectEntityMap(document))).toEqual(["page:cover"]);
    expect(getObjectEntity(document, "page:cover")?.kind).toBe("page");
    expect(getObjectEntity(document, "missing")).toBeNull();
  });
});
