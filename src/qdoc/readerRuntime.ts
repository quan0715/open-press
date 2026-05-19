import { useCallback, useEffect, useReducer, useRef, useState, type RefCallback } from "react";
import { pageIndexFromHash, replacePageRoute } from "./pageRoute";
import { createReaderPageRegistry } from "./readerPageRegistry";
import {
  createInitialReaderState,
  formatReaderPageNumber,
  readerReducer,
  type ReaderNavigationSource,
  type ReaderState,
} from "./readerState";

export interface SetPageOptions {
  behavior?: ScrollBehavior;
  updateHash?: boolean;
  scroll?: boolean;
  source?: Extract<ReaderNavigationSource, "api" | "bookmark" | "keyboard">;
}

interface UseQDocReaderRuntimeOptions {
  pageCount: number;
  rightPanelBreakpoint?: number;
}

export function useQDocReaderRuntime({ pageCount, rightPanelBreakpoint = 1000 }: UseQDocReaderRuntimeOptions) {
  const stageRef = useRef<HTMLElement | null>(null);
  const [pageRegistrationVersion, setPageRegistrationVersion] = useState(0);
  const pageRegistry = useRef<ReturnType<typeof createReaderPageRegistry<HTMLElement>> | null>(null);
  const programmaticScrollReleaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responsiveLayoutFrame = useRef<number | null>(null);
  const initialRightPanelOpen = typeof window === "undefined" ? true : window.innerWidth >= rightPanelBreakpoint;
  const [readerState, dispatch] = useReducer(
    readerReducer,
    { pageCount, rightPanelOpen: initialRightPanelOpen },
    createInitialReaderState,
  );
  const readerStateRef = useRef<ReaderState>(readerState);
  if (!pageRegistry.current) {
    pageRegistry.current = createReaderPageRegistry<HTMLElement>(setPageRegistrationVersion);
  }

  useEffect(() => {
    readerStateRef.current = readerState;
  }, [readerState]);

  const clearProgrammaticScrollTimer = useCallback(() => {
    if (programmaticScrollReleaseTimer.current !== null) {
      clearTimeout(programmaticScrollReleaseTimer.current);
      programmaticScrollReleaseTimer.current = null;
    }
  }, []);

  const releaseProgrammaticScrollLock = useCallback(() => {
    clearProgrammaticScrollTimer();
    dispatch({ type: "programmaticScrollReleased" });
  }, [clearProgrammaticScrollTimer]);

  const setPage = useCallback((pageIndex: number, options: SetPageOptions = {}) => {
    dispatch({
      type: "navigate",
      pageIndex,
      source: options.source ?? "api",
      behavior: options.behavior ?? "smooth",
      updateRoute: options.updateHash !== false,
      scroll: options.scroll !== false,
    });
  }, []);

  const nextPage = useCallback(() => {
    dispatch({
      type: "navigate",
      pageIndex: readerStateRef.current.currentPageIndex + 1,
      source: "keyboard",
      behavior: "smooth",
    });
  }, []);

  const prevPage = useCallback(() => {
    dispatch({
      type: "navigate",
      pageIndex: readerStateRef.current.currentPageIndex - 1,
      source: "keyboard",
      behavior: "smooth",
    });
  }, []);

  const registerPage = useCallback(
    (pageIndex: number): RefCallback<HTMLElement> =>
      pageRegistry.current?.registerPage(pageIndex) ?? (() => undefined),
    [],
  );

  useEffect(() => {
    pageRegistry.current?.trim(pageCount);
    dispatch({ type: "pageCountChanged", pageCount });
  }, [pageCount]);

  useEffect(() => {
    const request = readerState.routeRequest;
    if (!request) return;
    replacePageRoute(request.pageIndex);
  }, [readerState.routeRequest]);

  useEffect(() => {
    const request = readerState.scrollRequest;
    if (!request) return;

    clearProgrammaticScrollTimer();
    pageRegistry.current?.refs[request.pageIndex]?.scrollIntoView({
      behavior: request.behavior,
      block: "start",
    });
    programmaticScrollReleaseTimer.current = setTimeout(
      () => dispatch({ type: "programmaticScrollReleased" }),
      request.behavior === "auto" ? 120 : 1800,
    );
  }, [clearProgrammaticScrollTimer, pageRegistrationVersion, readerState.scrollRequest]);

  useEffect(() => {
    return () => {
      clearProgrammaticScrollTimer();
      if (responsiveLayoutFrame.current !== null) {
        window.cancelAnimationFrame(responsiveLayoutFrame.current);
        responsiveLayoutFrame.current = null;
      }
    };
  }, [clearProgrammaticScrollTimer]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const keepCurrentPageAnchored = () => {
      if (responsiveLayoutFrame.current !== null) {
        window.cancelAnimationFrame(responsiveLayoutFrame.current);
      }
      responsiveLayoutFrame.current = window.requestAnimationFrame(() => {
        responsiveLayoutFrame.current = null;
        const { pageCount: latestPageCount, currentPageIndex } = readerStateRef.current;
        const routeIndex = pageIndexFromHash(window.location.hash, latestPageCount);
        dispatch({
          type: "layoutReanchor",
          pageIndex: routeIndex ?? currentPageIndex,
        });
      });
    };

    const syncResponsivePanelState = () => {
      dispatch({
        type: "setRightPanelOpen",
        open: window.innerWidth >= rightPanelBreakpoint,
      });
      keepCurrentPageAnchored();
    };

    syncResponsivePanelState();
    window.addEventListener("resize", syncResponsivePanelState);
    window.visualViewport?.addEventListener("resize", syncResponsivePanelState);
    return () => {
      window.removeEventListener("resize", syncResponsivePanelState);
      window.visualViewport?.removeEventListener("resize", syncResponsivePanelState);
    };
  }, [rightPanelBreakpoint]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncPageFromRoute = () => {
      const pageIndex = pageIndexFromHash(window.location.hash, readerStateRef.current.pageCount);
      if (pageIndex === null) return;
      window.requestAnimationFrame(() => {
        dispatch({ type: "routeChanged", pageIndex });
      });
    };

    syncPageFromRoute();
    window.addEventListener("hashchange", syncPageFromRoute);
    window.addEventListener("popstate", syncPageFromRoute);
    return () => {
      window.removeEventListener("hashchange", syncPageFromRoute);
      window.removeEventListener("popstate", syncPageFromRoute);
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof IntersectionObserver === "undefined") return undefined;

    const ratioMap = new Map<Element, number>();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratioMap.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
        }

        if (debounceTimer !== null) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          let bestEl: Element | null = null;
          let bestRatio = -1;
          for (const [el, ratio] of ratioMap) {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              bestEl = el;
            }
          }
          if (readerStateRef.current.programmaticScrollTarget !== null) return;
          if (bestEl && bestRatio > 0) {
            const index = bestEl.getAttribute("data-qdoc-page-index");
            if (index !== null) {
              dispatch({
                type: "intersectionSettled",
                pageIndex: Number.parseInt(index, 10),
              });
            }
          }
        }, 80);
      },
      {
        root: stage,
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    pageRegistry.current?.refs.forEach((page) => {
      if (page) observer.observe(page);
    });

    return () => {
      observer.disconnect();
      if (debounceTimer !== null) clearTimeout(debounceTimer);
    };
  }, [pageCount, pageRegistrationVersion]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const handleScrollEnd = () => releaseProgrammaticScrollLock();
    const handleUserScrollIntent = () => releaseProgrammaticScrollLock();

    stage.addEventListener("scrollend", handleScrollEnd);
    stage.addEventListener("wheel", handleUserScrollIntent, { passive: true });

    return () => {
      stage.removeEventListener("scrollend", handleScrollEnd);
      stage.removeEventListener("wheel", handleUserScrollIntent);
    };
  }, [releaseProgrammaticScrollLock]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        nextPage();
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        prevPage();
      }
      if (event.key === "Home") {
        event.preventDefault();
        setPage(0, { source: "keyboard" });
      }
      if (event.key === "End") {
        event.preventDefault();
        setPage(pageCount - 1, { source: "keyboard" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPage, pageCount, prevPage, setPage]);

  const progressPercent =
    readerState.pageCount <= 1 ? 100 : ((readerState.currentPageIndex + 1) / readerState.pageCount) * 100;

  return {
    stageRef,
    currentPageIndex: readerState.currentPageIndex,
    currentPageLabel: formatReaderPageNumber(readerState.currentPageIndex + 1),
    totalPageLabel: formatReaderPageNumber(readerState.pageCount),
    progressPercent,
    leftPanelOpen: readerState.leftPanelOpen,
    rightPanelOpen: readerState.rightPanelOpen,
    registerPage,
    setPage,
    nextPage,
    prevPage,
    toggleLeftPanel: () => dispatch({ type: "toggleLeftPanel" }),
    toggleRightPanel: () => dispatch({ type: "toggleRightPanel" }),
    openLeftPanel: () => dispatch({ type: "setLeftPanelOpen", open: true }),
    openRightPanel: () => dispatch({ type: "setRightPanelOpen", open: true }),
  };
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, button, [contenteditable='true']"));
}
