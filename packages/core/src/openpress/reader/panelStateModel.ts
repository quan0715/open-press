export interface ReaderPanelVisibility {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
}

export interface ReaderPanelViewport {
  viewportWidth?: number;
  leftPanelBreakpoint?: number;
  rightPanelBreakpoint?: number;
}

export function resolveInitialPanelVisibility(
  visibility: ReaderPanelVisibility,
  viewport: ReaderPanelViewport,
): ReaderPanelVisibility {
  return {
    leftPanelOpen: visibility.leftPanelOpen
      && panelFitsViewport(viewport.viewportWidth, viewport.leftPanelBreakpoint),
    rightPanelOpen: visibility.rightPanelOpen
      && panelFitsViewport(viewport.viewportWidth, viewport.rightPanelBreakpoint),
  };
}

export function toggleLeftPanelVisibility(
  visibility: ReaderPanelVisibility,
  viewport: ReaderPanelViewport,
): ReaderPanelVisibility {
  const leftPanelOpen = !visibility.leftPanelOpen;
  return {
    leftPanelOpen,
    rightPanelOpen: leftPanelOpen
      && !panelFitsViewport(viewport.viewportWidth, viewport.leftPanelBreakpoint)
      ? false
      : visibility.rightPanelOpen,
  };
}

export function setRightPanelVisibility(
  visibility: ReaderPanelVisibility,
  rightPanelOpen: boolean,
  viewport: ReaderPanelViewport,
): ReaderPanelVisibility {
  return {
    leftPanelOpen: rightPanelOpen
      && !panelFitsViewport(viewport.viewportWidth, viewport.rightPanelBreakpoint)
      ? false
      : visibility.leftPanelOpen,
    rightPanelOpen,
  };
}

export function toggleRightPanelVisibility(
  visibility: ReaderPanelVisibility,
  viewport: ReaderPanelViewport,
): ReaderPanelVisibility {
  return setRightPanelVisibility(visibility, !visibility.rightPanelOpen, viewport);
}

function panelFitsViewport(viewportWidth: number | undefined, breakpoint: number | undefined) {
  return breakpoint === undefined || viewportWidth === undefined || viewportWidth >= breakpoint;
}
