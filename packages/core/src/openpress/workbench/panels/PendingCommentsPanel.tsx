import { memo } from "react";
import { Trash2 } from "lucide-react";
import type { PendingComment } from "../inspector";
import {
  formatCommentTimestamp,
  formatCommentsCount,
} from "../workbenchFormatters";
import type { PendingCommentsStatus } from "../workbenchTypes";
import { Panel } from "./Panel";

const COMMENTS_PANEL_CLASS = [
  "openpress-comments-panel openpress-comments-panel--embedded openpress-panel--compact",
  "min-h-0 overflow-visible !bg-transparent !p-0 !text-[rgb(232_232_228_/_0.92)]",
].join(" ");
const COMMENTS_LIST_CLASS = "openpress-comments-list !m-0 !mt-1.5 grid !list-none gap-0 !p-0";
const COMMENT_ENTRY_CLASS = [
  "openpress-comment-entry grid grid-cols-[minmax(0,1fr)_24px] items-center gap-2 border-0 border-t border-white/[0.07]",
  "bg-transparent py-2",
].join(" ");
const COMMENT_JUMP_CLASS = [
  "openpress-comment-entry__jump grid min-h-0 w-full min-w-0 justify-items-start rounded border-0 bg-transparent p-0",
  "text-left text-inherit [font:inherit] hover:bg-transparent hover:text-[rgb(242_242_240_/_0.96)]",
].join(" ");
const COMMENT_NOTE_CLASS = [
  "openpress-comment-entry__note !m-0 overflow-hidden !text-[11.5px] !font-[520] !leading-[1.35] !text-[rgb(232_232_228_/_0.86)]",
  "[display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]",
].join(" ");
const COMMENT_META_CLASS = [
  "openpress-comment-entry__meta !m-0 !mt-1 flex min-w-0 flex-wrap gap-x-1.5 gap-y-1 !text-[10px] !leading-[1.25]",
  "!text-[rgb(150_156_163_/_0.64)]",
].join(" ");
const COMMENT_META_CODE_CLASS = "!border-0 !bg-transparent !p-0 !text-inherit [font-family:ui-monospace,SFMono-Regular,Menlo,monospace] [overflow-wrap:anywhere]";
const COMMENT_CLEAR_CLASS = [
  "openpress-comment-entry__clear inline-flex min-h-6 w-6 cursor-pointer items-center justify-center gap-[7px]",
  "rounded border-0 bg-transparent p-0 text-[0px] text-[rgb(150_156_163_/_0.64)] [font:inherit]",
  "hover:border-0 hover:bg-white/[0.05] hover:text-[rgb(242_242_240_/_0.9)]",
  "disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:h-[13px] [&_svg]:w-[13px]",
].join(" ");

function PendingCommentsPanelImpl({
  comments,
  status,
  error,
  onClear,
  onSelect,
}: {
  comments: PendingComment[];
  status: PendingCommentsStatus;
  error: string;
  onClear: (id: string) => Promise<void>;
  onSelect?: (comment: PendingComment) => void;
}) {
  const busy = status === "loading" || status === "clearing";

  return (
    <Panel
      className={COMMENTS_PANEL_CLASS}
      data-openpress-comments-panel
      aria-label="待處理註解"
    >
      <Panel.Header>
        <Panel.HeadingStack>
          <Panel.Kicker>Comments</Panel.Kicker>
          <Panel.Title>待處理註解</Panel.Title>
          <Panel.Description>{formatCommentsCount(comments.length, status)}</Panel.Description>
        </Panel.HeadingStack>
      </Panel.Header>

      <Panel.Body>
        {error ? <Panel.Error>{error}</Panel.Error> : null}

        {comments.length === 0 && status !== "loading" ? (
          <Panel.Empty role="status">目前沒有註解</Panel.Empty>
        ) : (
          <ol className={COMMENTS_LIST_CLASS} aria-label="待處理註解列表">
            {comments.map((comment) => (
              <li className={COMMENT_ENTRY_CLASS} data-openpress-comment-id={comment.id} key={comment.id}>
                <button
                  type="button"
                  className={COMMENT_JUMP_CLASS}
                  onClick={() => onSelect?.(comment)}
                  aria-label={`跳到註解 ${comment.id}`}
                >
                  <p className={COMMENT_NOTE_CLASS} title={comment.note}>{comment.note}</p>
                  <p className={COMMENT_META_CLASS}>
                    <code className={COMMENT_META_CODE_CLASS}>{comment.path}:{comment.line}</code>
                    {comment.timestamp ? <span>{formatCommentTimestamp(comment.timestamp)}</span> : null}
                  </p>
                </button>
                <button
                  type="button"
                  className={COMMENT_CLEAR_CLASS}
                  onClick={() => void onClear(comment.id)}
                  disabled={busy}
                  aria-label={`清除註解 ${comment.id}`}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </Panel.Body>
    </Panel>
  );
}

export const PendingCommentsPanel = memo(PendingCommentsPanelImpl);
PendingCommentsPanel.displayName = "PendingCommentsPanel";
