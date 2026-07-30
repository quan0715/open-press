import { FileDiff } from "lucide-react";
import { Button } from "@/openpress/ui/button";
import { TOOLBAR_ACTION_CLASS, TOOLBAR_ACTION_LABEL_CLASS } from "../toolbarClasses";
import type { ChangePreview } from "./changePreviewModel";
import type { ChangePreviewStatus } from "./useChangePreview";

const CHANGE_BADGE_CLASS = [
  "pointer-events-none absolute right-[4px] top-[4px] grid min-h-[14px] min-w-[14px] place-items-center rounded-full",
  "bg-[var(--op-workspace-accent)] px-[3px] text-[8px] font-black leading-none text-white",
  "shadow-[0_0_0_1px_var(--op-workspace-surface)]",
].join(" ");

export function ChangePreviewControl({
  workspaceMode,
  preview,
  status,
  error,
  active,
  onActiveChange,
  onRefresh,
}: {
  workspaceMode: boolean;
  preview: ChangePreview | null;
  status: ChangePreviewStatus;
  error: string;
  active: boolean;
  onActiveChange: (active: boolean) => void;
  onRefresh: () => Promise<void>;
}) {
  if (!workspaceMode || (!preview?.proposals.length && !error)) return null;

  const proposalCount = preview?.proposals.length ?? 0;
  const exact = preview?.proposals.every((proposal) => proposal.matches === 1) ?? false;
  const reviewReady = Boolean(preview?.document && exact);
  const issue = error || preview?.renderError || (!exact ? "Refresh the proposal before reviewing it." : "");
  const title = issue
    ? `Change preview needs attention: ${issue}`
    : active
      ? "Close rendered change preview"
      : `Compare ${proposalCount} proposed changes on the document`;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={TOOLBAR_ACTION_CLASS}
      data-openpress-change-preview-trigger
      data-openpress-toolbar-expanded={active ? "true" : "false"}
      data-openpress-toolbar-active={active ? "true" : "false"}
      data-openpress-change-preview-ready={reviewReady ? "true" : "false"}
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={() => {
        if (reviewReady) {
          onActiveChange(!active);
          return;
        }
        void onRefresh();
      }}
    >
      <FileDiff className={status === "loading" ? "animate-pulse" : ""} aria-hidden="true" />
      <span className={CHANGE_BADGE_CLASS}>{proposalCount > 99 ? "99+" : String(proposalCount || "!")}</span>
      <span className={TOOLBAR_ACTION_LABEL_CLASS}>Changes</span>
    </Button>
  );
}
