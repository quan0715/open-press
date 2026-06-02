import { useCallback, useEffect, useRef, useState } from "react";

export interface UsePanelStateOptions {
  leftPanelBreakpoint?: number;
  rightPanelBreakpoint?: number;
  onAfterResize?: () => void;
}

export interface PanelState {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
}

export function usePanelState({
  leftPanelBreakpoint,
  rightPanelBreakpoint = 1000,
  onAfterResize,
}: UsePanelStateOptions = {}): PanelState {
  const shouldOpenLeftPanel = useCallback(
    () =>
      leftPanelBreakpoint === undefined || typeof window === "undefined" || window.innerWidth >= leftPanelBreakpoint,
    [leftPanelBreakpoint],
  );
  const shouldOpenRightPanel = useCallback(
    () => typeof window === "undefined" || window.innerWidth >= rightPanelBreakpoint,
    [rightPanelBreakpoint],
  );

  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);

  // The auto-close-on-narrow rule is a *resize* response, not a state-change
  // response. Keep current panel state in a ref so the resize listener can read
  // it without re-subscribing every toggle — otherwise toggling a drawer open
  // in a narrow viewport would re-run this effect, call handleResize
  // synchronously, see "open + below breakpoint", and immediately close the
  // panel the user just opened.
  const panelStateRef = useRef({ leftPanelOpen, rightPanelOpen });
  panelStateRef.current = { leftPanelOpen, rightPanelOpen };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => {
      const { leftPanelOpen: lo, rightPanelOpen: ro } = panelStateRef.current;
      const closeLeftPanel = lo && !shouldOpenLeftPanel();
      const closeRightPanel = ro && !shouldOpenRightPanel();

      if (closeLeftPanel) setLeftPanelOpen(false);
      if (closeRightPanel) setRightPanelOpen(false);
      if (closeLeftPanel || closeRightPanel) onAfterResize?.();
    };

    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, [shouldOpenLeftPanel, shouldOpenRightPanel, onAfterResize]);

  const toggleLeftPanel = useCallback(() => setLeftPanelOpen((open) => !open), []);
  const toggleRightPanel = useCallback(() => setRightPanelOpen((open) => !open), []);

  return { leftPanelOpen, rightPanelOpen, toggleLeftPanel, toggleRightPanel };
}
