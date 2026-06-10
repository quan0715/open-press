import { Fragment, type ReactNode } from "react";

// A WorkbenchPanel is a self-contained renderable slot in the workbench
// control surface. Each panel owns its own props by capturing them in render;
// the host (HtmlWorkbench) supplies the list and decides ordering.
export interface WorkbenchPanel {
  id: string;
  render: () => ReactNode;
}

export interface WorkbenchControlPanelProps {
  panels: WorkbenchPanel[];
  className?: string;
  ariaLabel?: string;
}

const WORKBENCH_CONTROL_PANEL_CLASS = [
  "openpress-control-panel grid min-h-0 content-start gap-[22px] overflow-auto px-[22px] py-[18px]",
  "[grid-auto-rows:max-content] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
].join(" ");

export function WorkbenchControlPanel({
  panels,
  className = WORKBENCH_CONTROL_PANEL_CLASS,
  ariaLabel = "控制面板",
}: WorkbenchControlPanelProps) {
  return (
    <div className={className} data-openpress-control-panel aria-label={ariaLabel}>
      {panels.map((panel) => (
        <Fragment key={panel.id}>{panel.render()}</Fragment>
      ))}
    </div>
  );
}
