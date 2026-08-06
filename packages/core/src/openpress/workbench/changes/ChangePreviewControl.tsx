import { Check, Copy, FileDiff, LoaderCircle, TriangleAlert } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/openpress/ui/button";
import { cn } from "@/openpress/core/cn";
import {
  WorkbenchDialog,
  WorkbenchDialogAction,
  WorkbenchDialogBody,
  WorkbenchDialogStrong,
  WorkbenchDialogText,
} from "../dialog";
import { TOOLBAR_ACTION_CLASS, TOOLBAR_ACTION_LABEL_CLASS } from "../toolbarClasses";
import type { ChangePreview } from "./changePreviewModel";
import type { ChangePreviewStatus } from "./useChangePreview";

const CHANGE_BADGE_CLASS = [
  "pointer-events-none absolute right-[4px] top-[4px] grid min-h-[14px] min-w-[14px] place-items-center rounded-full",
  "bg-[var(--op-workspace-accent)] px-[3px] text-[8px] font-black leading-none text-white",
  "shadow-[0_0_0_1px_var(--op-workspace-surface)]",
].join(" ");
const REFRESH_PROPOSAL_PROMPT = [
  "請使用 openpress-collaborate 的 Refresh From Feedback 流程。",
  "讀取目前 .openpress/review/current.json 與最新文件來源，將現有 feedback 視為輸入，重新評估完整改動，",
  "並以目前可唯一匹配的 before/after 取代整份 Proposal。不要直接修改文件，也不要複製舊 feedback。",
].join("");
const PROMPT_ROW_CLASS = [
  "flex min-w-0 items-center gap-2 rounded-[var(--op-workspace-radius-sm)] border border-[var(--op-workspace-border-muted)]",
  "bg-[var(--op-workspace-surface-muted)] px-2 py-1.5",
].join(" ");
const PROMPT_PREVIEW_CLASS = [
  "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[10px] leading-5",
  "text-[var(--op-workspace-text-muted)]",
].join(" ");
const PROMPT_COPY_CLASS = [
  "inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--op-workspace-radius-sm)] border",
  "border-[var(--op-workspace-border)] bg-transparent px-2 text-[10px] font-semibold text-[var(--op-workspace-text-soft)]",
  "hover:border-[var(--op-workspace-accent-border)] hover:text-[var(--op-workspace-accent)] [&_svg]:h-3 [&_svg]:w-3",
].join(" ");
const ATTENTION_ERROR_CLASS = "text-[var(--op-workspace-danger)]";

type PromptCopyStatus = "idle" | "copied" | "failed";
type ProposalClearStatus = "idle" | "clearing" | "failed";

export function ChangePreviewControl({
  workspaceMode,
  preview,
  status,
  error,
  active,
  onActiveChange,
  onRefresh,
  onClear,
}: {
  workspaceMode: boolean;
  preview: ChangePreview | null;
  status: ChangePreviewStatus;
  error: string;
  active: boolean;
  onActiveChange: (active: boolean) => void;
  onRefresh: () => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const attentionTitleId = useId();
  const [attentionOpen, setAttentionOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<PromptCopyStatus>("idle");
  const [clearStatus, setClearStatus] = useState<ProposalClearStatus>("idle");
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
    <>
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
          if (needsAttention) {
            setCopyStatus("idle");
            setClearStatus("idle");
            setAttentionOpen(true);
            return;
          }
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

      {attentionOpen ? (
        <WorkbenchDialog
          titleId={attentionTitleId}
          eyebrow="Changes"
          title="Proposal 需要重新產生"
          closeLabel="關閉 Proposal 說明"
          contentDataAttribute="data-openpress-change-preview-attention"
          onClose={() => setAttentionOpen(false)}
          footer={(
            <WorkbenchDialogAction
              tone="danger"
              disabled={clearStatus === "clearing"}
              onClick={async () => {
                setClearStatus("clearing");
                try {
                  await onClear();
                  setAttentionOpen(false);
                } catch {
                  setClearStatus("failed");
                }
              }}
            >
              {clearStatus === "clearing" ? "清除中…" : "清除 Proposal"}
            </WorkbenchDialogAction>
          )}
        >
          <WorkbenchDialogBody>
            <WorkbenchDialogText>
              Proposal 的原始文字已經和目前文件不同。請交給 Agent 重建，或清除這批 Proposal。
            </WorkbenchDialogText>
            <div className={PROMPT_ROW_CLASS}>
              <code className={PROMPT_PREVIEW_CLASS}>
                請使用 openpress-collaborate 的 Refresh From Feedback…
              </code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={PROMPT_COPY_CLASS}
                data-openpress-change-preview-copy-prompt
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(REFRESH_PROPOSAL_PROMPT);
                    setCopyStatus("copied");
                  } catch {
                    setCopyStatus("failed");
                  }
                }}
                aria-label="複製重新產生 Proposal 的 Prompt"
              >
                {copyStatus === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                <span aria-live="polite">
                  {copyStatus === "copied" ? "Copied" : copyStatus === "failed" ? "Copy failed" : "Click to copy"}
                </span>
              </Button>
            </div>
            <WorkbenchDialogText>
              <WorkbenchDialogStrong>系統訊息：</WorkbenchDialogStrong>{" "}{issue}
            </WorkbenchDialogText>
            {clearStatus === "failed" ? (
              <WorkbenchDialogText className={ATTENTION_ERROR_CLASS} role="alert">
                無法清除 Proposal，請稍後再試。
              </WorkbenchDialogText>
            ) : null}
          </WorkbenchDialogBody>
        </WorkbenchDialog>
      ) : null}
    </>
  );
}
