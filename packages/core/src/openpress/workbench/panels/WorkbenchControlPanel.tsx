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

export function WorkbenchControlPanel({
  panels,
  className = "openpress-control-panel",
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
