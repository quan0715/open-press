import { useCallback, useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { BookmarkItem } from "../../../src/openpress/document-model";
import { useWorkbenchBookmarkGuide } from "../../../src/openpress/workbench/hooks/useWorkbenchBookmarkGuide";

const BEFORE: BookmarkItem[] = [
  {
    id: "chapter-before",
    anchorId: "section-intro",
    title: "Introduction",
    label: "01",
    pageIndex: 2,
    endPageIndex: 8,
    subs: [
      {
        id: "section-before",
        anchorId: "old-overview-anchor",
        title: "Overview",
        label: "1.1",
        pageIndex: 4,
        endPageIndex: 8,
        subs: [],
      },
    ],
  },
];

const AFTER: BookmarkItem[] = [
  {
    id: "chapter-after",
    anchorId: "section-intro",
    title: "Introduction",
    label: "01",
    pageIndex: 6,
    endPageIndex: 14,
    subs: [
      {
        id: "section-after",
        anchorId: "new-overview-anchor",
        title: "Overview",
        label: "1.1",
        pageIndex: 10,
        endPageIndex: 14,
        subs: [],
      },
    ],
  },
];

let root: Root | null = null;

export function mountBookmarkGuideHarness() {
  root?.unmount();
  const container = document.createElement("div");
  container.id = "bookmark-guide-harness-root";
  document.body.append(container);
  root = createRoot(container);
  root.render(<BookmarkGuideHarness />);
}

function BookmarkGuideHarness() {
  const [bookmarks, setBookmarks] = useState(BEFORE);
  const [documentKey, setDocumentKey] = useState("render-1");
  const [currentPageIndex, setCurrentPageIndex] = useState(4);
  const [transitions, setTransitions] = useState([4]);
  const [ready, setReady] = useState(false);
  const setPage = useCallback((pageIndex: number) => {
    setCurrentPageIndex(pageIndex);
    setTransitions((current) => current.at(-1) === pageIndex ? current : [...current, pageIndex]);
  }, []);

  useWorkbenchBookmarkGuide({
    bookmarks,
    currentPageIndex,
    documentKey,
    storageKey: null,
    setPage,
  });

  useEffect(() => {
    const controls = window as typeof window & { __openpressBookmarkGuideRepaginate?: () => void };
    controls.__openpressBookmarkGuideRepaginate = () => {
      setBookmarks(AFTER);
      setDocumentKey("render-2");
    };
    setReady(true);
    return () => {
      delete controls.__openpressBookmarkGuideRepaginate;
    };
  }, []);

  return (
    <div
      data-bookmark-guide-harness
      data-current-page-index={currentPageIndex}
      data-page-transitions={transitions.join(",")}
      data-ready={ready ? "true" : "false"}
    />
  );
}
