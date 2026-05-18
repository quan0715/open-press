import { useCallback, useEffect, useRef, useState, type RefCallback } from "react";

interface SetPageOptions {
  behavior?: ScrollBehavior;
  updateHash?: boolean;
  scroll?: boolean;
}

interface UseQDocReaderRuntimeOptions {
  pageCount: number;
  rightPanelBreakpoint?: number;
}

export function useQDocReaderRuntime({ pageCount, rightPanelBreakpoint = 1000 }: UseQDocReaderRuntimeOptions) {
  const stageRef = useRef<HTMLElement | null>(null);
  const pageRefs = useRef<Array<HTMLElement | null>>([]);
  const touchStartX = useRef<number | null>(null);
  const programmaticScrollTarget = useRef<number | null>(null);
  const programmaticScrollReleaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= rightPanelBreakpoint;
  });

  const releaseProgrammaticScrollLock = useCallback(() => {
    programmaticScrollTarget.current = null;
    if (programmaticScrollReleaseTimer.current !== null) {
      clearTimeout(programmaticScrollReleaseTimer.current);
      programmaticScrollReleaseTimer.current = null;
    }
  }, []);

  const startProgrammaticScrollLock = useCallback(
    (pageIndex: number, behavior: ScrollBehavior) => {
      releaseProgrammaticScrollLock();
      programmaticScrollTarget.current = pageIndex;
      programmaticScrollReleaseTimer.current = setTimeout(
        releaseProgrammaticScrollLock,
        behavior === "auto" ? 120 : 1800,
      );
    },
    [releaseProgrammaticScrollLock],
  );

  const setPage = useCallback(
    (pageIndex: number, options: SetPageOptions = {}) => {
      const nextIndex = clampPageIndex(pageIndex, pageCount);
      setCurrentPageIndex(nextIndex);

      if (options.scroll !== false) {
        const behavior = options.behavior ?? "smooth";
        startProgrammaticScrollLock(nextIndex, behavior);
        pageRefs.current[nextIndex]?.scrollIntoView({
          behavior,
          block: "start",
        });
      }

      if (options.updateHash) {
        const hash = `#page-${String(nextIndex + 1).padStart(2, "0")}`;
        window.history.replaceState(null, "", hash);
      }
    },
    [pageCount, startProgrammaticScrollLock],
  );

  const nextPage = useCallback(() => {
    setPage(currentPageIndex + 1);
  }, [currentPageIndex, setPage]);

  const prevPage = useCallback(() => {
    setPage(currentPageIndex - 1);
  }, [currentPageIndex, setPage]);

  const registerPage = useCallback(
    (pageIndex: number): RefCallback<HTMLElement> =>
      (node) => {
        pageRefs.current[pageIndex] = node;
      },
    [],
  );

  useEffect(() => {
    pageRefs.current = pageRefs.current.slice(0, pageCount);
    setCurrentPageIndex((value) => clampPageIndex(value, pageCount));
  }, [pageCount]);

  useEffect(() => releaseProgrammaticScrollLock, [releaseProgrammaticScrollLock]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncResponsivePanelState = () => {
      setRightPanelOpen(window.innerWidth >= rightPanelBreakpoint);
    };

    syncResponsivePanelState();
    window.addEventListener("resize", syncResponsivePanelState);
    return () => window.removeEventListener("resize", syncResponsivePanelState);
  }, [rightPanelBreakpoint]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const match = window.location.hash.match(/^#page-(\d+)$/);
    if (!match) return;
    const pageIndex = Number.parseInt(match[1], 10) - 1;
    window.requestAnimationFrame(() => setPage(pageIndex, { behavior: "auto", updateHash: false }));
  }, [setPage]);

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
          if (programmaticScrollTarget.current !== null) return;
          if (bestEl && bestRatio > 0) {
            const index = bestEl.getAttribute("data-qdoc-page-index");
            if (index !== null) {
              setCurrentPageIndex(clampPageIndex(Number.parseInt(index, 10), pageCount));
            }
          }
        }, 80);
      },
      {
        root: stage,
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    pageRefs.current.forEach((page) => {
      if (page) observer.observe(page);
    });

    return () => {
      observer.disconnect();
      if (debounceTimer !== null) clearTimeout(debounceTimer);
    };
  }, [pageCount]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const handleScrollEnd = () => releaseProgrammaticScrollLock();
    const handleUserScrollIntent = () => releaseProgrammaticScrollLock();

    stage.addEventListener("scrollend", handleScrollEnd);
    stage.addEventListener("wheel", handleUserScrollIntent, { passive: true });
    stage.addEventListener("touchstart", handleUserScrollIntent, { passive: true });

    return () => {
      stage.removeEventListener("scrollend", handleScrollEnd);
      stage.removeEventListener("wheel", handleUserScrollIntent);
      stage.removeEventListener("touchstart", handleUserScrollIntent);
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
        setPage(0);
      }
      if (event.key === "End") {
        event.preventDefault();
        setPage(pageCount - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPage, pageCount, prevPage, setPage]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const handleTouchStart = (event: TouchEvent) => {
      touchStartX.current = event.touches[0]?.clientX ?? null;
    };
    const handleTouchEnd = (event: TouchEvent) => {
      if (touchStartX.current === null) return;
      const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(delta) < 56) return;
      if (delta < 0) nextPage();
      else prevPage();
    };

    stage.addEventListener("touchstart", handleTouchStart, { passive: true });
    stage.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      stage.removeEventListener("touchstart", handleTouchStart);
      stage.removeEventListener("touchend", handleTouchEnd);
    };
  }, [nextPage, prevPage]);

  const progressPercent = pageCount <= 1 ? 100 : ((currentPageIndex + 1) / pageCount) * 100;

  return {
    stageRef,
    currentPageIndex,
    currentPageLabel: formatPageNumber(currentPageIndex + 1),
    totalPageLabel: formatPageNumber(pageCount),
    progressPercent,
    leftPanelOpen,
    rightPanelOpen,
    registerPage,
    setPage,
    nextPage,
    prevPage,
    toggleLeftPanel: () => setLeftPanelOpen((value) => !value),
    toggleRightPanel: () => setRightPanelOpen((value) => !value),
    openLeftPanel: () => setLeftPanelOpen(true),
    openRightPanel: () => setRightPanelOpen(true),
  };
}

function clampPageIndex(value: number, pageCount: number) {
  if (pageCount <= 0) return 0;
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), pageCount - 1);
}

function formatPageNumber(value: number) {
  return String(Math.max(value, 1)).padStart(2, "0");
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, button, [contenteditable='true']"));
}
