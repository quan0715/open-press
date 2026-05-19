import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QDocBookmarks } from "../src/qdoc/workbenchPanels";
import type { QDocBookmarkItem } from "../src/qdoc/indexes";

const bookmarkItems: QDocBookmarkItem[] = [
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

describe("QDocBookmarks", () => {
  it("emits bookmark navigation intent for chapter buttons", () => {
    const onSelectPage = vi.fn();

    render(<QDocBookmarks items={bookmarkItems} currentPageIndex={0} onSelectPage={onSelectPage} />);
    fireEvent.click(screen.getByRole("button", { name: "01 List、Node 與 Pointer" }));

    expect(onSelectPage).toHaveBeenCalledExactlyOnceWith(1, {
      behavior: "smooth",
      source: "bookmark",
    });
  });

  it("emits bookmark navigation intent for section buttons", () => {
    const onSelectPage = vi.fn();

    render(<QDocBookmarks items={bookmarkItems} currentPageIndex={0} onSelectPage={onSelectPage} />);
    fireEvent.click(screen.getByRole("button", { name: "1.1 用 link 陣列模擬鏈結關係" }));

    expect(onSelectPage).toHaveBeenCalledExactlyOnceWith(2, {
      behavior: "smooth",
      source: "bookmark",
    });
  });

  it("emits bookmark navigation intent for topic buttons", () => {
    const onSelectPage = vi.fn();

    render(<QDocBookmarks items={bookmarkItems} currentPageIndex={0} onSelectPage={onSelectPage} />);
    fireEvent.click(screen.getByRole("button", { name: "1.1.1 插入節點" }));

    expect(onSelectPage).toHaveBeenCalledExactlyOnceWith(3, {
      behavior: "smooth",
      source: "bookmark",
    });
  });

  it("marks active bookmark state from React currentPageIndex", () => {
    const onSelectPage = vi.fn();

    render(<QDocBookmarks items={bookmarkItems} currentPageIndex={2} onSelectPage={onSelectPage} />);

    expect(screen.getByRole("button", { name: "1.1 用 link 陣列模擬鏈結關係" }).className).toContain("is-active");
    expect(screen.getByRole("button", { name: "01 List、Node 與 Pointer" }).className).not.toContain("is-active");
  });
});
