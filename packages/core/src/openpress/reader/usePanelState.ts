import { useCallback, useEffect, useState } from "react";

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

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => {
      const closeLeftPanel = leftPanelOpen && !shouldOpenLeftPanel();
      const closeRightPanel = rightPanelOpen && !shouldOpenRightPanel();

      if (closeLeftPanel) setLeftPanelOpen(false);
      if (closeRightPanel) setRightPanelOpen(false);
      if (closeLeftPanel || closeRightPanel) onAfterResize?.();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, [leftPanelOpen, rightPanelOpen, shouldOpenLeftPanel, shouldOpenRightPanel, onAfterResize]);

  const toggleLeftPanel = useCallback(() => setLeftPanelOpen((open) => !open), []);
  const toggleRightPanel = useCallback(() => setRightPanelOpen((open) => !open), []);

  return { leftPanelOpen, rightPanelOpen, toggleLeftPanel, toggleRightPanel };
}
