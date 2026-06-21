import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Bookmarks } from "../src/openpress/reader";
import type { BookmarkItem } from "../src/openpress/document-model";

const bookmarkItems: BookmarkItem[] = [
  {
    id: "chapter-1",
    title: "List、Node 與 Pointer",
    label: "01",
    pageIndex: 1,
    endPageIndex: 5,
    subs: [
      {
        id: "section-1-1",
        title: "用 link 陣列模擬鏈結關係",
        label: "1.1",
        pageIndex: 2,
        endPageIndex: 3,
        subs: [
          {
            id: "topic-1-1-1",
            title: "插入節點",
            label: "1.1.1",
            pageIndex: 3,
            endPageIndex: 3,
          },
        ],
      },
    ],
  },
];

afterEach(() => {
  cleanup();
});

describe("Bookmarks", () => {
  it("emits bookmark navigation intent for chapter buttons", () => {
    const onSelectPage = vi.fn();

    render(<Bookmarks items={bookmarkItems} currentPageIndex={0} onSelectPage={onSelectPage} />);
    fireEvent.click(screen.getByRole("button", { name: "01 List、Node 與 Pointer" }));

    expect(onSelectPage).toHaveBeenCalledExactlyOnceWith(1, {
      behavior: "smooth",
    });
  });

  it("emits bookmark navigation intent for section buttons", () => {
    const onSelectPage = vi.fn();

    render(<Bookmarks items={bookmarkItems} currentPageIndex={0} onSelectPage={onSelectPage} />);
    fireEvent.click(screen.getByRole("button", { name: "1.1 用 link 陣列模擬鏈結關係" }));

    expect(onSelectPage).toHaveBeenCalledExactlyOnceWith(2, {
      behavior: "smooth",
    });
  });

  it("emits bookmark navigation intent for topic buttons", () => {
    const onSelectPage = vi.fn();

    render(<Bookmarks items={bookmarkItems} currentPageIndex={0} onSelectPage={onSelectPage} />);
    fireEvent.click(screen.getByRole("button", { name: "1.1.1 插入節點" }));

    expect(onSelectPage).toHaveBeenCalledExactlyOnceWith(3, {
      behavior: "smooth",
    });
  });

  it("marks active bookmark state from React currentPageIndex", () => {
    const onSelectPage = vi.fn();

    render(<Bookmarks items={bookmarkItems} currentPageIndex={2} onSelectPage={onSelectPage} />);

    const section = screen.getByRole("button", { name: "1.1 用 link 陣列模擬鏈結關係" });
    const chapter = screen.getByRole("button", { name: "01 List、Node 與 Pointer" });

    expect(section.className).toContain("is-active");
    expect(section.getAttribute("data-openpress-bookmark-current")).toBe("true");
    expect(section.getAttribute("aria-current")).toBe("location");
    expect(chapter.className).toContain("is-active");
    expect(chapter.getAttribute("data-openpress-bookmark-active")).toBe("true");
    expect(chapter.getAttribute("data-openpress-bookmark-current")).toBeNull();
    expect(chapter.getAttribute("aria-current")).toBeNull();
  });
});
