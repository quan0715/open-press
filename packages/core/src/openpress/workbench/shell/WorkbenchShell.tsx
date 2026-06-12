import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, X } from "lucide-react";
import {
  TOOLBAR_CONTENT_CLASS,
  TOOLBAR_PANEL_TOGGLE_CLASS,
  WORKBENCH_TOOLBAR_CLASS,
} from "../toolbarClasses";

type WorkbenchShellContextValue = {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  presentationMode: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  withRightPanel: boolean;
};

const WorkbenchShellContext = createContext<WorkbenchShellContextValue | null>(null);
const WORKBENCH_ROOT_CLASS = "openpress-workbench block min-h-screen bg-[var(--openpress-workbench-bg)] text-[var(--openpress-text)]";
const WORKBENCH_SHELL_BASE_CLASS = [
  "reader-app openpress-reader-app openpress-public-viewer openpress-dev-public-viewer openpress-workbench-shell is-ready",
  "[--openpress-workbench-toolbar-height:44px] [--openpress-workbench-panel-width:clamp(304px,22vw,390px)]",
  "[--openpress-workbench-left-width:var(--openpress-workbench-panel-width)] [--openpress-workbench-right-width:var(--openpress-workbench-panel-width)]",
  "[--openpress-public-nav-min-width:340px] [--openpress-public-nav-max-width:420px] [--openpress-public-nav-max-height:960px]",
  "relative grid h-dvh min-h-dvh w-full overflow-hidden bg-[#141414] grid-rows-[var(--openpress-workbench-toolbar-height)_minmax(0,1fr)]",
  "[grid-template-areas:'toolbar_toolbar_toolbar'_'left_main_right']",
  "max-[1439px]:!grid-cols-[minmax(0,1fr)] max-[1439px]:!grid-rows-[var(--openpress-workbench-toolbar-height)_minmax(0,1fr)]",
  "max-[1439px]:![grid-template-areas:'toolbar'_'main']",
];
const WORKBENCH_SHELL_COLUMNS_CLASS = "grid-cols-[var(--openpress-workbench-left-width)_minmax(0,1fr)_var(--openpress-workbench-right-width)]";
const WORKBENCH_SHELL_CLOSED_LEFT_CLASS = "grid-cols-[0_minmax(0,1fr)_var(--openpress-workbench-right-width)]";
const WORKBENCH_SHELL_CLOSED_RIGHT_CLASS = "grid-cols-[var(--openpress-workbench-left-width)_minmax(0,1fr)_0]";
const WORKBENCH_SHELL_CLOSED_BOTH_CLASS = "grid-cols-[0_minmax(0,1fr)_0]";
const WORKSPACE_PANEL_CLASS = [
  "openpress-workspace-panel min-h-0 min-w-0 self-stretch bg-[#171717] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
].join(" ");
const LEFT_PANEL_CLASS = [
  "reader-side-nav openpress-workbench-left-panel openpress-public-navigation",
  WORKSPACE_PANEL_CLASS,
  "relative z-[2] ![grid-area:left] grid h-auto max-h-none grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden",
  "!border-l-0 border-r border-[var(--openpress-workbench-border-muted)] !p-0",
  "max-[1439px]:!fixed max-[1439px]:bottom-0 max-[1439px]:left-0 max-[1439px]:top-[var(--openpress-workbench-toolbar-height)]",
  "max-[1439px]:z-40 max-[1439px]:!grid max-[1439px]:h-auto max-[1439px]:w-[min(86vw,340px)] max-[1439px]:min-w-0",
  "max-[1439px]:shadow-[16px_0_34px_rgb(0_0_0_/_0.36)]",
  "max-[1439px]:transition-[left,opacity,visibility] max-[1439px]:duration-[220ms,160ms,160ms] max-[1439px]:ease-[cubic-bezier(0.22,0.61,0.36,1),ease,ease]",
  "max-[520px]:w-[min(90vw,340px)]",
].join(" ");
const RIGHT_PANEL_CLASS = [
  "openpress-workbench-right-panel openpress-dev-public-navigation",
  WORKSPACE_PANEL_CLASS,
  "relative [grid-area:right] grid h-auto max-h-none grid-rows-[minmax(0,1fr)] overflow-hidden border-l border-[var(--openpress-workbench-border-muted)]",
  "max-[1439px]:!fixed max-[1439px]:bottom-0 max-[1439px]:right-0 max-[1439px]:top-[var(--openpress-workbench-toolbar-height)]",
  "max-[1439px]:z-40 max-[1439px]:!grid max-[1439px]:h-auto max-[1439px]:w-[min(86vw,380px)] max-[1439px]:min-w-0",
  "max-[1439px]:shadow-[-16px_0_34px_rgb(0_0_0_/_0.36)]",
  "max-[1439px]:transition-[right,opacity,visibility] max-[1439px]:duration-[220ms,160ms,160ms] max-[1439px]:ease-[cubic-bezier(0.22,0.61,0.36,1),ease,ease]",
  "max-[520px]:w-[min(90vw,380px)]",
].join(" ");
const PANEL_HIDDEN_CLASS = "pointer-events-none invisible opacity-0";
const LEFT_PANEL_HIDDEN_CLASS = `${PANEL_HIDDEN_CLASS} max-[1439px]:left-[calc(-1*min(86vw,340px))] max-[1439px]:!opacity-0 max-[1439px]:invisible max-[1439px]:shadow-none max-[520px]:left-[calc(-1*min(90vw,340px))]`;
const RIGHT_PANEL_HIDDEN_CLASS = `${PANEL_HIDDEN_CLASS} max-[1439px]:right-[calc(-1*min(86vw,380px))] max-[1439px]:!opacity-0 max-[1439px]:invisible max-[1439px]:shadow-none max-[520px]:right-[calc(-1*min(90vw,380px))]`;
const DRAWER_CLOSE_CLASS = "openpress-public-drawer-close absolute right-3 top-3 z-[3] hidden max-[1439px]:flex";
const MAIN_CONTENT_CLASS = [
  "openpress-workbench__stage openpress-workbench-main openpress-public-viewer__stage openpress-dev-main-content",
  "[grid-area:main] min-w-0 overflow-hidden bg-[var(--openpress-workbench-bg)] p-0 [container-type:inline-size] [scrollbar-width:none]",
  "overscroll-none [touch-action:pan-y_pinch-zoom] [&::-webkit-scrollbar]:hidden",
].join(" ");
const SCRIM_CLASS = "openpress-public-scrim hidden max-[1439px]:fixed max-[1439px]:inset-0 max-[1439px]:z-[35] max-[1439px]:block max-[1439px]:bg-black/40 max-[1439px]:backdrop-blur-[1px]";

function useWorkbenchShell() {
  const value = useContext(WorkbenchShellContext);
  if (!value) throw new Error("WorkbenchShell compound components must be rendered inside <WorkbenchShell>.");
  return value;
}

function WorkbenchShellRoot({
  style,
  viewMode,
  pressType = "pages",
  presentationMode = false,
  inspectorMode,
  editMode = false,
  leftPanelOpen,
  rightPanelOpen,
  onToggleLeftPanel,
  onToggleRightPanel,
  withRightPanel = true,
  publicViewer = false,
  children,
}: {
  style: CSSProperties;
  viewMode: string;
  pressType?: string;
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
  // Marks the outer <main> with `data-openpress-public-viewer` so CSS
  // and external integrations can target the public reading surface.
  publicViewer?: boolean;
  children: ReactNode;
}) {
  const effectiveRightOpen = withRightPanel ? rightPanelOpen : false;
  const scrimOpen = leftPanelOpen || effectiveRightOpen;
  const handleScrimClick = effectiveRightOpen ? onToggleRightPanel : onToggleLeftPanel;
  const shellClassName = [
    ...WORKBENCH_SHELL_BASE_CLASS,
    leftPanelOpen && effectiveRightOpen && !presentationMode ? WORKBENCH_SHELL_COLUMNS_CLASS : "",
    !leftPanelOpen && effectiveRightOpen && !presentationMode ? WORKBENCH_SHELL_CLOSED_LEFT_CLASS : "",
    leftPanelOpen && !effectiveRightOpen && !presentationMode ? WORKBENCH_SHELL_CLOSED_RIGHT_CLASS : "",
    (!leftPanelOpen && !effectiveRightOpen) || presentationMode ? WORKBENCH_SHELL_CLOSED_BOTH_CLASS : "",
    leftPanelOpen ? "" : "is-closed-left",
    effectiveRightOpen ? "" : "is-closed-right",
    withRightPanel ? "" : "openpress-workbench-shell--no-right-panel",
    presentationMode ? "is-presentation-mode" : "",
  ].filter(Boolean).join(" ");

  return (
    <WorkbenchShellContext.Provider
      value={{
        leftPanelOpen,
        rightPanelOpen: effectiveRightOpen,
        presentationMode,
        onToggleLeftPanel,
        onToggleRightPanel,
        withRightPanel,
      }}
    >
      <main
        className={WORKBENCH_ROOT_CLASS}
        style={style}
        data-openpress-public-viewer={publicViewer ? "true" : undefined}
      >
        <div
          className={shellClassName}
          data-openpress-react-runtime="true"
          data-openpress-view-mode={viewMode}
          data-openpress-press-type={pressType}
          data-openpress-presentation-mode={presentationMode ? "on" : "off"}
          data-openpress-inspector-mode={inspectorMode ? "on" : "off"}
          data-openpress-edit-mode={editMode ? "on" : "off"}
          data-openpress-workbench-shell
          data-testid="workbench-shell"
        >
          {scrimOpen ? (
            <div className={SCRIM_CLASS} aria-hidden="true" onClick={handleScrimClick} />
          ) : null}
          {children}
        </div>
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
  } = useWorkbenchShell();
  const LeftIcon = leftPanelOpen ? PanelLeftClose : PanelLeftOpen;
  const RightIcon = rightPanelOpen ? PanelRightClose : PanelRightOpen;
  const leftLabel = leftPanelOpen ? "收合左側面板" : "展開左側面板";
  const rightLabel = rightPanelOpen ? "收合右側面板" : "展開右側面板";

  return (
    <header
      className={WORKBENCH_TOOLBAR_CLASS}
      role="toolbar"
      aria-label="工作台操作"
      data-openpress-workbench-toolbar
    >
      <button
        type="button"
        className={TOOLBAR_PANEL_TOGGLE_CLASS}
        data-openpress-toggle-left-panel
        data-openpress-panel-open={leftPanelOpen ? "true" : "false"}
        aria-label={leftLabel}
        title={leftLabel}
        onClick={onToggleLeftPanel}
      >
        <LeftIcon aria-hidden="true" />
      </button>
      <div className={TOOLBAR_CONTENT_CLASS}>
        {children}
      </div>
      {withRightPanel ? (
        <button
          type="button"
          className={TOOLBAR_PANEL_TOGGLE_CLASS}
          data-openpress-toggle-right-panel
          data-openpress-panel-open={rightPanelOpen ? "true" : "false"}
          aria-label={rightLabel}
          title={rightLabel}
          onClick={onToggleRightPanel}
        >
          <RightIcon aria-hidden="true" />
        </button>
      ) : null}
    </header>
  );
}

function WorkbenchLeftPanel({ children }: { children: ReactNode }) {
  const { leftPanelOpen, presentationMode } = useWorkbenchShell();

  return (
    <aside
      className={[LEFT_PANEL_CLASS, (!leftPanelOpen || presentationMode) ? LEFT_PANEL_HIDDEN_CLASS : ""].filter(Boolean).join(" ")}
      aria-label="文件導覽"
      data-openpress-left-panel
    >
      {children}
    </aside>
  );
}

function WorkbenchRightPanel({ children }: { children: ReactNode }) {
  const { rightPanelOpen, presentationMode, onToggleRightPanel } = useWorkbenchShell();

  return (
    <aside
      className={[RIGHT_PANEL_CLASS, (!rightPanelOpen || presentationMode) ? RIGHT_PANEL_HIDDEN_CLASS : ""].filter(Boolean).join(" ")}
      aria-label="控制面板"
      data-openpress-right-panel
    >
      <button type="button" className={DRAWER_CLOSE_CLASS} aria-label="關閉右側面板" onClick={onToggleRightPanel}>
        <X size={16} aria-hidden="true" />
      </button>
      {children}
    </aside>
  );
}

function WorkbenchMainContent({ children }: { children: ReactNode }) {
  return (
    <section
      className={MAIN_CONTENT_CLASS}
      aria-label="主要內容"
      data-openpress-main-content
    >
      {children}
    </section>
  );
}

export const WorkbenchShell = Object.assign(WorkbenchShellRoot, {
  Toolbar: WorkbenchToolbar,
  LeftPanel: WorkbenchLeftPanel,
  RightPanel: WorkbenchRightPanel,
  ControlPanel: WorkbenchRightPanel,
  MainContent: WorkbenchMainContent,
});
