import { useCallback, useEffect, useMemo, useState, type FormEvent, type RefObject } from "react";
import type { SourceBlock } from "../../document-model";
import type { InlineSavedComment, InspectorCommentStatus, PendingCommentsStatus } from "../workbenchTypes";
import { formatInspectorCommentStatus, parseCommentHint } from "../workbenchFormatters";
import { clearInspectorComment, fetchInspectorComments } from "./inspectorModel";
import { createInspectorCommentDraft, submitInspectorComment, updateInspectorComment } from "./inspectorModel";
import type { InspectorState, PendingComment } from "./inspectorModel";
import { getInlineSavedCommentForTarget, resolveInlineSavedComment } from "./inlineCommentModel";

export interface UseInspectorCommentsOptions {
  workspaceMode: boolean;
  inspector: InspectorState;
  sourceBlockMap: Record<string, SourceBlock>;
  sourceBlocksByPath: Record<string, SourceBlock[]>;
  sourceContainerRef: RefObject<HTMLDivElement | null>;
  onSelectWorkspacePage: (pageIndex: number, options?: { behavior?: ScrollBehavior }) => void;
}

export interface InspectorComments {
  pendingComments: PendingComment[];
  commentsStatus: PendingCommentsStatus;
  commentsError: string;
  inspectorCommentText: string;
  inspectorCommentStatus: InspectorCommentStatus;
  inspectorCommentStatusMessage: string;
  inspectorCommentDisabled: boolean;
  inlineSavedComments: InlineSavedComment[];
  activeInlineSavedComment: InlineSavedComment | null;
  activeCommentId: string | null;
  setInspectorCommentText: (value: string) => void;
  refreshPendingComments: () => Promise<void>;
  clearPendingComment: (id: string) => Promise<void>;
  handleSubmitInspectorComment: (event?: FormEvent<HTMLFormElement>) => Promise<void>;
  handleSelectPendingComment: (comment: PendingComment) => void;
}

export function useInspectorComments({
  workspaceMode,
  inspector,
  sourceBlockMap,
  sourceBlocksByPath,
  sourceContainerRef,
  onSelectWorkspacePage,
}: UseInspectorCommentsOptions): InspectorComments {
  const [inspectorCommentText, setInspectorCommentText] = useState("");
  const [inspectorCommentStatus, setInspectorCommentStatus] = useState<InspectorCommentStatus>("idle");
  const [inspectorCommentError, setInspectorCommentError] = useState("");
  const [inlineSavedCommentId, setInlineSavedCommentId] = useState<string | null>(null);
  const [pendingComments, setPendingComments] = useState<PendingComment[]>([]);
  const [commentsStatus, setCommentsStatus] = useState<PendingCommentsStatus>("idle");
  const [commentsError, setCommentsError] = useState("");

  const inlineSavedComments = useMemo(
    () => pendingComments.flatMap((comment) => resolveInlineSavedComment(comment, sourceBlocksByPath)),
    [pendingComments, sourceBlocksByPath],
  );

  const activeInlineSavedComment = getInlineSavedCommentForTarget(
    inlineSavedComments,
    inspector.selectedTarget,
    inlineSavedCommentId,
  );
  const activePendingComment = inlineSavedCommentId
    ? pendingComments.find((comment) => comment.id === inlineSavedCommentId) ?? null
    : null;

  const inspectorCommentDisabled =
    (!activePendingComment && !inspector.selectedBlock)
    || !inspectorCommentText.trim()
    || inspectorCommentStatus === "submitting";
  // Memoize the status message so its identity is stable while only
  // composer text changes — the toolbar and other consumers that depend
  // on it can then memoize without keystrokes invalidating their cache.
  const inspectorCommentStatusMessage = useMemo(
    () => formatInspectorCommentStatus(inspectorCommentStatus, inspectorCommentError),
    [inspectorCommentStatus, inspectorCommentError],
  );

  const refreshPendingComments = useCallback(async () => {
    if (!workspaceMode) return;
    setCommentsStatus("loading");
    setCommentsError("");
    try {
      const comments = await fetchInspectorComments();
      setPendingComments(comments);
      setCommentsStatus("ready");
    } catch (error) {
      setCommentsStatus("failed");
      setCommentsError(error instanceof Error ? error.message : String(error));
    }
  }, [workspaceMode]);

  const clearPendingComment = useCallback(async (id: string) => {
    setCommentsStatus("clearing");
    setCommentsError("");
    try {
      await clearInspectorComment({ id });
      setPendingComments((comments) => comments.filter((comment) => comment.id !== id));
      setInlineSavedCommentId((currentId) => (currentId === id ? null : currentId));
      setInspectorCommentText("");
      setInspectorCommentStatus("idle");
      setInspectorCommentError("");
      setCommentsStatus("ready");
    } catch (error) {
      setCommentsStatus("failed");
      setCommentsError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  const handleSubmitInspectorComment = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (inspectorCommentDisabled || (!activePendingComment && !inspector.selectedBlock)) return;
    setInspectorCommentStatus("submitting");
    setInspectorCommentError("");
    try {
      const note = inspectorCommentText.trim();
      const placement = activeInlineSavedComment?.placement
        ?? parseCommentHint(activePendingComment?.hint)?.placement
        ?? inspector.selectedTarget?.placement
        ?? "block";
      if (activePendingComment) {
        const result = await updateInspectorComment({
          id: activePendingComment.id,
          note,
          placement,
        });
        setInlineSavedCommentId(result.comment?.id ?? activePendingComment.id);
      } else {
        if (!inspector.selectedBlock) return;
        const draft = createInspectorCommentDraft({
          block: inspector.selectedBlock,
          entity: inspector.selectedObjectEntity,
          target: inspector.selectedTarget,
          note,
          placement,
        });
        const result = await submitInspectorComment({ draft });
        if (result.comment?.id) {
          setInlineSavedCommentId(result.comment.id);
        }
      }
      setInspectorCommentText(note);
      setInspectorCommentStatus("saved");
      void refreshPendingComments();
    } catch (error) {
      setInspectorCommentStatus("failed");
      setInspectorCommentError(error instanceof Error ? error.message : String(error));
    }
  }, [
    activePendingComment,
    activeInlineSavedComment,
    inspector.selectedBlock,
    inspector.selectedObjectEntity,
    inspector.selectedTarget,
    inspector.selectedTarget?.placement,
    inspectorCommentDisabled,
    inspectorCommentText,
    refreshPendingComments,
  ]);

  const handleSelectPendingComment = useCallback((comment: PendingComment) => {
    setInlineSavedCommentId(comment.id);
    setInspectorCommentText(comment.note);
    setInspectorCommentStatus("idle");
    setInspectorCommentError("");

    const inlineComment = inlineSavedComments.find((item) => item.id === comment.id)
      ?? resolveInlineSavedComment(comment, sourceBlocksByPath)[0];
    if (!inlineComment?.blockId) return;

    const sourceBlock = sourceBlockMap[inlineComment.blockId];
    if (typeof sourceBlock?.pageIndex === "number") {
      onSelectWorkspacePage(sourceBlock.pageIndex, { behavior: "smooth" });
    }

    inspector.selectSelection({
      objectId: inlineComment.objectId,
      blockId: inlineComment.blockId,
      placement: inlineComment.placement,
    });

    window.requestAnimationFrame(() => {
      const selector = inlineComment.objectId
        ? `[data-openpress-object-id="${cssEscape(inlineComment.objectId)}"]`
        : `[data-openpress-block-id="${cssEscape(inlineComment.blockId!)}"]`;
      sourceContainerRef.current?.querySelector<HTMLElement>(selector)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [
    inlineSavedComments,
    inspector,
    onSelectWorkspacePage,
    sourceBlockMap,
    sourceBlocksByPath,
    sourceContainerRef,
  ]);

  // Keep the floating editor aligned with the selected source target.
  useEffect(() => {
    const selectedComment = getInlineSavedCommentForTarget(
      inlineSavedComments,
      inspector.selectedTarget,
    );
    setInspectorCommentStatus("idle");
    setInspectorCommentError("");
    setInlineSavedCommentId(selectedComment?.id ?? null);
    setInspectorCommentText(selectedComment?.note ?? "");
  }, [
    inlineSavedComments,
    inspector.selectedBlockId,
    inspector.selectedTarget?.objectId,
    inspector.selectedTarget?.placement,
  ]);

  // Drop the active id only after its pending comment has actually been removed.
  useEffect(() => {
    if (inlineSavedCommentId && !pendingComments.some((comment) => comment.id === inlineSavedCommentId)) {
      setInlineSavedCommentId(null);
    }
  }, [inlineSavedCommentId, pendingComments]);

  // Initial + dev-mode refresh of pending comments.
  useEffect(() => {
    if (!workspaceMode) return;
    void refreshPendingComments();
  }, [workspaceMode, refreshPendingComments]);

  return {
    pendingComments,
    commentsStatus,
    commentsError,
    inspectorCommentText,
    inspectorCommentStatus,
    inspectorCommentStatusMessage,
    inspectorCommentDisabled,
    inlineSavedComments,
    activeInlineSavedComment,
    activeCommentId: activePendingComment?.id ?? null,
    setInspectorCommentText,
    refreshPendingComments,
    clearPendingComment,
    handleSubmitInspectorComment,
    handleSelectPendingComment,
  };
}

function cssEscape(value: string) {
  return globalThis.CSS?.escape ? globalThis.CSS.escape(value) : value.replace(/["\\]/g, "\\$&");
}
