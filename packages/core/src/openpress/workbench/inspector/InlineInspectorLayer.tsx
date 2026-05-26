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
      className="openpress-inline-inspector-layer"
      data-openpress-inline-inspector-layer
      data-openpress-composer-lock-events={composerOpen ? "true" : "false"}
    >
      {insertTargets.map((target) => {
        const isSelected = selectedTarget?.blockId === target.blockId && selectedTarget.placement === "before";
        return (
          <button
            type="button"
            className={`openpress-inline-insert-target${isSelected ? " is-selected" : ""}`}
            data-openpress-insert-before-block-id={target.blockId}
            style={rectToFixedStyle(target.rect)}
            aria-label="在此新增註解"
            key={target.blockId}
            onClick={() => inspector.selectSelection({ blockId: target.blockId, placement: "before" })}
          />
        );
      })}

      {markerViews.map(({ markerEntry, markerLabel, markerStyle }) => {
        const markerCount = markerEntry.comments.length;
        const hasSavedComment = markerEntry.comments.length > 0;
        return (
          <button
            type="button"
            className="openpress-inline-comment-marker"
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
            <span className="openpress-inline-comment-marker__index">{markerLabel}</span>
          </button>
        );
      })}

      {selectionRect && selectedTarget && !markerOnly ? (
        <form
          ref={composerRef}
          className="openpress-inline-comment-composer"
          data-openpress-inline-comment-composer
          data-openpress-comment-placement={selectedTarget.placement}
          data-openpress-composer-open={composerOpen ? "true" : "false"}
          data-openpress-composer-saved={savedCommentForTarget ? "true" : "false"}
          style={composerStyle}
          onSubmit={(event) => void onSubmitComment(event)}
        >
          {!composerOpen ? (
            <div className="openpress-inline-comment-composer__intents" aria-label="註解意圖">
              {visibleActionItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
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
            <div className="openpress-inline-comment-composer__body">
              <textarea
                ref={textareaRef}
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
              <button type="submit" disabled={submitDisabled} aria-label="送出註解">
                <ArrowUp aria-hidden="true" />
              </button>
            </div>
          ) : null}
          {composerOpen ? (
            <MentionSuggestionList
              className="openpress-inline-comment-composer__suggestions"
              suggestions={mentionSuggestions}
              highlightedIndex={highlightedMentionIndex}
              ariaLabel={activeMention?.trigger === "/" ? "Skill suggestions" : "Mention suggestions"}
              onHighlight={setHighlightedMentionIndex}
              onSelect={insertMention}
            />
          ) : null}
          {composerOpen && commentStatusMessage ? (
            <p role="status" aria-live="polite" data-openpress-inspector-comment-status={commentStatus}>
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
