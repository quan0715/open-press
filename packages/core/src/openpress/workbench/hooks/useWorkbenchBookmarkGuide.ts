import { useEffect, useLayoutEffect, useRef } from "react";
import {
  bookmarkGuideForPage,
  resolveBookmarkGuidePage,
  type BookmarkGuide,
  type BookmarkItem,
} from "../../document-model";

type SetPage = (pageIndex: number, options?: { behavior?: ScrollBehavior }) => void;

type StoredBookmarkPosition = {
  pageIndex: number;
  guide: BookmarkGuide;
};

export function useWorkbenchBookmarkGuide({
  bookmarks,
  currentPageIndex,
  documentKey,
  storageKey,
  setPage,
}: {
  bookmarks: BookmarkItem[];
  currentPageIndex: number;
  documentKey: unknown;
  storageKey?: string | null;
  setPage: SetPage;
}) {
  const initializedRef = useRef(false);
  const previousDocumentKeyRef = useRef(documentKey);
  const previousStorageKeyRef = useRef(storageKey);
  const guideRef = useRef<BookmarkGuide | null>(null);
  const pendingPageRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const firstRun = !initializedRef.current;
    const documentChanged = !Object.is(previousDocumentKeyRef.current, documentKey);
    const storageKeyChanged = previousStorageKeyRef.current !== storageKey;
    initializedRef.current = true;
    previousDocumentKeyRef.current = documentKey;
    previousStorageKeyRef.current = storageKey;

    let guide = documentChanged && !storageKeyChanged ? guideRef.current : null;
    if (firstRun || storageKeyChanged) {
      guideRef.current = null;
      pendingPageRef.current = null;
      const stored = readStoredBookmarkPosition(storageKey);
      guide = stored?.pageIndex === currentPageIndex ? stored.guide : null;
    }
    if (!guide) return;

    guideRef.current = guide;
    const targetPageIndex = resolveBookmarkGuidePage(bookmarks, guide);
    if (targetPageIndex === null || targetPageIndex === currentPageIndex) return;
    pendingPageRef.current = targetPageIndex;
    setPage(targetPageIndex, { behavior: "auto" });
  }, [bookmarks, currentPageIndex, documentKey, setPage, storageKey]);

  useEffect(() => {
    const pendingPage = pendingPageRef.current;
    if (pendingPage !== null && pendingPage !== currentPageIndex) return;
    pendingPageRef.current = null;

    const guide = bookmarkGuideForPage(bookmarks, currentPageIndex);
    guideRef.current = guide;
    if (guide) writeStoredBookmarkPosition(storageKey, { pageIndex: currentPageIndex, guide });
  }, [bookmarks, currentPageIndex, storageKey]);
}

function readStoredBookmarkPosition(storageKey?: string | null): StoredBookmarkPosition | null {
  if (!storageKey || typeof window === "undefined") return null;
  try {
    return parseStoredBookmarkPosition(window.sessionStorage.getItem(storageKey));
  } catch {
    return null;
  }
}

export function parseStoredBookmarkPosition(raw: string | null): StoredBookmarkPosition | null {
  try {
    const parsed = JSON.parse(raw ?? "null") as Partial<StoredBookmarkPosition> | null;
    if (!parsed || !Number.isInteger(parsed.pageIndex) || (parsed.pageIndex as number) < 0 || !isBookmarkGuide(parsed.guide)) {
      return null;
    }
    return { pageIndex: parsed.pageIndex as number, guide: parsed.guide };
  } catch {
    return null;
  }
}

function writeStoredBookmarkPosition(storageKey: string | null | undefined, position: StoredBookmarkPosition) {
  if (!storageKey || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(position));
  } catch {
    // Reading position persistence is best-effort in restricted browser contexts.
  }
}

function isBookmarkGuide(value: unknown): value is BookmarkGuide {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { chapter?: unknown; section?: unknown };
  return isBookmarkGuidePart(candidate.chapter)
    && (candidate.section === undefined || isBookmarkGuidePart(candidate.section));
}

function isBookmarkGuidePart(value: unknown): value is BookmarkGuide["chapter"] {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { title?: unknown; anchorId?: unknown; label?: unknown };
  return typeof candidate.title === "string"
    && (candidate.anchorId === undefined || typeof candidate.anchorId === "string")
    && (candidate.label === undefined || typeof candidate.label === "string");
}
