import { useCallback, useEffect, useMemo, useRef, useState, type RefCallback } from "react";
import { pageIndexFromHash } from "./readerPageRoute";
import { createReaderPageRegistry } from "./readerPageRegistry";
import { clampReaderPageIndex, formatReaderPageNumber, normalizeReaderPageCount } from "./readerStateModel";
import { createPageVisibilityObserver, scrollToPage } from "./readerScroll";
import { usePanelState } from "./usePanelState";
import { useReaderScrollAnchor } from "./useReaderScrollAnchor";
import { useReaderHashSync } from "./useReaderHashSync";
import { useReaderKeyboardNav } from "./useReaderKeyboardNav";

export interface SetPageOptions {
  behavior?: ScrollBehavior;
}

interface UseReaderRuntimeOptions {
  pageCount: number;
  leftPanelBreakpoint?: number;
  rightPanelBreakpoint?: number;
  panelStateStorageKey?: string;
  initialPanelState?: {
    leftPanelOpen: boolean;
    rightPanelOpen: boolean;
  };
}

export function useReaderRuntime({
  pageCount,
  leftPanelBreakpoint,
  rightPanelBreakpoint = 1000,
  panelStateStorageKey,
  initialPanelState,
}: UseReaderRuntimeOptions) {
  const normalizedPageCount = normalizeReaderPageCount(pageCount);
  const stageRef = useRef<HTMLElement | null>(null);
  const [pageRegistrationVersion, setPageRegistrationVersion] = useState(0);
  const pageRegistry = useRef<ReturnType<typeof createReaderPageRegistry<HTMLElement>> | null>(null);
  if (!pageRegistry.current) {
    pageRegistry.current = createReaderPageRegistry<HTMLElement>(setPageRegistrationVersion);
  }
  const pageRefs = useMemo(() => ({
    get current() {
      return pageRegistry.current?.refs ?? [];
    },
  }), []) as { current: Array<HTMLElement | null> };

  const [currentPageIndex, setCurrentPageIndex] = useState(() => {
    if (typeof window === "undefined") return 0;
    const fromHash = pageIndexFromHash(window.location.hash, normalizedPageCount);
    return fromHash ?? 0;
  });
  const initialRoutedPageIndexRef = useRef<number | null>(
    typeof window === "undefined" ? null : pageIndexFromHash(window.location.hash, normalizedPageCount),
  );

  const currentPageIndexRef = useRef(currentPageIndex);
  currentPageIndexRef.current = currentPageIndex;

  const { pendingScrollTargetRef, armPendingScrollTarget, clearPendingScrollTarget } =
    useReaderScrollAnchor();

  const { leftPanelOpen, rightPanelOpen, toggleLeftPanel, toggleRightPanel } = usePanelState({
    leftPanelBreakpoint,
    rightPanelBreakpoint,
    panelStateStorageKey,
    initialPanelState,
  });

  // Trim the registry + clamp current page when the page count shrinks.
  useEffect(() => {
    pageRegistry.current?.trim(normalizedPageCount);
    setCurrentPageIndex((idx) => clampReaderPageIndex(idx, normalizedPageCount));
  }, [normalizedPageCount]);

  // Drive currentPageIndex from visible pages. Suppress intermediates while a
  // programmatic scroll is in flight.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const observer = createPageVisibilityObserver(stage, (pageIndex) => {
      if (pendingScrollTargetRef.current !== null) {
        if (pageIndex !== pendingScrollTargetRef.current) return;
        clearPendingScrollTarget();
      }
      setCurrentPageIndex((prev) => (prev === pageIndex ? prev : pageIndex));
    });
    if (!observer) return undefined;
    pageRegistry.current?.refs.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [clearPendingScrollTarget, normalizedPageCount, pageRegistrationVersion, pendingScrollTargetRef]);

  // When refs change (initial mount, pagination kicks in), honor an explicit
  // routed page after layout effects have restored the user's zoom level.
  // Natural scroll position remains user-owned after mount.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const refs = pageRegistry.current?.refs ?? [];
      const idx = currentPageIndexRef.current;
      if (idx === 0 || !refs[idx]) return;
      armPendingScrollTarget(idx);
      scrollToPage(refs, idx, "instant", stageRef.current);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [armPendingScrollTarget, pageRegistrationVersion]);

  const setPage = useCallback(
    (pageIndex: number, options: SetPageOptions = {}) => {
      const refs = pageRegistry.current?.refs ?? [];
      const target = clampReaderPageIndex(pageIndex, normalizedPageCount);
      armPendingScrollTarget(target);
      setCurrentPageIndex(target);
      scrollToPage(refs, target, options.behavior ?? "smooth", stageRef.current);
    },
    [armPendingScrollTarget, normalizedPageCount],
  );

  // The initial hash route can be laid out before a persisted page scale is
  // restored. Re-align that one route after the scale paints, then retire the
  // guard so later user-controlled zoom keeps the reading position intact.
  const reAnchorInitialRouteAfterPaint = useCallback(() => {
    const target = initialRoutedPageIndexRef.current;
    if (target === null || typeof window === "undefined") return;

    let previousScrollMargin = "";
    let stableFrames = 0;
    const alignWhenPageGeometrySettles = () => {
      const refs = pageRegistry.current?.refs ?? [];
      const page = refs[target];
      if (!page?.isConnected) return;
      const scrollMargin = window.getComputedStyle(page).scrollMarginTop;
      stableFrames = scrollMargin === previousScrollMargin ? stableFrames + 1 : 0;
      previousScrollMargin = scrollMargin;
      if (stableFrames < 2) {
        window.requestAnimationFrame(alignWhenPageGeometrySettles);
        return;
      }
      armPendingScrollTarget(target);
      if (!scrollToPage(refs, target, "instant", stageRef.current)) return;

      // CSS transforms can make a stage's scroll coordinate differ slightly
      // from the page's visual coordinate. Reconcile against the rendered
      // geometry instead of assuming one scrollTo call lands exactly there.
      const reconcileViewportPosition = (remainingAttempts: number) => {
        const stage = stageRef.current;
        const currentPage = pageRegistry.current?.refs[target];
        if (!stage || !currentPage?.isConnected) return;
        const delta = currentPage.getBoundingClientRect().top
          - stage.getBoundingClientRect().top
          - Number.parseFloat(window.getComputedStyle(currentPage).scrollMarginTop || "0");
        if (Math.abs(delta) <= 1 || remainingAttempts === 0) {
          initialRoutedPageIndexRef.current = null;
          return;
        }
        stage.scrollBy({ top: delta, behavior: "instant" });
        window.requestAnimationFrame(() => reconcileViewportPosition(remainingAttempts - 1));
      };
      window.requestAnimationFrame(() => reconcileViewportPosition(3));
    };
    window.requestAnimationFrame(alignWhenPageGeometrySettles);
  }, [armPendingScrollTarget]);

  const nextPage = useCallback(() => {
    setPage(currentPageIndexRef.current + 1);
  }, [setPage]);

  const prevPage = useCallback(() => {
    setPage(currentPageIndexRef.current - 1);
  }, [setPage]);

  useReaderHashSync({
    stageRef,
    pageRefs,
    currentPageIndex,
    currentPageIndexRef,
    normalizedPageCount,
    setCurrentPageIndex,
    armPendingScrollTarget,
  });

  useReaderKeyboardNav({ nextPage, prevPage, setPage, normalizedPageCount });

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
    leftPanelOpen,
    rightPanelOpen,
    registerPage,
    setPage,
    reAnchorInitialRouteAfterPaint,
    toggleLeftPanel,
    toggleRightPanel,
  };
}
