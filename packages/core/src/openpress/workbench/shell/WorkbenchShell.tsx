import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, X } from "lucide-react";

type WorkbenchShellContextValue = {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  withRightPanel: boolean;
};

const WorkbenchShellContext = createContext<WorkbenchShellContextValue | null>(null);

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
    "reader-app openpress-reader-app openpress-public-viewer openpress-dev-public-viewer openpress-workbench-shell is-ready",
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
        onToggleLeftPanel,
        onToggleRightPanel,
        withRightPanel,
      }}
    >
      <main
        className="openpress-workbench"
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
            <div className="openpress-public-scrim" aria-hidden="true" onClick={handleScrimClick} />
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
      className="openpress-workbench-toolbar"
      role="toolbar"
      aria-label="工作台操作"
      data-openpress-workbench-toolbar
    >
      <button
        type="button"
        className="openpress-workbench-toolbar-panel-toggle"
        data-openpress-toggle-left-panel
        data-openpress-panel-open={leftPanelOpen ? "true" : "false"}
        aria-label={leftLabel}
        title={leftLabel}
        onClick={onToggleLeftPanel}
      >
        <LeftIcon aria-hidden="true" />
      </button>
      <div className="openpress-workbench-toolbar__content">
        {children}
      </div>
      {withRightPanel ? (
        <button
          type="button"
          className="openpress-workbench-toolbar-panel-toggle"
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
  return (
    <aside
      className="reader-side-nav openpress-workspace-panel openpress-workbench-left-panel openpress-public-navigation"
      aria-label="文件導覽"
      data-openpress-left-panel
    >
      {children}
    </aside>
  );
}

function WorkbenchRightPanel({ children }: { children: ReactNode }) {
  const { onToggleRightPanel } = useWorkbenchShell();

  return (
    <aside
      className="openpress-workspace-panel openpress-workbench-right-panel openpress-dev-public-navigation"
      aria-label="控制面板"
      data-openpress-right-panel
    >
      <button type="button" className="openpress-public-drawer-close" aria-label="關閉右側面板" onClick={onToggleRightPanel}>
        <X size={16} aria-hidden="true" />
      </button>
      {children}
    </aside>
  );
}

function WorkbenchMainContent({ children }: { children: ReactNode }) {
  return (
    <section
      className="openpress-workbench__stage openpress-workbench-main openpress-public-viewer__stage openpress-dev-main-content"
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
