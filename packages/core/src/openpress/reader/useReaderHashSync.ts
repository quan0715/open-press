import { useEffect, type MutableRefObject } from "react";
import { pageIndexFromHash, replacePageRoute } from "./readerPageRoute";
import { scrollToPage } from "./readerScroll";

export interface UseReaderHashSyncOptions {
  stageRef: MutableRefObject<HTMLElement | null>;
  pageRefs: MutableRefObject<Array<HTMLElement | null>>;
  currentPageIndex: number;
  currentPageIndexRef: MutableRefObject<number>;
  normalizedPageCount: number;
  setCurrentPageIndex: (index: number) => void;
  armPendingScrollTarget: (target: number) => void;
}

export function useReaderHashSync({
  stageRef,
  pageRefs,
  currentPageIndex,
  currentPageIndexRef,
  normalizedPageCount,
  setCurrentPageIndex,
  armPendingScrollTarget,
}: UseReaderHashSyncOptions) {
  // Mirror currentPageIndex into the URL hash so deep links + history work.
  useEffect(() => {
    if (typeof window === "undefined") return;
    replacePageRoute(currentPageIndex);
  }, [currentPageIndex]);

  // Listen for hash/back/forward navigation and drive scroll to match.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncFromHash = (behavior: ScrollBehavior) => {
      const refs = pageRefs.current;
      const hashPage = pageIndexFromHash(window.location.hash, normalizedPageCount);
      if (hashPage === null) return;
      // replacePageRoute writes the hash to mirror state; skip if it already
      // matches so we don't fight ourselves.
      if (hashPage === currentPageIndexRef.current) return;
      armPendingScrollTarget(hashPage);
      setCurrentPageIndex(hashPage);
      scrollToPage(refs, hashPage, behavior, stageRef.current);
    };

    const onHashChange = () => syncFromHash("smooth");
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onHashChange);
    };
  }, [
    armPendingScrollTarget,
    currentPageIndexRef,
    normalizedPageCount,
    pageRefs,
    setCurrentPageIndex,
    stageRef,
  ]);
}
