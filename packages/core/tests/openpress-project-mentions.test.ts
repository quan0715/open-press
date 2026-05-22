import { beforeAll, describe, expect, it, vi } from "vitest";
import type { BookmarkItem } from "../src/openpress/indexes";

vi.mock("../src/openpress/projectSources", () => ({
  PROJECT_SOURCES: {
    content: { key: "content", directory: "document/chapters", label: "Content" },
    media: { key: "media", directory: "document/media", label: "Image Gallery" },
    components: { key: "components", directory: "document/components", label: "內容區塊" },
  },
  projectSourceDirectoryPath: (source: string) => `document/${source}/`,
}));

let createProjectMentionItems: typeof import("../src/openpress/projectWorkspace").createProjectMentionItems;

beforeAll(async () => {
  ({ createProjectMentionItems } = await import("../src/openpress/projectWorkspace"));
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
});
