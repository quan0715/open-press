import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import { ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "../../core/cn";
import { MentionSuggestionList, useComposerMentions } from "../mentions";
import type {
  InspectorState,
  ObjectSelection,
} from "./inspectorModel";
import type { ProjectMentionItem } from "../project";
import {
  collectInspectorBlockElements,
  createInspectorComposerStyle,
  createInspectorInsertTargets,
  createInspectorMarkerStyle,
  rectToFixedStyle,
  resolveInspectorSelectionRect,
  syncInspectorSelectedBlock,
} from "./inspectorGeometryModel";
import {
  getInlineSavedCommentForTarget,
  getInlineSavedCommentMarkers,
} from "./inlineCommentModel";
import type {
  InlineSavedComment,
  InlineSavedCommentMarkerEntry,
  InspectorCommentStatus,
  InspectorInsertTargetView,
  InspectorLayerRect,
} from "../workbenchTypes";

type ComposerAction = "add" | "edit" | "delete";

const COMPOSER_ACTIONS: Array<{ action: ComposerAction; label: string; icon: typeof Plus; prefix: string }> = [
  { action: "add", label: "Add", icon: Plus, prefix: "請新增：" },
  { action: "edit", label: "Edit", icon: Pencil, prefix: "請修改：" },
  { action: "delete", label: "Remove", icon: Trash2, prefix: "請刪除這個物件。" },
];

const INLINE_INSPECTOR_LAYER_CLASS = "openpress-inline-inspector-layer pointer-events-none fixed inset-0 z-[90]";
const INLINE_INSERT_TARGET_CLASS = "openpress-inline-insert-target pointer-events-auto fixed z-[91] cursor-cell rounded-full border-0 bg-transparent p-0 text-[var(--openpress-accent,#df4b21)] opacity-0 transition-[opacity,transform] duration-[140ms] ease-in-out hover:opacity-100";
const INLINE_INSERT_TARGET_SELECTED_CLASS = "is-selected scale-y-[1.12] opacity-100";
const INLINE_INSERT_TARGET_LOCKED_CLASS = "pointer-events-none";
const INLINE_INSERT_TARGET_RULE_CLASS = "absolute left-0 right-0 top-1/2 border-t-2 border-[#df4b21]/80";
const INLINE_COMMENT_MARKER_CLASS = "openpress-inline-comment-marker group pointer-events-auto fixed z-[132] grid cursor-pointer place-items-start justify-center rounded-none border-0 bg-transparent p-0 text-xs font-extrabold leading-none text-white transition-[transform,opacity] duration-150 [font-family:inherit] hover:-translate-y-px hover:opacity-90 focus-visible:-translate-y-px focus-visible:opacity-90 focus-visible:outline-none";
const INLINE_COMMENT_MARKER_LOCKED_CLASS = "pointer-events-none";
const INLINE_COMMENT_MARKER_INDEX_CLASS = "openpress-inline-comment-marker__index relative grid h-7 w-7 place-items-center rounded-full border-[3px] border-[#f8fbff] bg-[var(--openpress-accent,#df4b21)] shadow-[0_10px_26px_rgb(0_0_0_/_0.24)] group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-[#e68b70]";
const INLINE_COMMENT_MARKER_INDEX_DRAFT_CLASS = "bg-[#1b7cff]";
const INLINE_COMMENT_MARKER_INDEX_SAVED_CLASS = "bg-[#c24b25]";
const INLINE_COMMENT_COMPOSER_CLASS = "openpress-inline-comment-composer pointer-events-auto fixed z-[131] grid gap-2 rounded-[26px] border border-white/10 bg-[#292929] px-2.5 pb-2.5 pt-2 text-[rgb(248_250_252_/_0.94)] shadow-[0_18px_48px_rgb(0_0_0_/_0.30)]";
const INLINE_COMMENT_COMPOSER_CLOSED_CLASS = "!gap-0 !rounded-full !p-2";
const INLINE_COMMENT_COMPOSER_INTENTS_CLASS = "openpress-inline-comment-composer__intents flex gap-1.5 px-1";
const INLINE_COMMENT_COMPOSER_INTENT_BUTTON_CLASS = "grid h-[30px] w-[30px] cursor-pointer place-items-center rounded-full border border-white/10 bg-white/[0.06] p-0 text-[rgb(238_242_246_/_0.72)] [font-family:inherit] hover:border-[#df4b21]/70 hover:bg-[#df4b21]/20 hover:text-white [&_svg]:h-[15px] [&_svg]:w-[15px] [&_svg]:[stroke-width:2.2]";
const INLINE_COMMENT_COMPOSER_BODY_CLASS = "openpress-inline-comment-composer__body grid grid-cols-[minmax(0,1fr)_34px] items-end gap-2";
const INLINE_COMMENT_TEXTAREA_CLASS = "max-h-32 min-h-[82px] w-full resize-y rounded-2xl border-0 bg-white/[0.05] px-[11px] py-[9px] text-sm leading-[1.35] text-[rgb(248_250_252_/_0.94)] [font-family:inherit] placeholder:text-[rgb(248_250_252_/_0.42)] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#df4b21]/70";
const INLINE_COMMENT_SUBMIT_CLASS = "grid h-[34px] w-[34px] cursor-pointer place-items-center rounded-full border-0 bg-[var(--openpress-accent,#df4b21)] text-white disabled:cursor-not-allowed disabled:opacity-[0.42] [&_svg]:h-4 [&_svg]:w-4";
const INLINE_COMMENT_SUGGESTIONS_CLASS = "openpress-inline-comment-composer__suggestions mt-2.5 grid gap-1 overflow-hidden rounded-xl border border-[#df4b21]/30 bg-[rgb(36_36_34_/_0.96)] p-1.5";
const INLINE_COMMENT_SUGGESTION_ITEM_CLASS = "flex min-w-0 cursor-pointer items-baseline justify-between gap-3.5 rounded-lg border-0 bg-transparent px-2.5 py-2 text-left text-[rgb(244_241_235_/_0.90)] [font-family:inherit] hover:bg-[#df4b21]/20 focus-visible:bg-[#df4b21]/20 focus-visible:outline-0 data-[highlighted=true]:bg-[#df4b21]/20";
const INLINE_COMMENT_SUGGESTION_LABEL_CLASS = "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs leading-[1.2]";
const INLINE_COMMENT_SUGGESTION_META_CLASS = "shrink-0 text-[10px] leading-[1.2] text-[rgb(218_161_123_/_0.78)]";
const INLINE_COMMENT_STATUS_CLASS = "!mx-2 !mb-0 !mt-[-2px] min-h-[13px] text-[11px] leading-[1.25] text-[rgb(203_213_225_/_0.68)]";
const INLINE_COMMENT_STATUS_FAILED_CLASS = "text-[rgb(248_113_113_/_0.92)]";
const INLINE_COMMENT_STATUS_SAVED_CLASS = "text-[rgb(134_239_172_/_0.88)]";

export interface InlineCommentController {
  saved: InlineSavedComment[];
  active: InlineSavedComment | null;
  status: InspectorCommentStatus;
  statusMessage: string;
  totalCount?: number;
  onOpenSaved: (comment: InlineSavedComment) => void;
  onRemoveSaved: (comment: InlineSavedComment) => Promise<void>;
}

export interface InlineComposerController {
  text: string;
  submitDisabled: boolean;
  mentionItems: ProjectMentionItem[];
  onTextChange: (value: string) => void;
  onSubmit: (event?: FormEvent<HTMLFormElement>) => Promise<void>;
}

export interface InlineInspectorLayerProps {
  sourceContainerRef: RefObject<HTMLDivElement | null>;
  inspector: InspectorState;
  comments: InlineCommentController;
  composer: InlineComposerController;
  geometryVersion?: unknown;
}

function InlineInspectorLayerImpl({
  sourceContainerRef,
  inspector,
  comments,
  composer,
  geometryVersion,
}: InlineInspectorLayerProps) {
  const savedComments = comments.saved;
  const savedCommentTotalCount = comments.totalCount ?? savedComments.length;
  const activeSavedComment = comments.active;
  const commentText = composer.text;
  const commentStatus = comments.status;
  const commentStatusMessage = comments.statusMessage;
  const submitDisabled = composer.submitDisabled;
  const mentionItems = composer.mentionItems;
  const onOpenSavedComment = comments.onOpenSaved;
  const onRemoveSavedComment = comments.onRemoveSaved;
  const onCommentTextChange = composer.onTextChange;
  const onSubmitComment = composer.onSubmit;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerRef = useRef<HTMLFormElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const active = inspector.enabled && inspector.inspectorMode;
  const selectedTarget = inspector.selectedTarget;
  const selectedTargetKey = objectSelectionKey(selectedTarget);
  const activeSavedCommentForTarget = selectedTarget && activeSavedComment
    && inlineCommentTargetKey(activeSavedComment) === selectedTargetKey
    && activeSavedComment.placement === selectedTarget.placement
      ? activeSavedComment
      : null;
  const savedCommentForTarget = activeSavedCommentForTarget
    ?? getInlineSavedCommentForTarget(savedComments, selectedTarget);
  const markerEntries = useMemo<InlineSavedCommentMarkerEntry[]>(
    () => getInlineSavedCommentMarkers(savedComments),
    [savedComments],
  );
  const savedCommentLabels = useMemo(() => {
    const labels = new Map<string, string>();
    savedComments.forEach((comment, index) => labels.set(comment.id, String(index + 1)));
    return labels;
  }, [savedComments]);
  const markerEntriesByTarget = useMemo(
    () => new Set(markerEntries.map(({ target }) => objectSelectionKey(target))),
    [markerEntries],
  );
  const markerDisplayEntries = useMemo(
    () => [
      ...markerEntries,
      ...(selectedTarget && !markerEntriesByTarget.has(selectedTargetKey ?? "")
        ? [{ target: selectedTarget, comments: [] }]
        : []),
    ],
    [markerEntries, markerEntriesByTarget, selectedTarget, selectedTargetKey],
  );
  const [insertTargets, setInsertTargets] = useState<InspectorInsertTargetView[]>([]);
  const [selectionRect, setSelectionRect] = useState<InspectorLayerRect | null>(null);
  const [composerTargetKey, setComposerTargetKey] = useState<string | null>(null);
  const composerOpen = Boolean(selectedTargetKey && composerTargetKey === selectedTargetKey);
  const markerOnly = Boolean(savedCommentForTarget && !composerOpen && !activeSavedCommentForTarget);
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
    enabled: composerOpen,
  });

  const updateLayer = useCallback(() => {
    const root = sourceContainerRef.current;
    if (!active || !root) {
      setInsertTargets([]);
      setSelectionRect(null);
      if (root) syncInspectorSelectedBlock(root, null);
      return;
    }

    const blockElements = collectInspectorBlockElements(root);
    const nextInsertTargets = createInspectorInsertTargets(blockElements);
    setInsertTargets(nextInsertTargets);
    setSelectionRect(resolveInspectorSelectionRect(root, selectedTarget, nextInsertTargets));
    syncInspectorSelectedBlock(root, markerOnly ? null : selectedTarget);
  }, [active, geometryVersion, markerOnly, selectedTarget, sourceContainerRef]);

  const scheduleLayerUpdate = useCallback(() => {
    if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      updateLayer();
    });
  }, [updateLayer]);

  useLayoutEffect(() => {
    updateLayer();
  }, [updateLayer]);

  useEffect(() => {
    if (!active) return undefined;
    const root = sourceContainerRef.current;
    const resizeObserver = typeof ResizeObserver === "undefined" || !root
      ? null
      : new ResizeObserver(scheduleLayerUpdate);
    if (root && resizeObserver) resizeObserver.observe(root);
    window.addEventListener("resize", scheduleLayerUpdate);
    window.addEventListener("scroll", scheduleLayerUpdate, true);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleLayerUpdate);
      window.removeEventListener("scroll", scheduleLayerUpdate, true);
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [active, scheduleLayerUpdate, sourceContainerRef]);

  useEffect(() => {
    if (!selectedTarget || composerTargetKey !== selectedTargetKey) return undefined;
    let innerFrame: number | null = null;
    const outerFrame = window.requestAnimationFrame(() => {
      innerFrame = window.requestAnimationFrame(() => textareaRef.current?.focus({ preventScroll: true }));
    });
    return () => {
      window.cancelAnimationFrame(outerFrame);
      if (innerFrame !== null) window.cancelAnimationFrame(innerFrame);
    };
  }, [composerTargetKey, selectedTarget, selectedTargetKey]);

  useEffect(() => {
    setComposerTargetKey(null);
  }, [selectedTargetKey]);

  useEffect(() => {
    if (commentStatus === "saved") setComposerTargetKey(null);
  }, [commentStatus]);

  useEffect(() => {
    if (!composerOpen) return undefined;

    const isInsideComposer = (target: EventTarget | null) => {
      const composerElement = composerRef.current;
      return Boolean(composerElement && target instanceof Node && composerElement.contains(target));
    };
    const blockOutsideComposer = (event: Event) => {
      if (isInsideComposer(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const blockScrollKeyOutsideComposer = (event: KeyboardEvent) => {
      if (!isScrollKey(event) || isInsideComposer(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("wheel", blockOutsideComposer, { capture: true, passive: false });
    window.addEventListener("touchmove", blockOutsideComposer, { capture: true, passive: false });
    window.addEventListener("keydown", blockScrollKeyOutsideComposer, { capture: true });
    return () => {
      window.removeEventListener("wheel", blockOutsideComposer, true);
      window.removeEventListener("touchmove", blockOutsideComposer, true);
      window.removeEventListener("keydown", blockScrollKeyOutsideComposer, true);
    };
  }, [composerOpen]);

  if (!active) return null;

  const composerStyle = selectionRect ? createInspectorComposerStyle(selectionRect, composerOpen) : undefined;
  const visibleActionItems = savedCommentForTarget
    ? COMPOSER_ACTIONS.filter((item) => item.action !== "add")
    : COMPOSER_ACTIONS;
  const applyComposerAction = (action: ComposerAction) => {
    if (!selectedTargetKey) return;
    const item = COMPOSER_ACTIONS.find((entry) => entry.action === action);
    if (!item) return;
    setComposerTargetKey(selectedTargetKey);
    if (!commentText.trim()) onCommentTextChange(item.prefix);
  };
  const handleMarkerClick = (target: ObjectSelection, comments: InlineSavedComment[]) => {
    if (!target) return;
    inspector.selectSelection(target);
    setComposerTargetKey(null);
    if (comments.length === 0) {
      onCommentTextChange("");
      return;
    }
    onOpenSavedComment(comments[0]!);
  };
  const getMarkerRect = (target: ObjectSelection) => {
    const root = sourceContainerRef.current;
    if (!root) return null;
    return resolveInspectorSelectionRect(root, target, insertTargets);
  };
  const markerViews = markerDisplayEntries.flatMap((markerEntry) => {
    const markerRect = getMarkerRect(markerEntry.target);
    if (!markerRect) return [];
    if (!isMarkerRectNearViewport(markerRect)) return [];
    return [{
      markerEntry,
      markerRect,
      markerLabel: markerLabelForEntry(markerEntry, savedCommentLabels, savedCommentTotalCount),
      markerStyle: createInspectorMarkerStyle(markerRect),
    }];
  }).sort((left, right) => compareMarkerRects(left.markerRect, right.markerRect));

  return (
    <div
      className={INLINE_INSPECTOR_LAYER_CLASS}
      data-openpress-inline-inspector-layer
      data-openpress-composer-lock-events={composerOpen ? "true" : "false"}
    >
      {insertTargets.map((target) => {
        const isSelected = selectedTarget?.blockId === target.blockId && selectedTarget.placement === "before";
        return (
          <button
            type="button"
            className={cn(
              INLINE_INSERT_TARGET_CLASS,
              isSelected && INLINE_INSERT_TARGET_SELECTED_CLASS,
              composerOpen && INLINE_INSERT_TARGET_LOCKED_CLASS,
            )}
            data-openpress-insert-before-block-id={target.blockId}
            style={rectToFixedStyle(target.rect)}
            aria-label="在此新增註解"
            key={target.blockId}
            onClick={() => inspector.selectSelection({ blockId: target.blockId, placement: "before" })}
          >
            <span className={INLINE_INSERT_TARGET_RULE_CLASS} aria-hidden="true" />
          </button>
        );
      })}

      {markerViews.map(({ markerEntry, markerLabel, markerStyle }) => {
        const markerCount = markerEntry.comments.length;
        const hasSavedComment = markerEntry.comments.length > 0;
        return (
          <button
            type="button"
            className={cn(INLINE_COMMENT_MARKER_CLASS, composerOpen && INLINE_COMMENT_MARKER_LOCKED_CLASS)}
            data-openpress-inline-comment-marker
            data-openpress-inline-comment-marker-object-id={markerEntry.target.objectId}
            data-openpress-inline-comment-marker-block-id={markerEntry.target.blockId}
            data-openpress-inline-comment-marker-placement={markerEntry.target.placement}
            data-openpress-marker-label={markerLabel}
            data-openpress-marker-state={hasSavedComment ? "saved" : "draft"}
            style={markerStyle}
            aria-label={hasSavedComment ? `編輯註解 ${markerLabel}，${markerCount} 則` : `目前選取區塊 ${markerLabel}`}
            key={objectSelectionKey(markerEntry.target) ?? markerEntry.target.placement}
            onClick={() => handleMarkerClick(markerEntry.target, markerEntry.comments)}
          >
            <span
              className={cn(
                INLINE_COMMENT_MARKER_INDEX_CLASS,
                hasSavedComment ? INLINE_COMMENT_MARKER_INDEX_SAVED_CLASS : INLINE_COMMENT_MARKER_INDEX_DRAFT_CLASS,
              )}
            >
              {markerLabel}
            </span>
          </button>
        );
      })}

      {selectionRect && selectedTarget && !markerOnly ? (
        <form
          ref={composerRef}
          className={cn(INLINE_COMMENT_COMPOSER_CLASS, !composerOpen && INLINE_COMMENT_COMPOSER_CLOSED_CLASS)}
          data-openpress-inline-comment-composer
          data-openpress-comment-placement={selectedTarget.placement}
          data-openpress-composer-open={composerOpen ? "true" : "false"}
          data-openpress-composer-saved={savedCommentForTarget ? "true" : "false"}
          style={composerStyle}
          onSubmit={(event) => void onSubmitComment(event)}
        >
          {!composerOpen ? (
            <div className={INLINE_COMMENT_COMPOSER_INTENTS_CLASS} aria-label="註解意圖">
              {visibleActionItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    className={INLINE_COMMENT_COMPOSER_INTENT_BUTTON_CLASS}
                    aria-label={item.label}
                    title={item.label}
                    key={item.action}
                    onClick={() => {
                      if (savedCommentForTarget && item.action === "delete") {
                        void onRemoveSavedComment(savedCommentForTarget);
                        return;
                      }
                      applyComposerAction(item.action);
                    }}
                  >
                    <Icon aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          ) : null}
          {composerOpen ? (
            <div className={INLINE_COMMENT_COMPOSER_BODY_CLASS}>
              <textarea
                ref={textareaRef}
                className={INLINE_COMMENT_TEXTAREA_CLASS}
                value={commentText}
                disabled={commentStatus === "submitting"}
                onChange={(event) => {
                  onCommentTextChange(event.target.value);
                  setComposerCursor(event.target.selectionStart ?? event.target.value.length);
                }}
                onClick={syncCursor}
                onKeyUp={syncCursor}
                onKeyDown={(event) => {
                  if (handleMentionKeyDown(event)) return;
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    void onSubmitComment();
                  }
                }}
                aria-label={savedCommentForTarget ? "編輯註解" : "新增註解"}
                placeholder="新增註解..."
                rows={3}
              />
              <button type="submit" className={INLINE_COMMENT_SUBMIT_CLASS} disabled={submitDisabled} aria-label="送出註解">
                <ArrowUp aria-hidden="true" />
              </button>
            </div>
          ) : null}
          {composerOpen ? (
            <MentionSuggestionList
              className={INLINE_COMMENT_SUGGESTIONS_CLASS}
              classNames={{
                item: INLINE_COMMENT_SUGGESTION_ITEM_CLASS,
                label: INLINE_COMMENT_SUGGESTION_LABEL_CLASS,
                meta: INLINE_COMMENT_SUGGESTION_META_CLASS,
              }}
              suggestions={mentionSuggestions}
              highlightedIndex={highlightedMentionIndex}
              ariaLabel={activeMention?.trigger === "/" ? "Skill suggestions" : "Mention suggestions"}
              onHighlight={setHighlightedMentionIndex}
              onSelect={insertMention}
            />
          ) : null}
          {composerOpen && commentStatusMessage ? (
            <p
              className={cn(
                INLINE_COMMENT_STATUS_CLASS,
                commentStatus === "failed" && INLINE_COMMENT_STATUS_FAILED_CLASS,
                commentStatus === "saved" && INLINE_COMMENT_STATUS_SAVED_CLASS,
              )}
              role="status"
              aria-live="polite"
              data-openpress-inspector-comment-status={commentStatus}
            >
              {commentStatusMessage}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}

function objectSelectionKey(target: ObjectSelection | null) {
  if (!target) return null;
  return `${target.objectId ?? target.blockId ?? "unknown"}:${target.placement}`;
}

function inlineCommentTargetKey(comment: InlineSavedComment) {
  return `${comment.objectId ?? comment.blockId ?? "unknown"}:${comment.placement}`;
}

function isScrollKey(event: KeyboardEvent) {
  return event.key === " "
    || event.key === "Spacebar"
    || event.key === "PageDown"
    || event.key === "PageUp"
    || event.key === "Home"
    || event.key === "End"
    || event.key === "ArrowDown"
    || event.key === "ArrowUp";
}

function compareMarkerRects(left: InspectorLayerRect, right: InspectorLayerRect) {
  const topDelta = left.top - right.top;
  if (Math.abs(topDelta) > 1) return topDelta;
  return left.left - right.left;
}

function markerLabelForEntry(
  markerEntry: InlineSavedCommentMarkerEntry,
  savedCommentLabels: Map<string, string>,
  savedCommentCount: number,
) {
  const firstComment = markerEntry.comments[0];
  if (!firstComment) return String(savedCommentCount + 1);
  if (firstComment.markerLabel) return firstComment.markerLabel;
  return savedCommentLabels.get(firstComment.id) ?? String(savedCommentCount + 1);
}

function isMarkerRectNearViewport(rect: InspectorLayerRect, margin = 48) {
  if (typeof window === "undefined") return true;
  return rect.top + rect.height >= -margin
    && rect.top <= window.innerHeight + margin
    && rect.left + rect.width >= -margin
    && rect.left <= window.innerWidth + margin;
}

export const InlineInspectorLayer = memo(InlineInspectorLayerImpl);
InlineInspectorLayer.displayName = "InlineInspectorLayer";
