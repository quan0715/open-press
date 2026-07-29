import { useEffect, useRef, useState } from "react";
import { Eye, FileText, MoreHorizontal, Rocket, Settings, SlidersHorizontal } from "lucide-react";
import type { DeploymentInfo } from "../../document-model";
import type { WorkbenchPanel } from "../panels";
import { WorkbenchToolsDrawer } from "../panels";
import type { DeployStatus } from "../workbenchTypes";
import { TOOLBAR_ACTION_CLASS, TOOLBAR_ACTION_LABEL_CLASS } from "../toolbarClasses";
import { Button } from "@/openpress/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/openpress/ui/dropdown-menu";
import { DeploymentDialog } from "./DeploymentControl";

const OVERFLOW_MENU_CLASS = [
  "op-ui-menu w-[210px] rounded-[10px] border border-[var(--op-workspace-border)]",
  "bg-[var(--op-workspace-surface-raised)] p-1.5",
].join(" ");

interface WorkbenchOverflowControlProps {
  onOpenWorkspaceSettings?: () => void;
  mdx?: { active: boolean; onToggle: () => void };
  deployment?: {
    info: DeploymentInfo;
    status: DeployStatus;
    onDeploy: () => void | Promise<void>;
  };
  panels: WorkbenchPanel[];
}

export function WorkbenchOverflowControl({
  onOpenWorkspaceSettings,
  mdx,
  deployment,
  panels,
}: WorkbenchOverflowControlProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [deploymentOpen, setDeploymentOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const restoreTriggerFocus = () => requestAnimationFrame(() => triggerRef.current?.focus());

  useEffect(() => {
    if (panels.length === 0) setToolsOpen(false);
  }, [panels.length]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            type="button"
            variant="ghost"
            size="icon-sm"
            className={TOOLBAR_ACTION_CLASS}
            data-openpress-workbench-more
            aria-label="更多操作"
            title="更多操作"
          >
            <MoreHorizontal aria-hidden="true" />
            <span className={TOOLBAR_ACTION_LABEL_CLASS}>More</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={0} className={OVERFLOW_MENU_CLASS}>
          {onOpenWorkspaceSettings ? (
            <DropdownMenuItem data-openpress-overflow-settings onSelect={onOpenWorkspaceSettings}>
              <Settings aria-hidden="true" />
              <span>Workspace Settings</span>
            </DropdownMenuItem>
          ) : null}
          {mdx ? (
            <DropdownMenuItem data-openpress-overflow-mdx onSelect={mdx.onToggle}>
              {mdx.active ? <Eye aria-hidden="true" /> : <FileText aria-hidden="true" />}
              <span>{mdx.active ? "離開 MDX source" : "MDX source"}</span>
            </DropdownMenuItem>
          ) : null}
          {deployment ? (
            <DropdownMenuItem data-openpress-overflow-deployment onSelect={() => setDeploymentOpen(true)}>
              <Rocket aria-hidden="true" />
              <span>Deployment</span>
            </DropdownMenuItem>
          ) : null}
          {panels.length > 0 ? (
            <DropdownMenuItem data-openpress-overflow-tools onSelect={() => setToolsOpen(true)}>
              <SlidersHorizontal aria-hidden="true" />
              <span>Extension tools</span>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {deployment ? (
        <DeploymentDialog
          open={deploymentOpen}
          onOpenChange={(open) => {
            setDeploymentOpen(open);
            if (!open) restoreTriggerFocus();
          }}
          info={deployment.info}
          status={deployment.status}
          onDeploy={deployment.onDeploy}
        />
      ) : null}
      <WorkbenchToolsDrawer
        open={toolsOpen}
        onOpenChange={(open) => {
          setToolsOpen(open);
          if (!open) restoreTriggerFocus();
        }}
        panels={panels}
      />
    </>
  );
}
