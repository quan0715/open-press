import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, X } from "lucide-react";
import {
  TOOLBAR_CONTENT_CLASS,
  TOOLBAR_PANEL_TOGGLE_CLASS,
  WORKBENCH_TOOLBAR_CLASS,
} from "../toolbarClasses";
import { Button } from "@/openpress/ui/button";

type WorkbenchShellContextValue = {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  presentationMode: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  withRightPanel: boolean;
  showPanelToggles: boolean;
  fixedPanels: boolean;
  hideUiMode: boolean;
};
type WorkbenchShellColorMode = "dark" | "light";

const WorkbenchShellContext = createContext<WorkbenchShellContextValue | null>(null);
const WORKBENCH_ROOT_CLASS = "op-workspace block min-h-screen bg-[var(--op-workspace-bg)] text-[var(--op-workspace-text)]";
const WORKBENCH_SHELL_BASE_CLASS = [
  "op-workspace-shell reader-app openpress-reader-app op-workspace-public-viewer is-ready",
  "[--op-workspace-toolbar-height:44px] [--op-workspace-panel-width:clamp(304px,22vw,390px)]",
  "[--op-workspace-left-width:var(--op-workspace-panel-width)] [--op-workspace-right-width:var(--op-workspace-panel-width)]",
  "[--openpress-public-nav-min-width:340px] [--openpress-public-nav-max-width:420px] [--openpress-public-nav-max-height:960px]",
  "relative grid h-dvh min-h-dvh w-full overflow-hidden bg-[var(--op-workspace-bg)] grid-rows-[var(--op-workspace-toolbar-height)_minmax(0,1fr)]",
  "[grid-template-areas:'toolbar_toolbar_toolbar'_'left_main_right']",
  "max-[1439px]:!grid-cols-[minmax(0,1fr)] max-[1439px]:!grid-rows-[var(--op-workspace-toolbar-height)_minmax(0,1fr)]",
  "max-[1439px]:![grid-template-areas:'toolbar'_'main']",
];
const WORKBENCH_SHELL_COLUMNS_CLASS = "grid-cols-[var(--op-workspace-left-width)_minmax(0,1fr)_var(--op-workspace-right-width)]";
const WORKBENCH_SHELL_FIXED_PANELS_CLASS = [
  "max-[1439px]:!grid-cols-[var(--op-workspace-left-width)_minmax(0,1fr)_var(--op-workspace-right-width)]",
  "max-[1439px]:![grid-template-areas:'toolbar_toolbar_toolbar'_'left_main_right']",
].join(" ");
const WORKBENCH_SHELL_CLOSED_LEFT_CLASS = "grid-cols-[0_minmax(0,1fr)_var(--op-workspace-right-width)]";
const WORKBENCH_SHELL_CLOSED_RIGHT_CLASS = "grid-cols-[var(--op-workspace-left-width)_minmax(0,1fr)_0]";
const WORKBENCH_SHELL_CLOSED_BOTH_CLASS = "grid-cols-[0_minmax(0,1fr)_0]";
const WORKBENCH_SHELL_HIDE_UI_CLASS = "is-hide-ui-mode";
const WORKSPACE_PANEL_CLASS = [
  "op-workspace-panel min-h-0 min-w-0 self-stretch bg-[var(--op-workspace-panel-bg)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
].join(" ");
const LEFT_PANEL_CLASS = [
  "op-workspace-sidebar reader-side-nav op-workspace-public-navigation",
  WORKSPACE_PANEL_CLASS,
  "relative z-[2] ![grid-area:left] grid h-auto max-h-none grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden",
  "!border-l-0 border-r border-[var(--op-workspace-border-muted)] !p-0",
  "max-[1439px]:!fixed max-[1439px]:bottom-0 max-[1439px]:left-0 max-[1439px]:top-[var(--op-workspace-toolbar-height)]",
  "max-[1439px]:z-40 max-[1439px]:!grid max-[1439px]:h-auto max-[1439px]:w-[min(86vw,340px)] max-[1439px]:min-w-0",
  "max-[1439px]:shadow-[16px_0_34px_rgb(0_0_0_/_0.36)]",
  "max-[1439px]:transition-[left,opacity,visibility] max-[1439px]:duration-[220ms,160ms,160ms] max-[1439px]:ease-[cubic-bezier(0.22,0.61,0.36,1),ease,ease]",
  "max-[520px]:w-[min(90vw,340px)]",
].join(" ");
const RIGHT_PANEL_CLASS = [
  "op-workspace-inspector op-workspace-public-navigation",
  WORKSPACE_PANEL_CLASS,
  "relative [grid-area:right] grid h-auto max-h-none grid-rows-[minmax(0,1fr)] overflow-hidden border-l border-[var(--op-workspace-border-muted)]",
  "max-[1439px]:!fixed max-[1439px]:bottom-0 max-[1439px]:right-0 max-[1439px]:top-[var(--op-workspace-toolbar-height)]",
  "max-[1439px]:z-40 max-[1439px]:!grid max-[1439px]:h-auto max-[1439px]:w-[min(86vw,380px)] max-[1439px]:min-w-0",
  "max-[1439px]:shadow-[-16px_0_34px_rgb(0_0_0_/_0.36)]",
  "max-[1439px]:transition-[right,opacity,visibility] max-[1439px]:duration-[220ms,160ms,160ms] max-[1439px]:ease-[cubic-bezier(0.22,0.61,0.36,1),ease,ease]",
  "max-[520px]:w-[min(90vw,380px)]",
].join(" ");
const PANEL_HIDDEN_CLASS = "pointer-events-none opacity-0";
const LEFT_PANEL_HIDDEN_CLASS = `${PANEL_HIDDEN_CLASS} max-[1439px]:left-[calc(-1*min(86vw,340px))] max-[1439px]:!opacity-0 max-[1439px]:shadow-none max-[520px]:left-[calc(-1*min(90vw,340px))]`;
const RIGHT_PANEL_HIDDEN_CLASS = `${PANEL_HIDDEN_CLASS} max-[1439px]:right-[calc(-1*min(86vw,380px))] max-[1439px]:!opacity-0 max-[1439px]:shadow-none max-[520px]:right-[calc(-1*min(90vw,380px))]`;
const DRAWER_CLOSE_CLASS = "openpress-public-drawer-close absolute right-3 top-3 z-[3] hidden max-[1439px]:flex";
const DRAWER_CLOSE_FIXED_CLASS = "max-[1439px]:!hidden";
const LEFT_PANEL_FIXED_CLASS = [
  "max-[1439px]:!relative max-[1439px]:!bottom-auto max-[1439px]:!left-auto max-[1439px]:!top-auto",
  "max-[1439px]:!z-[2] max-[1439px]:!h-auto max-[1439px]:!w-auto max-[1439px]:!shadow-none",
  "max-[1439px]:!transition-none",
].join(" ");
const RIGHT_PANEL_FIXED_CLASS = [
  "max-[1439px]:!relative max-[1439px]:!bottom-auto max-[1439px]:!right-auto max-[1439px]:!top-auto",
  "max-[1439px]:!z-[2] max-[1439px]:!h-auto max-[1439px]:!w-auto max-[1439px]:!shadow-none",
  "max-[1439px]:!transition-none",
].join(" ");
const MAIN_CONTENT_CLASS = [
  "op-workspace-main op-workspace-canvas op-canvas-frame op-workspace-main-content",
  "[grid-area:main] min-w-0 overflow-hidden bg-[var(--op-workspace-main-bg)] p-0 [container-type:inline-size] [scrollbar-width:none]",
  "overscroll-none [touch-action:pan-y_pinch-zoom] [&::-webkit-scrollbar]:hidden",
].join(" ");
const SCRIM_CLASS = "openpress-public-scrim hidden max-[1439px]:fixed max-[1439px]:inset-0 max-[1439px]:z-[35] max-[1439px]:block max-[1439px]:bg-black/40 max-[1439px]:backdrop-blur-[1px]";
const TOOLBAR_HIDE_UI_CLASS = "is-hide-ui-toolbar";
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
  fixedPanels = false,
  publicViewer = false,
  hideUiMode = false,
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
  // shell grid runs without a right column. Used by the public viewer
  // where the right panel currently has no content (comments + project
  // entry are workbench-only).
  withRightPanel?: boolean;
  // Workbench owns panel visibility directly in the design-tool shell, so
  // toolbar toggles can be hidden while public readers keep their drawer
  // affordance.
  showPanelToggles?: boolean;
  // Workbench uses a design-tool shell: left, canvas, and right stay
  // present at every viewport width. Public reading pages keep drawer
  // behavior by leaving this off.
  fixedPanels?: boolean;
  hideUiMode?: boolean;
  // Marks the outer <main> with `data-openpress-public-viewer` so external
  // integrations can target the public reading surface without styling hooks.
  publicViewer?: boolean;
  children: ReactNode;
}) {
  const effectiveLeftOpen = hideUiMode ? false : leftPanelOpen;
  const effectiveRightOpen = hideUiMode ? false : withRightPanel ? rightPanelOpen : false;
  const effectiveFixedPanels = hideUiMode ? false : fixedPanels;
  const scrimOpen = !effectiveFixedPanels && (effectiveLeftOpen || effectiveRightOpen);
  const handleScrimClick = effectiveRightOpen ? onToggleRightPanel : onToggleLeftPanel;
  const shellClassName = [
    ...WORKBENCH_SHELL_BASE_CLASS,
    effectiveLeftOpen && effectiveRightOpen && !presentationMode ? WORKBENCH_SHELL_COLUMNS_CLASS : "",
    effectiveFixedPanels && effectiveLeftOpen && effectiveRightOpen && !presentationMode ? WORKBENCH_SHELL_FIXED_PANELS_CLASS : "",
    !effectiveLeftOpen && effectiveRightOpen && !presentationMode ? WORKBENCH_SHELL_CLOSED_LEFT_CLASS : "",
    effectiveLeftOpen && !effectiveRightOpen && !presentationMode ? WORKBENCH_SHELL_CLOSED_RIGHT_CLASS : "",
    (!effectiveLeftOpen && !effectiveRightOpen) || presentationMode ? WORKBENCH_SHELL_CLOSED_BOTH_CLASS : "",
    hideUiMode ? WORKBENCH_SHELL_HIDE_UI_CLASS : "",
    effectiveLeftOpen ? "" : "is-closed-left",
    effectiveRightOpen ? "" : "is-closed-right",
    withRightPanel ? "" : "op-workspace-shell-no-right-panel",
    presentationMode ? "is-presentation-mode" : "",
  ].filter(Boolean).join(" ");

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
        fixedPanels: effectiveFixedPanels,
        hideUiMode,
      }}
    >
      <main
        className={WORKBENCH_ROOT_CLASS}
        style={style}
        data-openpress-workspace-color-mode={colorMode}
        data-openpress-public-viewer={publicViewer ? "true" : undefined}
      >
        <motion.div
          layout
          transition={SHELL_LAYOUT_TRANSITION}
          className={shellClassName}
          data-openpress-react-runtime="true"
          data-openpress-view-mode={viewMode}
          data-openpress-press-type={pressType}
          data-openpress-presentation-mode={presentationMode ? "on" : "off"}
          data-openpress-inspector-mode={inspectorMode ? "on" : "off"}
          data-openpress-edit-mode={editMode ? "on" : "off"}
          data-openpress-color-mode={colorMode}
          data-openpress-hide-ui-mode={hideUiMode ? "on" : "off"}
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
    hideUiMode,
  } = useWorkbenchShell();
  const LeftIcon = leftPanelOpen ? PanelLeftClose : PanelLeftOpen;
  const RightIcon = rightPanelOpen ? PanelRightClose : PanelRightOpen;
  const leftLabel = leftPanelOpen ? "收合左側面板" : "展開左側面板";
  const rightLabel = rightPanelOpen ? "收合右側面板" : "展開右側面板";

  return (
    <motion.header
      layout
      transition={SHELL_LAYOUT_TRANSITION}
      className={[WORKBENCH_TOOLBAR_CLASS, hideUiMode ? TOOLBAR_HIDE_UI_CLASS : ""].filter(Boolean).join(" ")}
      role="toolbar"
      aria-label="工作台操作"
      data-openpress-hide-ui-mode={hideUiMode ? "on" : "off"}
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
      {withRightPanel && showPanelToggles ? (
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
  const { leftPanelOpen, presentationMode, fixedPanels } = useWorkbenchShell();
  const visible = leftPanelOpen && !presentationMode;

  return (
    <motion.aside
      layout
      initial={false}
      animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : -14 }}
      transition={SHELL_LAYOUT_TRANSITION}
      className={[
        LEFT_PANEL_CLASS,
        fixedPanels ? LEFT_PANEL_FIXED_CLASS : "",
        visible ? "" : LEFT_PANEL_HIDDEN_CLASS,
      ].filter(Boolean).join(" ")}
      aria-label="文件導覽"
      aria-hidden={visible ? undefined : true}
      data-openpress-panel-visible={visible ? "true" : "false"}
      data-openpress-left-panel
    >
      {children}
    </motion.aside>
  );
}

function WorkbenchRightPanel({ children }: { children: ReactNode }) {
  const { rightPanelOpen, presentationMode, onToggleRightPanel, fixedPanels } = useWorkbenchShell();
  const visible = rightPanelOpen && !presentationMode;

  return (
    <motion.aside
      layout
      initial={false}
      animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : 14 }}
      transition={SHELL_LAYOUT_TRANSITION}
      className={[
        RIGHT_PANEL_CLASS,
        fixedPanels ? RIGHT_PANEL_FIXED_CLASS : "",
        visible ? "" : RIGHT_PANEL_HIDDEN_CLASS,
      ].filter(Boolean).join(" ")}
      aria-label="控制面板"
      aria-hidden={visible ? undefined : true}
      data-openpress-panel-visible={visible ? "true" : "false"}
      data-openpress-right-panel
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={[DRAWER_CLOSE_CLASS, fixedPanels ? DRAWER_CLOSE_FIXED_CLASS : ""].filter(Boolean).join(" ")}
        aria-label="關閉右側面板"
        onClick={onToggleRightPanel}
      >
        <X size={16} aria-hidden="true" />
      </Button>
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
