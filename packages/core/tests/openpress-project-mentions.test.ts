import { beforeAll, describe, expect, it, vi } from "vitest";
import type { BookmarkItem } from "../src/openpress/document-model";
import type { DisplayPage } from "../src/openpress/reader";

vi.mock("../src/openpress/workbench/project/projectSourceModel", () => ({
  PROJECT_SOURCES: {
    content: { key: "content", directory: "document/chapters", label: "Content" },
    media: { key: "media", directory: "document/media", label: "Image Gallery" },
    components: { key: "components", directory: "document/components", label: "內容區塊" },
  },
  projectSourceDirectoryPath: (source: string) => `document/${source}/`,
}));

let createProjectMentionItems: typeof import("../src/openpress/workbench/project").createProjectMentionItems;
let createProjectComponentUsageCounts: typeof import("../src/openpress/workbench/project").createProjectComponentUsageCounts;

beforeAll(async () => {
  ({ createProjectComponentUsageCounts, createProjectMentionItems } = await import("../src/openpress/workbench/project"));
});

describe("project composer mentions", () => {
  it("adds chapter and section mentions from bookmarks", () => {
    const bookmarks: BookmarkItem[] = [
      {
        id: "toc",
        title: "目錄",
        label: "00",
        pageIndex: 1,
        endPageIndex: 1,
        subs: [],
      },
      {
        id: "linked-list",
        title: "Linked List",
        label: "1",
        pageIndex: 4,
        endPageIndex: 18,
        subs: [
          {
            id: "list-node-pointer",
            title: "List、Node 與 Pointer",
            label: "1.1",
            pageIndex: 5,
            endPageIndex: 7,
            subs: [],
          },
        ],
      },
    ];

    const values = createProjectMentionItems([], new Map(), bookmarks).map((item) => item.value);

    expect(values).toContain("@chapter/1-Linked-List");
    expect(values).toContain("@section/1.1-List-Node-與-Pointer");
    expect(values).not.toContain("@chapter/00-目錄");
  });

  it("includes the apply-comments workflow skill mention", () => {
    const values = createProjectMentionItems([], new Map(), []).map((item) => item.value);

    expect(values).toContain("/apply-comments");
  });

  it("counts rendered components without retaining retired panel preview data", () => {
    const pages: DisplayPage[] = [
      { id: "one", title: "One", pageNumber: 1, html: '<figure data-openpress-component="Chart"></figure><div data-openpress-component="Chart"></div>' },
      { id: "two", title: "Two", pageNumber: 2, html: '<section data-openpress-component="Callout"></section>' },
    ];
    const counts = createProjectComponentUsageCounts(pages);
    const mentions = createProjectMentionItems([], counts, []);

    expect(counts).toEqual(new Map([["Chart", 2], ["Callout", 1]]));
    expect(mentions).toEqual(expect.arrayContaining([
      expect.objectContaining({ value: "@component/Chart", meta: "component · 2" }),
      expect.objectContaining({ value: "@component/Callout", meta: "component · 1" }),
    ]));
  });
});
