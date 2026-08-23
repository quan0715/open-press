import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { motion } from "motion/react";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import {
  TOOLBAR_CONTENT_CLASS,
  TOOLBAR_PANEL_TOGGLE_CLASS,
  WORKBENCH_TOOLBAR_CLASS,
} from "../toolbarClasses";
import { Button } from "@/openpress/ui/button";
import { matchesHotkey } from "../../hotkeys";
import { workspaceLayoutStyle } from "../../shared/themeStyleBoundary";
import {
  MAX_LEFT_PANEL_WIDTH,
  MIN_LEFT_PANEL_WIDTH,
  WORKBENCH_LEFT_PANEL_WIDTH_STORAGE_KEY,
  clampLeftPanelWidth,
  readLeftPanelWidth,
} from "./workbenchPanelWidth";

type WorkbenchShellContextValue = {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  presentationMode: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  withRightPanel: boolean;
  showPanelToggles: boolean;
  showRightPanelToggle: boolean;
  fixedPanels: boolean;
  resizableLeftPanel: boolean;
  compactLeftPanel: boolean;
  leftPanelWidth: number | null;
  setLeftPanelWidth: (width: number) => void;
  resetLeftPanelWidth: () => void;
};
type WorkbenchShellColorMode = "dark" | "light";

export const SHELL_COMPACT_MAX_WIDTH = 860;
export const SHELL_DRAWER_BREAKPOINT = SHELL_COMPACT_MAX_WIDTH + 1;
export const SHELL_COMPACT_MEDIA_QUERY = `(max-width: ${SHELL_COMPACT_MAX_WIDTH}px)`;

const WorkbenchShellContext = createContext<WorkbenchShellContextValue | null>(null);
const WORKBENCH_ROOT_CLASS = "op-workspace block min-h-screen bg-[var(--op-workspace-bg)] text-[var(--op-workspace-text)]";
const WORKBENCH_SHELL_BASE_CLASS = [
  "op-workspace-shell reader-app openpress-reader-app op-workspace-public-viewer is-ready",
  "[--op-workspace-toolbar-height:44px] [--op-workspace-panel-width:clamp(304px,22vw,390px)]",
  "[--op-workspace-left-width:var(--op-workspace-panel-width)] [--op-workspace-right-width:var(--op-workspace-panel-width)]",
  "[--openpress-public-nav-min-width:340px] [--openpress-public-nav-max-width:420px] [--openpress-public-nav-max-height:960px]",
  "relative grid h-dvh min-h-dvh w-full overflow-hidden bg-[var(--op-workspace-bg)] grid-rows-[var(--op-workspace-toolbar-height)_minmax(0,1fr)]",
  "[grid-template-areas:'toolbar_toolbar_toolbar'_'left_main_right']",
  // Tailwind needs literal breakpoints here. Keep max-[860px] aligned with
  // SHELL_COMPACT_MAX_WIDTH, which drives the matching runtime behavior.
  "max-[860px]:!grid-cols-[minmax(0,1fr)] max-[860px]:!grid-rows-[var(--op-workspace-toolbar-height)_minmax(0,1fr)]",
  "max-[860px]:![grid-template-areas:'toolbar'_'main']",
];
const WORKBENCH_SHELL_COLUMNS_CLASS = "grid-cols-[var(--op-workspace-left-width)_minmax(0,1fr)_var(--op-workspace-right-width)]";
const WORKBENCH_SHELL_FIXED_PANELS_CLASS = [
  "max-[860px]:!grid-cols-[var(--op-workspace-left-width)_minmax(0,1fr)_var(--op-workspace-right-width)]",
  "max-[860px]:![grid-template-areas:'toolbar_toolbar_toolbar'_'left_main_right']",
].join(" ");
const WORKBENCH_SHELL_FIXED_LEFT_ONLY_CLASS = [
  "max-[860px]:!grid-cols-[var(--op-workspace-left-width)_minmax(0,1fr)]",
  "max-[860px]:![grid-template-areas:'toolbar_toolbar'_'left_main']",
].join(" ");
const WORKBENCH_SHELL_FIXED_RIGHT_ONLY_CLASS = [
  "max-[860px]:!grid-cols-[minmax(0,1fr)_var(--op-workspace-right-width)]",
  "max-[860px]:![grid-template-areas:'toolbar_toolbar'_'main_right']",
].join(" ");
const WORKBENCH_SHELL_CLOSED_LEFT_CLASS = "grid-cols-[0_minmax(0,1fr)_var(--op-workspace-right-width)]";
const WORKBENCH_SHELL_CLOSED_RIGHT_CLASS = "grid-cols-[var(--op-workspace-left-width)_minmax(0,1fr)_0]";
const WORKBENCH_SHELL_CLOSED_BOTH_CLASS = "grid-cols-[0_minmax(0,1fr)_0]";
const WORKSPACE_PANEL_CLASS = [
  "op-workspace-panel min-h-0 min-w-0 self-stretch bg-[var(--op-workspace-panel-bg)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
].join(" ");
const LEFT_PANEL_CLASS = [
  "op-workspace-sidebar reader-side-nav op-workspace-public-navigation",
  WORKSPACE_PANEL_CLASS,
  "relative z-[2] ![grid-area:left] grid h-auto max-h-none grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden",
  "!border-l-0 border-r border-[var(--op-workspace-border-muted)] !p-0",
  "max-[860px]:!fixed max-[860px]:bottom-0 max-[860px]:left-0 max-[860px]:top-[var(--op-workspace-toolbar-height)]",
  "max-[860px]:z-40 max-[860px]:!grid max-[860px]:h-auto max-[860px]:w-[min(86vw,340px)] max-[860px]:min-w-0",
  "max-[860px]:transition-[left,opacity,visibility] max-[860px]:duration-[220ms,160ms,160ms] max-[860px]:ease-[cubic-bezier(0.22,0.61,0.36,1),ease,ease]",
  "max-[520px]:w-[min(90vw,340px)]",
].join(" ");
const RIGHT_PANEL_CLASS = [
  "op-workspace-inspector op-workspace-public-navigation",
  WORKSPACE_PANEL_CLASS,
  "relative [grid-area:right] grid h-auto max-h-none grid-rows-[minmax(0,1fr)] overflow-hidden border-l border-[var(--op-workspace-border-muted)]",
  "max-[860px]:!fixed max-[860px]:bottom-0 max-[860px]:right-0 max-[860px]:top-[var(--op-workspace-toolbar-height)]",
  "max-[860px]:z-40 max-[860px]:!grid max-[860px]:h-auto max-[860px]:w-[min(86vw,380px)] max-[860px]:min-w-0",
  "max-[860px]:transition-[right,opacity,visibility] max-[860px]:duration-[220ms,160ms,160ms] max-[860px]:ease-[cubic-bezier(0.22,0.61,0.36,1),ease,ease]",
  "max-[520px]:w-[min(90vw,380px)]",
].join(" ");
const PANEL_HIDDEN_CLASS = "pointer-events-none opacity-0";
const LEFT_PANEL_HIDDEN_CLASS = `${PANEL_HIDDEN_CLASS} max-[860px]:left-[calc(-1*min(86vw,340px))] max-[860px]:!opacity-0 max-[860px]:shadow-none max-[520px]:left-[calc(-1*min(90vw,340px))]`;
const RIGHT_PANEL_HIDDEN_CLASS = `${PANEL_HIDDEN_CLASS} max-[860px]:right-[calc(-1*min(86vw,380px))] max-[860px]:!opacity-0 max-[860px]:shadow-none max-[520px]:right-[calc(-1*min(90vw,380px))]`;
const LEFT_PANEL_FIXED_CLASS = [
  "max-[860px]:!relative max-[860px]:!bottom-auto max-[860px]:!left-auto max-[860px]:!top-auto",
  "max-[860px]:!z-[2] max-[860px]:!h-auto max-[860px]:!w-auto max-[860px]:!shadow-none",
  "max-[860px]:!transition-none",
].join(" ");
const LEFT_PANEL_RESIZE_HANDLE_CLASS = [
  "absolute inset-y-0 right-0 z-20 w-2 cursor-col-resize touch-none bg-transparent outline-none",
  "before:absolute before:inset-y-0 before:right-0 before:w-px before:bg-transparent",
  "hover:before:bg-[var(--op-workspace-accent-border)] focus-visible:before:bg-[var(--op-workspace-accent)]",
  "max-[860px]:hidden",
].join(" ");
const RIGHT_PANEL_FIXED_CLASS = [
  "max-[860px]:!relative max-[860px]:!bottom-auto max-[860px]:!right-auto max-[860px]:!top-auto",
  "max-[860px]:!z-[2] max-[860px]:!h-auto max-[860px]:!w-auto max-[860px]:!shadow-none",
  "max-[860px]:!transition-none",
].join(" ");
const MAIN_CONTENT_CLASS = [
  "op-workspace-main op-workspace-canvas op-canvas-frame op-workspace-main-content",
  "relative [grid-area:main] min-w-0 overflow-hidden bg-[var(--op-workspace-main-bg)] p-0 [container-type:inline-size] [scrollbar-width:none]",
  "overscroll-none [touch-action:pan-y_pinch-zoom] [&::-webkit-scrollbar]:hidden",
].join(" ");
const SCRIM_CLASS = "openpress-public-scrim hidden max-[860px]:fixed max-[860px]:inset-0 max-[860px]:z-[35] max-[860px]:block max-[860px]:bg-black/40 max-[860px]:backdrop-blur-[1px]";
const SHELL_LAYOUT_TRANSITION = {
  type: "spring",
  stiffness: 420,
  damping: 44,
  mass: 0.75,
} as const;

function useWorkbenchShell() {
  const value = useContext(WorkbenchShellContext);
  if (!value) throw new Error("WorkbenchShell compound components must be rendered inside <WorkbenchShell>.");
  return value;
}

function WorkbenchShellRoot({
  style,
  viewMode,
  pressType = "pages",
  colorMode = "dark",
  presentationMode = false,
  inspectorMode,
  editMode = false,
  leftPanelOpen,
  rightPanelOpen,
  onToggleLeftPanel,
  onToggleRightPanel,
  withRightPanel = true,
  showPanelToggles = true,
  showRightPanelToggle = true,
  fixedPanels = false,
  resizableLeftPanel = false,
  publicViewer = false,
  children,
}: {
  style: CSSProperties;
  viewMode: string;
  pressType?: string;
  colorMode?: WorkbenchShellColorMode;
  presentationMode?: boolean;
  inspectorMode: boolean;
  editMode?: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  // When false the toolbar omits the right-panel toggle button and the
  // shell grid runs without a right column.
  withRightPanel?: boolean;
  // Workbench owns panel visibility directly in the design-tool shell, so
  // toolbar toggles can be hidden while public readers keep their drawer
  // affordance.
  showPanelToggles?: boolean;
  // Some surfaces use a purpose-specific toolbar action to control the
  // right panel while retaining the Shell's left-panel toggle.
  showRightPanelToggle?: boolean;
  // Workbench uses a design-tool shell: left, canvas, and right stay
  // present at every viewport width. Public reading pages keep drawer
  // behavior by leaving this off.
  fixedPanels?: boolean;
  resizableLeftPanel?: boolean;
  // Marks the outer <main> with `data-openpress-public-viewer` so external
  // integrations can target the public reading surface without styling hooks.
  publicViewer?: boolean;
  children: ReactNode;
}) {
  const [leftPanelWidth, setLeftPanelWidthState] = useState<number | null>(() => (
    readLeftPanelWidth(browserStorage())
  ));
  const [compactLeftPanel, setCompactLeftPanel] = useState(() => isCompactLeftPanel());
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(max-width: 860px)");
    const update = (event: MediaQueryListEvent | MediaQueryList) => setCompactLeftPanel(event.matches);
    update(query);
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  const setLeftPanelWidth = useCallback((width: number) => {
    const clamped = Math.round(clampLeftPanelWidth(width));
    setLeftPanelWidthState(clamped);
    try {
      browserStorage()?.setItem(WORKBENCH_LEFT_PANEL_WIDTH_STORAGE_KEY, String(clamped));
    } catch {
      // Keep the in-memory width when browser storage is unavailable.
    }
  }, []);
  const resetLeftPanelWidth = useCallback(() => {
    setLeftPanelWidthState(null);
    try {
      browserStorage()?.removeItem(WORKBENCH_LEFT_PANEL_WIDTH_STORAGE_KEY);
    } catch {
      // Reset the in-memory width even when browser storage is unavailable.
    }
  }, []);
  const effectiveLeftOpen = leftPanelOpen;
  const effectiveRightOpen = withRightPanel ? rightPanelOpen : false;
  const effectiveFixedPanels = fixedPanels;
  const scrimOpen = !effectiveFixedPanels && (effectiveLeftOpen || effectiveRightOpen);
  const handleScrimClick = effectiveRightOpen ? onToggleRightPanel : onToggleLeftPanel;
  const shellClassName = [
    ...WORKBENCH_SHELL_BASE_CLASS,
    effectiveLeftOpen && effectiveRightOpen && !presentationMode ? WORKBENCH_SHELL_COLUMNS_CLASS : "",
    effectiveFixedPanels && effectiveLeftOpen && effectiveRightOpen && !presentationMode ? WORKBENCH_SHELL_FIXED_PANELS_CLASS : "",
    effectiveFixedPanels && effectiveLeftOpen && !effectiveRightOpen && !presentationMode ? WORKBENCH_SHELL_FIXED_LEFT_ONLY_CLASS : "",
    effectiveFixedPanels && !effectiveLeftOpen && effectiveRightOpen && !presentationMode ? WORKBENCH_SHELL_FIXED_RIGHT_ONLY_CLASS : "",
    !effectiveLeftOpen && effectiveRightOpen && !presentationMode ? WORKBENCH_SHELL_CLOSED_LEFT_CLASS : "",
    effectiveLeftOpen && !effectiveRightOpen && !presentationMode ? WORKBENCH_SHELL_CLOSED_RIGHT_CLASS : "",
    (!effectiveLeftOpen && !effectiveRightOpen) || presentationMode ? WORKBENCH_SHELL_CLOSED_BOTH_CLASS : "",
    effectiveLeftOpen ? "" : "is-closed-left",
    effectiveRightOpen ? "" : "is-closed-right",
    withRightPanel ? "" : "op-workspace-shell-no-right-panel",
    presentationMode ? "is-presentation-mode" : "",
  ].filter(Boolean).join(" ");
  const shellStyle = resizableLeftPanel && !compactLeftPanel && leftPanelWidth !== null
    ? { "--op-workspace-left-width": `${leftPanelWidth}px` } as CSSProperties
    : undefined;

  return (
    <WorkbenchShellContext.Provider
      value={{
        leftPanelOpen: effectiveLeftOpen,
        rightPanelOpen: effectiveRightOpen,
        presentationMode,
        onToggleLeftPanel,
        onToggleRightPanel,
        withRightPanel,
        showPanelToggles,
        showRightPanelToggle,
        fixedPanels: effectiveFixedPanels,
        resizableLeftPanel,
        compactLeftPanel,
        leftPanelWidth,
        setLeftPanelWidth,
        resetLeftPanelWidth,
      }}
    >
      <main
        className={WORKBENCH_ROOT_CLASS}
        style={workspaceLayoutStyle(style)}
        data-openpress-workspace-color-mode={colorMode}
        data-openpress-public-viewer={publicViewer ? "true" : undefined}
      >
        <motion.div
          layout
          transition={SHELL_LAYOUT_TRANSITION}
          style={shellStyle}
          className={shellClassName}
          data-openpress-react-runtime="true"
          data-openpress-view-mode={viewMode}
          data-openpress-press-type={pressType}
          data-openpress-presentation-mode={presentationMode ? "on" : "off"}
          data-openpress-inspector-mode={inspectorMode ? "on" : "off"}
          data-openpress-edit-mode={editMode ? "on" : "off"}
          data-openpress-color-mode={colorMode}
          data-openpress-workbench-shell
          data-testid="workbench-shell"
        >
          {scrimOpen ? (
            <div className={SCRIM_CLASS} aria-hidden="true" onClick={handleScrimClick} />
          ) : null}
          {children}
        </motion.div>
      </main>
    </WorkbenchShellContext.Provider>
  );
}

export function WorkbenchToolbar({ children }: { children: ReactNode }) {
  const {
    leftPanelOpen,
    rightPanelOpen,
    onToggleLeftPanel,
    onToggleRightPanel,
    withRightPanel,
    showPanelToggles,
    showRightPanelToggle,
  } = useWorkbenchShell();
  const LeftIcon = leftPanelOpen ? PanelLeftClose : PanelLeftOpen;
  const RightIcon = rightPanelOpen ? PanelRightClose : PanelRightOpen;
  const leftLabel = leftPanelOpen ? "收合左側面板" : "展開左側面板";
  const rightLabel = rightPanelOpen ? "收合右側面板" : "展開右側面板";

  return (
    <motion.header
      layout
      transition={SHELL_LAYOUT_TRANSITION}
      className={WORKBENCH_TOOLBAR_CLASS}
      role="toolbar"
      aria-label="工作台操作"
      data-openpress-workbench-toolbar
    >
      {showPanelToggles ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={TOOLBAR_PANEL_TOGGLE_CLASS}
          data-openpress-toggle-left-panel
          data-openpress-panel-open={leftPanelOpen ? "true" : "false"}
          aria-label={leftLabel}
          title={leftLabel}
          onClick={onToggleLeftPanel}
        >
          <LeftIcon aria-hidden="true" />
        </Button>
      ) : null}
      <div className={TOOLBAR_CONTENT_CLASS}>
        {children}
      </div>
      {withRightPanel && showPanelToggles && showRightPanelToggle ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={TOOLBAR_PANEL_TOGGLE_CLASS}
          data-openpress-toggle-right-panel
          data-openpress-panel-open={rightPanelOpen ? "true" : "false"}
          aria-label={rightLabel}
          title={rightLabel}
          onClick={onToggleRightPanel}
        >
          <RightIcon aria-hidden="true" />
        </Button>
      ) : null}
    </motion.header>
  );
}

function WorkbenchLeftPanel({ children }: { children: ReactNode }) {
  const {
    leftPanelOpen,
    presentationMode,
    fixedPanels,
    resizableLeftPanel,
    compactLeftPanel,
  } = useWorkbenchShell();
  const visible = leftPanelOpen && !presentationMode;

  return (
    <motion.aside
      layout
      initial={false}
      animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : -14 }}
      transition={SHELL_LAYOUT_TRANSITION}
      className={[
        LEFT_PANEL_CLASS,
        fixedPanels && visible ? LEFT_PANEL_FIXED_CLASS : "",
        visible ? "" : LEFT_PANEL_HIDDEN_CLASS,
      ].filter(Boolean).join(" ")}
      aria-label="文件導覽"
      aria-hidden={visible ? undefined : true}
      data-openpress-panel-visible={visible ? "true" : "false"}
      data-openpress-left-panel
    >
      {children}
      {resizableLeftPanel && !compactLeftPanel ? <LeftPanelResizeHandle /> : null}
    </motion.aside>
  );
}

function LeftPanelResizeHandle() {
  const {
    leftPanelWidth,
    setLeftPanelWidth,
    resetLeftPanelWidth,
  } = useWorkbenchShell();
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startWidth: number;
    previousUserSelect: string;
  } | null>(null);
  const defaultWidth = defaultLeftPanelWidth();
  const currentWidth = leftPanelWidth ?? defaultWidth;

  const finishDrag = (target?: HTMLElement, pointerId?: number) => {
    const drag = dragRef.current;
    if (!drag) return;
    document.body.style.userSelect = drag.previousUserSelect;
    if (target && pointerId !== undefined && target.hasPointerCapture?.(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
    dragRef.current = null;
  };

  useEffect(() => () => finishDrag(), []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const panel = event.currentTarget.parentElement;
    if (!panel) return;
    event.preventDefault();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: panel.getBoundingClientRect().width,
      previousUserSelect: document.body.style.userSelect,
    };
    document.body.style.userSelect = "none";
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setLeftPanelWidth(drag.startWidth + event.clientX - drag.startX);
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    finishDrag(event.currentTarget, event.pointerId);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const narrower = matchesHotkey("panel-resize.narrower", event);
    const wider = matchesHotkey("panel-resize.wider", event);
    if (!narrower && !wider) return;
    event.preventDefault();
    event.stopPropagation();
    const step = event.shiftKey ? 24 : 8;
    setLeftPanelWidth(currentWidth + (wider ? step : -step));
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label="調整書籤寬度"
      aria-orientation="vertical"
      aria-valuemin={MIN_LEFT_PANEL_WIDTH}
      aria-valuemax={MAX_LEFT_PANEL_WIDTH}
      aria-valuenow={Math.round(currentWidth)}
      className={LEFT_PANEL_RESIZE_HANDLE_CLASS}
      data-openpress-left-panel-resize
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={handleKeyDown}
      onDoubleClick={resetLeftPanelWidth}
    />
  );
}

function WorkbenchRightPanel({
  children,
  "aria-label": ariaLabel = "控制面板",
}: {
  children: ReactNode;
  "aria-label"?: string;
}) {
  const { rightPanelOpen, presentationMode, fixedPanels } = useWorkbenchShell();
  const visible = rightPanelOpen && !presentationMode;

  return (
    <motion.aside
      layout
      initial={false}
      animate={{ opacity: visible ? 1 : 0, x: fixedPanels ? 0 : visible ? 0 : 14 }}
      transition={SHELL_LAYOUT_TRANSITION}
      className={[
        RIGHT_PANEL_CLASS,
        fixedPanels ? RIGHT_PANEL_FIXED_CLASS : "",
        visible ? "" : RIGHT_PANEL_HIDDEN_CLASS,
      ].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
      aria-hidden={visible ? undefined : true}
      data-openpress-panel-visible={visible ? "true" : "false"}
      data-openpress-right-panel
    >
      {children}
    </motion.aside>
  );
}

function WorkbenchMainContent({ children }: { children: ReactNode }) {
  return (
    <motion.section
      layout
      transition={SHELL_LAYOUT_TRANSITION}
      className={MAIN_CONTENT_CLASS}
      aria-label="主要內容"
      data-openpress-main-content
    >
      {children}
    </motion.section>
  );
}

export const WorkbenchShell = Object.assign(WorkbenchShellRoot, {
  Toolbar: WorkbenchToolbar,
  LeftPanel: WorkbenchLeftPanel,
  RightPanel: WorkbenchRightPanel,
  ControlPanel: WorkbenchRightPanel,
  MainContent: WorkbenchMainContent,
});

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isCompactLeftPanel() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(max-width: 860px)").matches;
}

function defaultLeftPanelWidth() {
  if (typeof window === "undefined") return 340;
  return Math.min(390, Math.max(304, window.innerWidth * 0.22));
}
