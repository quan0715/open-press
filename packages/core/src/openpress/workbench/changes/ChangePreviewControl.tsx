import { FileDiff, LoaderCircle, TriangleAlert } from "lucide-react";
import { Button } from "@/openpress/ui/button";
import { cn } from "@/openpress/core/cn";
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
  if (!workspaceMode) return null;

  const proposalCount = preview?.proposals.length ?? 0;
  const exact = preview?.proposals.every((proposal) => proposal.matches === 1) ?? false;
  const reviewReady = Boolean(preview?.document && exact);
  const issue = error || preview?.renderError || (!exact ? "Refresh the proposal before reviewing it." : "");
  const loading = status === "idle" || status === "loading";
  const failed = status === "failed";
  const empty = status === "empty";
  const needsAttention = !loading && !failed && !empty && Boolean(issue);
  const expanded = active || loading || failed || needsAttention;
  const label = loading
    ? preview ? "更新 Proposal" : "讀取 Proposal"
    : failed
      ? "Proposal 錯誤"
      : empty
        ? "尚無 Proposal"
        : needsAttention
          ? "Proposal 需更新"
          : "Changes";
  const title = loading
    ? preview
      ? "正在更新 Change Preview"
      : "正在讀取 Change Preview"
    : failed
      ? `Change Preview 無法讀取：${issue || "未知錯誤"}（點擊重試）`
      : empty
        ? "尚無 Proposal。Agent 寫入後可點此重新讀取"
        : issue
          ? `Change preview needs attention: ${issue}`
          : active
            ? "Close rendered change preview"
            : `Compare ${proposalCount} proposed changes on the document`;
  const Icon = loading ? LoaderCircle : failed || needsAttention ? TriangleAlert : FileDiff;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn(
        TOOLBAR_ACTION_CLASS,
        failed && "text-[var(--op-workspace-danger)]",
        needsAttention && "text-[var(--op-workspace-warning)]",
      )}
      data-openpress-change-preview-trigger
      data-openpress-change-preview-status={status}
      data-openpress-toolbar-expanded={expanded ? "true" : "false"}
      data-openpress-toolbar-active={active ? "true" : "false"}
      data-openpress-change-preview-ready={reviewReady ? "true" : "false"}
      title={title}
      aria-label={title}
      aria-pressed={active}
      aria-busy={loading}
      onClick={() => {
        if (loading) return;
        if (reviewReady) {
          onActiveChange(!active);
          return;
        }
        void onRefresh();
      }}
    >
      <Icon className={loading ? "motion-safe:animate-spin" : ""} aria-hidden="true" />
      {!loading && !empty ? (
        <span className={CHANGE_BADGE_CLASS}>
          {proposalCount > 99 ? "99+" : String(proposalCount || "!")}
        </span>
      ) : null}
      <span className={TOOLBAR_ACTION_LABEL_CLASS} role="status" aria-live="polite">
        {label}
      </span>
    </Button>
  );
}
