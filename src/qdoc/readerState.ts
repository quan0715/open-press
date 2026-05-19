export type ReaderNavigationSource = "api" | "bookmark" | "keyboard" | "route" | "observer" | "layout";

export interface ReaderScrollRequest {
  id: number;
  pageIndex: number;
  behavior: ScrollBehavior;
  source: ReaderNavigationSource;
}

export interface ReaderRouteRequest {
  id: number;
  pageIndex: number;
  mode: "replace";
  source: ReaderNavigationSource;
}

export interface ReaderState {
  pageCount: number;
  currentPageIndex: number;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  programmaticScrollTarget: number | null;
  scrollRequest: ReaderScrollRequest | null;
  routeRequest: ReaderRouteRequest | null;
  requestId: number;
}

export type ReaderAction =
  | { type: "pageCountChanged"; pageCount: number }
  | {
      type: "navigate";
      pageIndex: number;
      source: "api" | "bookmark" | "keyboard";
      behavior?: ScrollBehavior;
      updateRoute?: boolean;
      scroll?: boolean;
    }
  | { type: "routeChanged"; pageIndex: number }
  | { type: "layoutReanchor"; pageIndex?: number }
  | { type: "intersectionSettled"; pageIndex: number }
  | { type: "programmaticScrollReleased" }
  | { type: "setLeftPanelOpen"; open: boolean }
  | { type: "toggleLeftPanel" }
  | { type: "setRightPanelOpen"; open: boolean }
  | { type: "toggleRightPanel" };

export function createInitialReaderState({
  pageCount,
  rightPanelOpen,
  currentPageIndex = 0,
  leftPanelOpen = true,
}: {
  pageCount: number;
  rightPanelOpen: boolean;
  currentPageIndex?: number;
  leftPanelOpen?: boolean;
}): ReaderState {
  const normalizedPageCount = normalizeReaderPageCount(pageCount);
  return {
    pageCount: normalizedPageCount,
    currentPageIndex: clampReaderPageIndex(currentPageIndex, normalizedPageCount),
    leftPanelOpen,
    rightPanelOpen,
    programmaticScrollTarget: null,
    scrollRequest: null,
    routeRequest: null,
    requestId: 0,
  };
}

export function readerReducer(state: ReaderState, action: ReaderAction): ReaderState {
  switch (action.type) {
    case "pageCountChanged": {
      const pageCount = normalizeReaderPageCount(action.pageCount);
      return {
        ...state,
        pageCount,
        currentPageIndex: clampReaderPageIndex(state.currentPageIndex, pageCount),
        programmaticScrollTarget: null,
        scrollRequest: null,
        routeRequest: null,
      };
    }
    case "navigate":
      return transitionToPage(state, {
        pageIndex: action.pageIndex,
        source: action.source,
        behavior: action.behavior ?? "smooth",
        updateRoute: action.updateRoute !== false,
        scroll: action.scroll !== false,
      });
    case "routeChanged":
      return transitionToPage(state, {
        pageIndex: action.pageIndex,
        source: "route",
        behavior: "auto",
        updateRoute: false,
        scroll: true,
      });
    case "layoutReanchor":
      return transitionToPage(state, {
        pageIndex: action.pageIndex ?? state.currentPageIndex,
        source: "layout",
        behavior: "auto",
        updateRoute: false,
        scroll: true,
      });
    case "intersectionSettled":
      if (state.programmaticScrollTarget !== null) return state;
      return transitionToPage(state, {
        pageIndex: action.pageIndex,
        source: "observer",
        behavior: "auto",
        updateRoute: true,
        scroll: false,
      });
    case "programmaticScrollReleased":
      if (state.programmaticScrollTarget === null) return state;
      return {
        ...state,
        programmaticScrollTarget: null,
      };
    case "setLeftPanelOpen":
      return {
        ...state,
        leftPanelOpen: action.open,
      };
    case "toggleLeftPanel":
      return {
        ...state,
        leftPanelOpen: !state.leftPanelOpen,
      };
    case "setRightPanelOpen":
      return {
        ...state,
        rightPanelOpen: action.open,
      };
    case "toggleRightPanel":
      return {
        ...state,
        rightPanelOpen: !state.rightPanelOpen,
      };
    default:
      return state;
  }
}

export function clampReaderPageIndex(value: number, pageCount: number) {
  const normalizedPageCount = normalizeReaderPageCount(pageCount);
  if (normalizedPageCount <= 0) return 0;
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.trunc(value), 0), normalizedPageCount - 1);
}

export function formatReaderPageNumber(value: number) {
  return String(Math.max(Math.trunc(value), 1)).padStart(2, "0");
}

function normalizeReaderPageCount(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(Math.trunc(value), 0);
}

function transitionToPage(
  state: ReaderState,
  {
    pageIndex,
    source,
    behavior,
    updateRoute,
    scroll,
  }: {
    pageIndex: number;
    source: ReaderNavigationSource;
    behavior: ScrollBehavior;
    updateRoute: boolean;
    scroll: boolean;
  },
): ReaderState {
  const nextPageIndex = clampReaderPageIndex(pageIndex, state.pageCount);
  const requestId = state.requestId + 1;
  return {
    ...state,
    currentPageIndex: nextPageIndex,
    requestId,
    programmaticScrollTarget: scroll ? nextPageIndex : state.programmaticScrollTarget,
    scrollRequest: scroll
      ? {
          id: requestId,
          pageIndex: nextPageIndex,
          behavior,
          source,
        }
      : null,
    routeRequest: updateRoute
      ? {
          id: requestId,
          pageIndex: nextPageIndex,
          mode: "replace",
          source,
        }
      : null,
  };
}
