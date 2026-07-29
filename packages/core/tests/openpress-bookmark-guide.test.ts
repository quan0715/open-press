import { describe, expect, it } from "vitest";
import {
  bookmarkGuideForPage,
  resolveBookmarkGuidePage,
  type BookmarkItem,
} from "../src/openpress/document-model";
import { parseStoredBookmarkPosition } from "../src/openpress/workbench/hooks/useWorkbenchBookmarkGuide";

describe("workbench bookmark refresh guide", () => {
  it("remaps the active H3 section after pagination changes", () => {
    const before: BookmarkItem[] = [
      {
        id: "chapter-before",
        anchorId: "section-intro",
        title: "Introduction",
        label: "01",
        pageIndex: 2,
        endPageIndex: 9,
        subs: [
          {
            id: "section-before",
            anchorId: "b-intro-overview-4",
            title: "Overview",
            label: "1.1",
            pageIndex: 4,
            endPageIndex: 7,
            subs: [
              {
                id: "topic-before",
                anchorId: "b-intro-overview-6",
                title: "Details",
                label: "1.1.1",
                pageIndex: 5,
                endPageIndex: 7,
              },
            ],
          },
        ],
      },
    ];
    const after: BookmarkItem[] = [
      {
        id: "chapter-after",
        anchorId: "section-intro",
        title: "Introduction",
        label: "01",
        pageIndex: 5,
        endPageIndex: 15,
        subs: [
          {
            id: "section-after",
            anchorId: "b-intro-overview-9",
            title: "Overview",
            label: "1.1",
            pageIndex: 10,
            endPageIndex: 13,
            subs: [],
          },
        ],
      },
    ];

    const guide = bookmarkGuideForPage(before, 6);

    expect(guide).toEqual({
      chapter: { anchorId: "section-intro", label: "01", title: "Introduction" },
      section: { anchorId: "b-intro-overview-4", label: "1.1", title: "Overview" },
    });
    expect(resolveBookmarkGuidePage(after, guide)).toBe(10);
  });

  it("falls back to the containing H2 when the saved H3 no longer exists", () => {
    const guide = {
      chapter: { anchorId: "section-intro", label: "01", title: "Introduction" },
      section: { anchorId: "b-intro-removed-4", label: "1.2", title: "Removed section" },
    };
    const after: BookmarkItem[] = [
      {
        id: "chapter-after",
        anchorId: "section-intro",
        title: "Introduction",
        label: "01",
        pageIndex: 7,
        endPageIndex: 12,
        subs: [],
      },
    ];

    expect(resolveBookmarkGuidePage(after, guide)).toBe(7);
  });

  it("uses the latest H3 when multiple sections start on the current page", () => {
    const bookmarks: BookmarkItem[] = [
      {
        id: "chapter",
        title: "Chapter",
        pageIndex: 2,
        endPageIndex: 8,
        subs: [
          { id: "first", title: "First", label: "1.1", pageIndex: 4, endPageIndex: 4, subs: [] },
          { id: "second", title: "Second", label: "1.2", pageIndex: 4, endPageIndex: 8, subs: [] },
        ],
      },
    ];

    expect(bookmarkGuideForPage(bookmarks, 4)?.section?.title).toBe("Second");
  });

  it("uses the saved label to disambiguate duplicate H3 titles", () => {
    const bookmarks: BookmarkItem[] = [
      {
        id: "chapter",
        anchorId: "section-chapter",
        title: "Chapter",
        pageIndex: 1,
        endPageIndex: 9,
        subs: [
          { id: "first", anchorId: "new-first", title: "Overview", label: "1.1", pageIndex: 3, endPageIndex: 5, subs: [] },
          { id: "second", anchorId: "new-second", title: "Overview", label: "1.2", pageIndex: 6, endPageIndex: 9, subs: [] },
        ],
      },
    ];
    const guide = {
      chapter: { anchorId: "section-chapter", title: "Chapter" },
      section: { anchorId: "old-second", title: "Overview", label: "1.2" },
    };

    expect(resolveBookmarkGuidePage(bookmarks, guide)).toBe(6);
  });

  it("falls back to H2 when a duplicate H3 title is ambiguous", () => {
    const bookmarks: BookmarkItem[] = [
      {
        id: "chapter",
        anchorId: "section-chapter",
        title: "Chapter",
        pageIndex: 1,
        endPageIndex: 9,
        subs: [
          { id: "first", title: "Overview", label: "1.1", pageIndex: 3, endPageIndex: 5, subs: [] },
          { id: "second", title: "Overview", label: "1.2", pageIndex: 6, endPageIndex: 9, subs: [] },
        ],
      },
    ];
    const guide = {
      chapter: { anchorId: "section-chapter", title: "Chapter" },
      section: { anchorId: "removed", title: "Overview", label: "1.3" },
    };

    expect(resolveBookmarkGuidePage(bookmarks, guide)).toBe(1);
  });

  it("rejects malformed or negative stored bookmark positions", () => {
    expect(parseStoredBookmarkPosition(JSON.stringify({
      pageIndex: 2,
      guide: { chapter: { title: "Chapter" }, section: { label: "1.1" } },
    }))).toBeNull();
    expect(parseStoredBookmarkPosition(JSON.stringify({
      pageIndex: -1,
      guide: { chapter: { title: "Chapter" } },
    }))).toBeNull();
  });
});
