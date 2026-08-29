import { useCallback, useEffect, useRef, useState } from "react";
import {
  resolveInitialPanelVisibility,
  setRightPanelVisibility,
  toggleLeftPanelVisibility,
  toggleRightPanelVisibility,
  type ReaderPanelVisibility,
} from "./panelStateModel";

export interface UsePanelStateOptions {
  leftPanelBreakpoint?: number;
  rightPanelBreakpoint?: number;
  onAfterResize?: () => void;
  panelStateStorageKey?: string;
  initialPanelState?: Pick<PanelState, "leftPanelOpen" | "rightPanelOpen">;
}

export interface PanelState extends ReaderPanelVisibility {
  setRightPanelOpen: (open: boolean) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
}

export function usePanelState({
  leftPanelBreakpoint,
  rightPanelBreakpoint = 1000,
  onAfterResize,
  panelStateStorageKey,
  initialPanelState = { leftPanelOpen: false, rightPanelOpen: false },
}: UsePanelStateOptions = {}): PanelState {
  const viewport = useCallback(() => ({
    viewportWidth: typeof window === "undefined" ? undefined : window.innerWidth,
    leftPanelBreakpoint,
    rightPanelBreakpoint,
  }), [leftPanelBreakpoint, rightPanelBreakpoint]);
  const [panelVisibility, setPanelVisibility] = useState(() => resolveInitialPanelVisibility(
    readStoredPanelState(panelStateStorageKey, initialPanelState),
    {
      viewportWidth: typeof window === "undefined" ? undefined : window.innerWidth,
      leftPanelBreakpoint,
      rightPanelBreakpoint,
    },
  ));
  const { leftPanelOpen, rightPanelOpen } = panelVisibility;

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
      const current = panelStateRef.current;
      const next = resolveInitialPanelVisibility(current, viewport());
      const closeLeftPanel = current.leftPanelOpen && !next.leftPanelOpen;
      const closeRightPanel = current.rightPanelOpen && !next.rightPanelOpen;

      if (closeLeftPanel || closeRightPanel) setPanelVisibility(next);
      if (closeLeftPanel || closeRightPanel) onAfterResize?.();
    };

    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, [onAfterResize, viewport]);

  useEffect(() => {
    writeStoredPanelState(panelStateStorageKey, { leftPanelOpen, rightPanelOpen });
  }, [leftPanelOpen, panelStateStorageKey, rightPanelOpen]);

  const toggleLeftPanel = useCallback(() => {
    setPanelVisibility((current) => toggleLeftPanelVisibility(current, viewport()));
  }, [viewport]);
  const setRightPanelOpen = useCallback((open: boolean) => {
    setPanelVisibility((current) => setRightPanelVisibility(current, open, viewport()));
  }, [viewport]);
  const toggleRightPanel = useCallback(() => {
    setPanelVisibility((current) => toggleRightPanelVisibility(current, viewport()));
  }, [viewport]);

  return { leftPanelOpen, rightPanelOpen, setRightPanelOpen, toggleLeftPanel, toggleRightPanel };
}

function readStoredPanelState(
  storageKey: string | undefined,
  initialPanelState: Pick<PanelState, "leftPanelOpen" | "rightPanelOpen">,
) {
  if (!storageKey || typeof window === "undefined") {
    return initialPanelState;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return initialPanelState;
    const parsed = JSON.parse(raw) as Partial<PanelState>;
    return {
      leftPanelOpen: parsed.leftPanelOpen === true,
      rightPanelOpen: parsed.rightPanelOpen === true,
    };
  } catch {
    return initialPanelState;
  }
}

function writeStoredPanelState(
  storageKey: string | undefined,
  state: Pick<PanelState, "leftPanelOpen" | "rightPanelOpen">,
) {
  if (!storageKey || typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Storage can be unavailable in private browsing or embedded contexts.
  }
}
