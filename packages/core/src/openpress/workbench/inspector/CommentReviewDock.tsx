import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  MessageSquareText,
  Trash2,
} from "lucide-react";
import { cn } from "@/openpress/core/cn";
import type { SourceBlock } from "../../document-model";
import { matchesHotkey } from "../../hotkeys";
import { isKeyboardEventComposing } from "../keyboardEvents";
import { MentionSuggestionList, useComposerMentions } from "../mentions";
import type { ProjectMentionItem } from "../project";
import { formatCommentTimestamp } from "../workbenchFormatters";
import type {
  InspectorCommentStatus,
  PendingCommentsStatus,
} from "../workbenchTypes";
import type { PendingComment } from "./inspectorModel";

export interface CommentReviewDockProps {
  comments: PendingComment[];
  status: PendingCommentsStatus;
  error: string;
  activeCommentId?: string | null;
  selectedBlock: SourceBlock | null;
  commentText: string;
  commentStatus: InspectorCommentStatus;
  commentStatusMessage: string;
  submitDisabled: boolean;
  mentionItems: ProjectMentionItem[];
  onSelect: (comment: PendingComment) => void;
  onClear: (id: string) => Promise<void>;
  onCommentTextChange: (value: string) => void;
  onSubmitComment: (event?: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function getCommentReviewPosition({
  activeIndex,
  total,
  hasSelectedComment,
  hasDraftTarget,
}: {
  activeIndex: number;
  total: number;
  hasSelectedComment: boolean;
  hasDraftTarget: boolean;
}) {
  if (hasDraftTarget) return { current: total + 1, total: total + 1 };
  if (hasSelectedComment) return { current: activeIndex + 1, total };
  return { current: 0, total };
}

export function CommentReviewDock({
  comments,
  status,
  error,
  activeCommentId,
  selectedBlock,
  commentText,
  commentStatus,
  commentStatusMessage,
  submitDisabled,
  mentionItems,
  onSelect,
  onClear,
  onCommentTextChange,
  onSubmitComment,
}: CommentReviewDockProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const busy = status === "loading" || status === "clearing" || commentStatus === "submitting";
  const total = comments.length;
  const selectedComment = activeCommentId
    ? comments.find((comment) => comment.id === activeCommentId) ?? null
    : null;
  const selectedPath = selectedComment?.path ?? selectedBlock?.path ?? "";
  const selectedLine = selectedComment?.line ?? selectedBlock?.source?.line;
  const displayPath = selectedPath.split("/").slice(-3).join("/");
  const editorLabel = selectedComment ? "編輯註解" : selectedBlock ? "新增註解" : "尚未選取內容";
  const reviewPosition = getCommentReviewPosition({
    activeIndex,
    total,
    hasSelectedComment: Boolean(selectedComment),
    hasDraftTarget: Boolean(selectedBlock && !selectedComment),
  });
  const {
    activeMention,
    handleMentionKeyDown,
    highlightedMentionIndex,
    mentionSuggestions,
    setHighlightedMentionIndex,
    setComposerCursor,
    syncCursor,
    insertMention,
  } = useComposerMentions({
    text: commentText,
    items: mentionItems,
    textareaRef,
    onTextChange: onCommentTextChange,
    enabled: expanded && Boolean(selectedBlock || selectedComment),
  });

  useEffect(() => {
    if (total === 0) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((current) => Math.min(current, total - 1));
  }, [total]);

  useEffect(() => {
    if (!activeCommentId) return;
    const index = comments.findIndex((comment) => comment.id === activeCommentId);
    if (index >= 0) setActiveIndex(index);
  }, [activeCommentId, comments]);

  const selectIndex = useCallback((index: number) => {
    if (total === 0) return;
    const nextIndex = (index + total) % total;
    const comment = comments[nextIndex];
    if (!comment) return;
    setActiveIndex(nextIndex);
    setExpanded(true);
    onSelect(comment);
  }, [comments, onSelect, total]);

  const handlePrev = useCallback(() => selectIndex(activeIndex - 1), [activeIndex, selectIndex]);
  const handleNext = useCallback(() => selectIndex(activeIndex + 1), [activeIndex, selectIndex]);

  useEffect(() => {
    const firstComment = comments[0];
    if (!firstComment || activeCommentId || selectedBlock) return;
    onSelect(firstComment);
  }, [activeCommentId, comments, onSelect, selectedBlock]);

  useEffect(() => {
    if (!selectedBlock && !selectedComment) return;
    setExpanded(true);
    const frame = window.requestAnimationFrame(() => textareaRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [selectedBlock?.id, selectedComment?.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || (target instanceof HTMLElement && target.isContentEditable)
      ) return;

      if (event.key === "j" || event.key === "J" || event.key === "ArrowDown" || event.key === "]") {
        event.preventDefault();
        handleNext();
      } else if (event.key === "k" || event.key === "K" || event.key === "ArrowUp" || event.key === "[") {
        event.preventDefault();
        handlePrev();
      } else if (event.key === "c" || event.key === "C" || event.key === "Enter" || event.key === "Escape") {
        event.preventDefault();
        setExpanded((current) => !current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev]);

  const handleClear = async () => {
    if (!selectedComment || busy) return;
    await onClear(selectedComment.id);
    const remaining = comments.filter((comment) => comment.id !== selectedComment.id);
    if (remaining.length === 0) return;
    const nextIndex = Math.min(activeIndex, remaining.length - 1);
    setActiveIndex(nextIndex);
    onSelect(remaining[nextIndex]);
  };

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[140] w-[min(680px,calc(100vw-24px))] -translate-x-1/2 select-none"
      data-openpress-comment-review-dock
      data-openpress-comment-review-expanded={expanded ? "true" : "false"}
    >
      <div className={cn(
        "overflow-hidden rounded-2xl bg-[rgb(18_20_20_/_0.95)] text-[rgb(245_247_246_/_0.94)]",
        "shadow-[0_24px_60px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.07]",
        "backdrop-blur-2xl transition-[box-shadow,height] duration-200",
        error && "ring-[color-mix(in_srgb,var(--op-workspace-danger)_48%,transparent)]",
      )}>
        <div className="flex h-12 items-center justify-between gap-2 px-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <button
              type="button"
              className="inline-flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-white/80 transition-colors hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-30"
              title="上一則註解 (K / ↑)"
              aria-label="上一則註解"
              onClick={handlePrev}
              disabled={total === 0 || busy}
              data-openpress-comment-review-prev
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            <span className="inline-flex h-7.5 shrink-0 items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 font-mono text-[12px] font-bold text-white">
              <span>{reviewPosition.current}</span>
              <span className="text-white/35">/</span>
              <span className="text-white/60">{reviewPosition.total}</span>
            </span>

            <button
              type="button"
              className="inline-flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-white/80 transition-colors hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-30"
              title="下一則註解 (J / ↓)"
              aria-label="下一則註解"
              onClick={handleNext}
              disabled={total === 0 || busy}
              data-openpress-comment-review-next
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>

            <span className="ml-0.5 inline-flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-white/55">
              <MessageSquareText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{editorLabel}</span>
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-white/[0.04] text-white/60 transition-[background-color,color,transform] hover:bg-[rgb(184_62_55_/_0.24)] hover:text-[rgb(236_143_135)] active:scale-95 disabled:opacity-30"
              title="清除目前註解"
              aria-label="清除目前註解"
              onClick={() => void handleClear()}
              disabled={!selectedComment || busy}
              data-openpress-comment-review-clear
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={cn(
                "inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-white/[0.04] text-white/70 transition-[background-color,color,transform] hover:bg-white/10 hover:text-white active:scale-95",
                expanded && "bg-white/12 text-white",
              )}
              title={expanded ? "收合註解 (C / Esc)" : "展開註解 (C / Enter)"}
              aria-label={expanded ? "收合註解" : "展開註解"}
              aria-expanded={expanded}
              onClick={() => setExpanded((current) => !current)}
              data-openpress-comment-review-expand
            >
              {expanded
                ? <ChevronDown className="h-4 w-4" aria-hidden="true" />
                : <ChevronUp className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {expanded ? (
          <form
            className="flex flex-col gap-2.5 bg-[rgb(12_14_14_/_0.98)] p-3 text-left"
            data-openpress-comment-review-drawer
            onSubmit={(event) => void onSubmitComment(event)}
          >
            {error ? (
              <p className="m-0 text-[12px] leading-relaxed text-[rgb(236_143_135)]" role="alert">
                {error}
              </p>
            ) : status === "loading" ? (
              <p className="m-0 text-[12px] leading-relaxed text-white/60" role="status">
                正在載入註解…
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 font-mono text-[10px] text-white/40">
                  <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-[var(--op-workspace-accent)]">
                    <MessageSquareText className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span>{selectedComment ? `註解 #${activeIndex + 1}` : selectedBlock ? "新註解" : "選取內容後開始"}</span>
                  </span>
                  {displayPath ? (
                    <span className="min-w-0 truncate" title={selectedLine ? `${selectedPath}:${selectedLine}` : selectedPath}>
                      {displayPath}{selectedLine ? `:${selectedLine}` : ""}
                    </span>
                  ) : null}
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_34px] items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    className="max-h-36 min-h-[88px] w-full resize-y rounded-xl border border-white/[0.07] bg-white/[0.05] px-3 py-2.5 text-[13px] font-medium leading-relaxed text-white/95 placeholder:text-white/35 focus:border-[color-mix(in_srgb,var(--op-workspace-accent)_62%,transparent)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    value={commentText}
                    disabled={(!selectedBlock && !selectedComment) || commentStatus === "submitting"}
                    onChange={(event) => {
                      onCommentTextChange(event.target.value);
                      setComposerCursor(event.target.selectionStart ?? event.target.value.length);
                    }}
                    onClick={syncCursor}
                    onKeyUp={syncCursor}
                    onKeyDown={(event) => {
                      if (isKeyboardEventComposing(event)) return;
                      if (handleMentionKeyDown(event)) return;
                      if (matchesHotkey("editing.submit-comment", event)) {
                        event.preventDefault();
                        event.stopPropagation();
                        void onSubmitComment();
                      }
                    }}
                    aria-label={selectedComment ? "編輯註解" : "新增註解"}
                    placeholder={selectedBlock || selectedComment ? "輸入註解，可使用 @ 或 / 提及…" : "點選文件內容以新增註解"}
                    rows={3}
                    data-openpress-comment-review-textarea
                  />
                  <button
                    type="submit"
                    className="grid h-[34px] w-[34px] place-items-center rounded-lg border-0 bg-[var(--op-workspace-accent)] text-white transition-[opacity,transform] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={submitDisabled}
                    aria-label={selectedComment ? "儲存註解" : "送出註解"}
                    data-openpress-comment-review-submit
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <MentionSuggestionList
                  className="grid gap-1 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.04] p-1.5"
                  classNames={{
                    item: "flex min-w-0 cursor-pointer items-baseline justify-between gap-3.5 rounded-lg border-0 bg-transparent px-2.5 py-2 text-left text-white/90 hover:bg-white/[0.08] focus-visible:bg-white/[0.08] focus-visible:outline-0 data-[highlighted=true]:bg-white/[0.08]",
                    label: "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs leading-[1.2]",
                    meta: "shrink-0 text-[10px] leading-[1.2] text-[var(--op-workspace-accent)]",
                  }}
                  suggestions={mentionSuggestions}
                  highlightedIndex={highlightedMentionIndex}
                  ariaLabel={activeMention?.trigger === "/" ? "Skill suggestions" : "Mention suggestions"}
                  onHighlight={setHighlightedMentionIndex}
                  onSelect={insertMention}
                />

                <div className="flex items-center justify-between gap-3 text-[10px] text-white/40">
                  <span
                    className={cn(
                      commentStatus === "failed" && "text-[rgb(236_143_135)]",
                      commentStatus === "saved" && "text-[rgb(134_239_172_/_0.88)]",
                    )}
                    role="status"
                    aria-live="polite"
                    data-openpress-inspector-comment-status={commentStatus}
                  >
                    {commentStatusMessage
                      || (selectedComment?.timestamp ? formatCommentTimestamp(selectedComment.timestamp) : "等待編輯")}
                  </span>
                  <span className="font-mono text-[9px] text-white/30">⌘↵ 儲存 · J/K 切換 · C/Esc 收合</span>
                </div>
              </>
            )}
          </form>
        ) : null}
      </div>
    </div>
  );
}
