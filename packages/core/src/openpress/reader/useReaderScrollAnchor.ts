import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import { scrollToPage } from "./readerScroll";

// Generous upper bound on a smooth scrollIntoView. If the target ref is gone or
// the browser never settles on it, clear the guard so the IO observer regains
// authority over currentPageIndex.
const PROGRAMMATIC_SCROLL_FALLBACK_MS = 2500;

export interface UseReaderScrollAnchorOptions {
  stageRef: MutableRefObject<HTMLElement | null>;
  pageRefs: MutableRefObject<Array<HTMLElement | null>>;
  currentPageIndexRef: MutableRefObject<number>;
}

export interface ReaderScrollAnchor {
  pendingScrollTargetRef: MutableRefObject<number | null>;
  armPendingScrollTarget: (target: number) => void;
  clearPendingScrollTarget: () => void;
  reAnchorAfterPaint: () => void;
}

export function useReaderScrollAnchor({
  stageRef,
  pageRefs,
  currentPageIndexRef,
}: UseReaderScrollAnchorOptions): ReaderScrollAnchor {
  // While a programmatic scroll is in flight, the IntersectionObserver should
  // only accept the destination page (not the intermediates we sweep past).
  const pendingScrollTargetRef = useRef<number | null>(null);
  const pendingScrollClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const armPendingScrollTarget = useCallback((target: number) => {
    pendingScrollTargetRef.current = target;
    if (pendingScrollClearTimerRef.current !== null) clearTimeout(pendingScrollClearTimerRef.current);
    pendingScrollClearTimerRef.current = setTimeout(() => {
      pendingScrollTargetRef.current = null;
      pendingScrollClearTimerRef.current = null;
    }, PROGRAMMATIC_SCROLL_FALLBACK_MS);
  }, []);

  const clearPendingScrollTarget = useCallback(() => {
    pendingScrollTargetRef.current = null;
    if (pendingScrollClearTimerRef.current !== null) {
      clearTimeout(pendingScrollClearTimerRef.current);
      pendingScrollClearTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearPendingScrollTarget(), [clearPendingScrollTarget]);

  // Re-anchor the stage to the page we already believe we're on. scroll-snap
  // mandatory would otherwise snap to whichever page is closest after a layout
  // change. Pin to the active programmatic target if there is one.
  const reAnchorAfterPaint = useCallback(() => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      const refs = pageRefs.current;
      const target = pendingScrollTargetRef.current ?? currentPageIndexRef.current;
      scrollToPage(refs, target, "instant", stageRef.current);
    });
  }, [currentPageIndexRef, pageRefs, stageRef]);

  return { pendingScrollTargetRef, armPendingScrollTarget, clearPendingScrollTarget, reAnchorAfterPaint };
}
