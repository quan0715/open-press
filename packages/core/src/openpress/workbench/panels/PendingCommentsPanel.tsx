import { memo } from "react";
import { Trash2 } from "lucide-react";
import type { PendingComment } from "../inspector";
import {
  formatCommentTimestamp,
  formatCommentsCount,
} from "../workbenchFormatters";
import type { PendingCommentsStatus } from "../workbenchTypes";
import { Panel } from "./Panel";

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
      className="openpress-comments-panel openpress-comments-panel--embedded openpress-panel--compact"
      data-openpress-comments-panel
      aria-label="待處理註解"
    >
      <Panel.Header>
        <div className="openpress-panel-heading-stack">
          <Panel.Kicker>Comments</Panel.Kicker>
          <Panel.Title>待處理註解</Panel.Title>
          <Panel.Description>{formatCommentsCount(comments.length, status)}</Panel.Description>
        </div>
      </Panel.Header>

      <Panel.Body>
        {error ? <Panel.Error>{error}</Panel.Error> : null}

        {comments.length === 0 && status !== "loading" ? (
          <Panel.Empty role="status">目前沒有註解</Panel.Empty>
        ) : (
          <ol className="openpress-comments-list" aria-label="待處理註解列表">
            {comments.map((comment) => (
              <li className="openpress-comment-entry" data-openpress-comment-id={comment.id} key={comment.id}>
                <button
                  type="button"
                  className="openpress-comment-entry__jump"
                  onClick={() => onSelect?.(comment)}
                  aria-label={`跳到註解 ${comment.id}`}
                >
                  <p className="openpress-comment-entry__note" title={comment.note}>{comment.note}</p>
                  <p className="openpress-comment-entry__meta">
                    <code>{comment.path}:{comment.line}</code>
                    {comment.timestamp ? <span>{formatCommentTimestamp(comment.timestamp)}</span> : null}
                  </p>
                </button>
                <button
                  type="button"
                  className="openpress-comment-entry__clear"
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
