import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/openpress/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/openpress/ui/dialog";
import { TOOLBAR_ACTION_CLASS, TOOLBAR_ACTION_LABEL_CLASS } from "../toolbarClasses";
import { WorkbenchControlPanel, type WorkbenchPanel } from "./WorkbenchControlPanel";

const TOOLS_DRAWER_CLASS = [
  "op-workspace-tools-drawer !bottom-0 !left-auto !right-0 !top-[var(--op-workspace-toolbar-height,44px)]",
  "!z-[1001] !grid !h-auto !w-[min(390px,92vw)] !max-w-none !grid-rows-[auto_minmax(0,1fr)] !translate-x-0 !translate-y-0 !gap-0",
  "!overflow-hidden !rounded-none !border-0 !border-l !border-[var(--op-workspace-border-muted)]",
  "![background:var(--op-workspace-panel-bg)] !p-0 text-[var(--op-workspace-text)]",
  "shadow-[-18px_0_36px_rgb(0_0_0_/_0.28)]",
].join(" ");

export function WorkbenchToolsControl({ panels }: { panels: WorkbenchPanel[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (panels.length === 0) setOpen(false);
  }, [panels.length]);

  if (panels.length === 0) return null;

  return (
    <>
      <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={TOOLBAR_ACTION_CLASS}
          data-openpress-tools-trigger
          data-openpress-toolbar-active={open ? "true" : "false"}
          aria-label="工具"
          title="工具"
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal aria-hidden="true" />
          <span className={TOOLBAR_ACTION_LABEL_CLASS}>Tools</span>
      </Button>
      <WorkbenchToolsDrawer open={open} onOpenChange={setOpen} panels={panels} />
    </>
  );
}

export interface WorkbenchToolsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panels: WorkbenchPanel[];
}

export function WorkbenchToolsDrawer({ open, onOpenChange, panels }: WorkbenchToolsDrawerProps) {
  if (!open || panels.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={TOOLS_DRAWER_CLASS}
        overlayClassName="!z-[1000] !bg-black/30 !backdrop-blur-0"
        showCloseButton={false}
        aria-describedby={undefined}
        data-openpress-tools-drawer
      >
        <header className="flex h-11 shrink-0 items-center justify-between border-b border-[var(--op-workspace-border-muted)] px-4">
          <DialogTitle className="!text-[12px] !font-semibold !text-[var(--op-workspace-text)]">工具</DialogTitle>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="關閉工具">
              <X aria-hidden="true" />
            </Button>
          </DialogClose>
        </header>
        <WorkbenchControlPanel
          panels={panels}
          ariaLabel="擴充工具"
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4"
        />
      </DialogContent>
    </Dialog>
  );
}
