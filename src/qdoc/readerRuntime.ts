import { useCallback, useEffect, useRef, useState, type RefCallback } from "react";
import { pageIndexFromHash, replacePageRoute } from "./pageRoute";
import { createReaderPageRegistry } from "./readerPageRegistry";
import { clampReaderPageIndex, formatReaderPageNumber, normalizeReaderPageCount } from "./readerState";
import { createPageVisibilityObserver, scrollToPage } from "./readerScroll";

export interface SetPageOptions {
  behavior?: ScrollBehavior;
}

interface UseQDocReaderRuntimeOptions {
  pageCount: number;
  rightPanelBreakpoint?: number;
}

// Generous upper bound on a smooth scrollIntoView. If the target ref is gone or
// the browser never settles on it, clear the guard so the IO observer regains
// authority over currentPageIndex.
const PROGRAMMATIC_SCROLL_FALLBACK_MS = 2500;

export function useQDocReaderRuntime({ pageCount, rightPanelBreakpoint = 1000 }: UseQDocReaderRuntimeOptions) {
  const normalizedPageCount = normalizeReaderPageCount(pageCount);
  const stageRef = useRef<HTMLElement | null>(null);
  const [pageRegistrationVersion, setPageRegistrationVersion] = useState(0);
  const pageRegistry = useRef<ReturnType<typeof createReaderPageRegistry<HTMLElement>> | null>(null);
  if (!pageRegistry.current) {
    pageRegistry.current = createReaderPageRegistry<HTMLElement>(setPageRegistrationVersion);
  }

  const [currentPageIndex, setCurrentPageIndex] = useState(() => {
    if (typeof window === "undefined") return 0;
    const fromHash = pageIndexFromHash(window.location.hash, normalizedPageCount);
    return fromHash ?? 0;
  });
  const [rightPanelOpen, setRightPanelOpen] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= rightPanelBreakpoint,
  );

  const currentPageIndexRef = useRef(currentPageIndex);
  currentPageIndexRef.current = currentPageIndex;

  // While a programmatic scroll is in flight, the IntersectionObserver should
  // only accept the destination page (not the intermediates we sweep past).
  // The ref clears as soon as the destination becomes visible.
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

  useEffect(() => {
    pageRegistry.current?.trim(normalizedPageCount);
    setCurrentPageIndex((idx) => clampReaderPageIndex(idx, normalizedPageCount));
  }, [normalizedPageCount]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const observer = createPageVisibilityObserver(stage, (pageIndex) => {
      // During a programmatic scroll, ignore intermediate pages the browser
      // sweeps past; only the destination counts as the new current page.
      if (pendingScrollTargetRef.current !== null) {
        if (pageIndex !== pendingScrollTargetRef.current) return;
        clearPendingScrollTarget();
      }
      setCurrentPageIndex((prev) => (prev === pageIndex ? prev : pageIndex));
    });
    if (!observer) return undefined;
    pageRegistry.current?.refs.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [clearPendingScrollTarget, normalizedPageCount, pageRegistrationVersion]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    replacePageRoute(currentPageIndex);
  }, [currentPageIndex]);

  // When refs change (initial mount, pagination kicks in), re-anchor the
  // stage to the page we already believe we're on. Otherwise scroll-snap
  // mandatory snaps to whichever page happens to sit closest to the current
  // scroll position. Only fire when we have somewhere non-default to land,
  // so the IO observer stays free to drive state during ordinary navigation.
  useEffect(() => {
    const refs = pageRegistry.current?.refs ?? [];
    const idx = currentPageIndexRef.current;
    if (idx === 0) return;
    if (!refs[idx]) return;
    armPendingScrollTarget(idx);
    scrollToPage(refs, idx, "instant");
  }, [armPendingScrollTarget, pageRegistrationVersion]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncFromHash = (behavior: ScrollBehavior) => {
      const refs = pageRegistry.current?.refs ?? [];
      const hashPage = pageIndexFromHash(window.location.hash, normalizedPageCount);
      if (hashPage === null) return;
      // Our own replacePageRoute call writes the hash to mirror state; skip
      // if the hash already matches so we don't fight ourselves.
      if (hashPage === currentPageIndexRef.current) return;
      armPendingScrollTarget(hashPage);
      setCurrentPageIndex(hashPage);
      scrollToPage(refs, hashPage, behavior);
    };

    const onHashChange = () => syncFromHash("smooth");
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onHashChange);
    };
  }, [armPendingScrollTarget, normalizedPageCount]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let frame: number | null = null;
    const reAnchorAfterPaint = () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = null;
        const refs = pageRegistry.current?.refs ?? [];
        // If a programmatic scroll is in flight, re-anchor to its destination
        // so the snap doesn't pull us back to where we were before clicking.
        const target = pendingScrollTargetRef.current ?? currentPageIndexRef.current;
        scrollToPage(refs, target, "instant");
      });
    };

    const handleResize = () => {
      setRightPanelOpen(window.innerWidth >= rightPanelBreakpoint);
      // scroll-snap-type: y mandatory re-aligns to the closest snap point on
      // viewport change, which can land one page off from where the reader was.
      // Pin to the IO-confirmed current page (or active programmatic target).
      reAnchorAfterPaint();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [rightPanelBreakpoint]);

  const setPage = useCallback(
    (pageIndex: number, options: SetPageOptions = {}) => {
      const refs = pageRegistry.current?.refs ?? [];
      const target = clampReaderPageIndex(pageIndex, normalizedPageCount);
      armPendingScrollTarget(target);
      setCurrentPageIndex(target);
      scrollToPage(refs, target, options.behavior ?? "smooth");
    },
    [armPendingScrollTarget, normalizedPageCount],
  );

  const nextPage = useCallback(() => {
    setPage(currentPageIndexRef.current + 1);
  }, [setPage]);

  const prevPage = useCallback(() => {
    setPage(currentPageIndexRef.current - 1);
  }, [setPage]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        nextPage();
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        prevPage();
      } else if (event.key === "Home") {
        event.preventDefault();
        setPage(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setPage(Math.max(0, normalizedPageCount - 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPage, prevPage, setPage, normalizedPageCount]);

  const registerPage = useCallback<(pageIndex: number) => RefCallback<HTMLElement>>(
    (pageIndex) => pageRegistry.current?.registerPage(pageIndex) ?? (() => undefined),
    [],
  );

  const progressPercent =
    normalizedPageCount <= 1 ? 100 : ((currentPageIndex + 1) / normalizedPageCount) * 100;

  return {
    stageRef,
    currentPageIndex,
    currentPageLabel: formatReaderPageNumber(currentPageIndex + 1),
    totalPageLabel: formatReaderPageNumber(normalizedPageCount),
    progressPercent,
    rightPanelOpen,
    registerPage,
    setPage,
    toggleRightPanel: () => setRightPanelOpen((open) => !open),
  };
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, button, [contenteditable='true']"));
}
