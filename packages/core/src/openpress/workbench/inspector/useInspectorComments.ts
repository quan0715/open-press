import { useCallback, useEffect, useMemo, useState, type FormEvent, type RefObject } from "react";
import type { SourceBlock } from "../../document-model";
import type { InlineSavedComment, InspectorCommentStatus, PendingCommentsStatus } from "../workbenchTypes";
import { formatInspectorCommentStatus } from "../workbenchFormatters";
import { clearInspectorComment, fetchInspectorComments } from "./inspectorModel";
import { createInspectorCommentDraft, submitInspectorComment, updateInspectorComment } from "./inspectorModel";
import type { InspectorState, PendingComment } from "./inspectorModel";
import { getInlineSavedCommentForTarget, resolveInlineSavedComment } from "./inlineCommentModel";

export interface UseInspectorCommentsOptions {
  devMode: boolean;
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
  setInspectorCommentText: (value: string) => void;
  refreshPendingComments: () => Promise<void>;
  clearPendingComment: (id: string) => Promise<void>;
  handleSubmitInspectorComment: (event?: FormEvent<HTMLFormElement>) => Promise<void>;
  handleOpenInlineSavedComment: (comment: InlineSavedComment) => void;
  handleRemoveInlineSavedComment: (comment: InlineSavedComment) => Promise<void>;
  handleSelectPendingComment: (comment: PendingComment) => void;
}

export function useInspectorComments({
  devMode,
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
    () => pendingComments.flatMap((comment, index) => (
      resolveInlineSavedComment(comment, sourceBlocksByPath)
        .map((inlineComment) => ({ ...inlineComment, markerLabel: String(index + 1) }))
    )),
    [pendingComments, sourceBlocksByPath],
  );

  const activeInlineSavedComment = getInlineSavedCommentForTarget(
    inlineSavedComments,
    inspector.selectedTarget,
    inlineSavedCommentId,
  );

  const inspectorCommentDisabled =
    !inspector.selectedBlock || !inspectorCommentText.trim() || inspectorCommentStatus === "submitting";
  // Memoize the status message so its identity is stable while only
  // composer text changes — the toolbar and other consumers that depend
  // on it can then memoize without keystrokes invalidating their cache.
  const inspectorCommentStatusMessage = useMemo(
    () => formatInspectorCommentStatus(inspectorCommentStatus, inspectorCommentError),
    [inspectorCommentStatus, inspectorCommentError],
  );

  const refreshPendingComments = useCallback(async () => {
    if (!devMode) return;
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
  }, [devMode]);

  const clearPendingComment = useCallback(async (id: string) => {
    setCommentsStatus("clearing");
    setCommentsError("");
    try {
      await clearInspectorComment({ id });
      setPendingComments((comments) => comments.filter((comment) => comment.id !== id));
      setInlineSavedCommentId((currentId) => (currentId === id ? null : currentId));
      setCommentsStatus("ready");
    } catch (error) {
      setCommentsStatus("failed");
      setCommentsError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  const handleSubmitInspectorComment = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (inspectorCommentDisabled || !inspector.selectedBlock) return;
    setInspectorCommentStatus("submitting");
    setInspectorCommentError("");
    try {
      const note = inspectorCommentText.trim();
      const placement = inspector.selectedTarget?.placement ?? "block";
      if (activeInlineSavedComment) {
        const result = await updateInspectorComment({
          id: activeInlineSavedComment.id,
          note,
          placement,
        });
        setInlineSavedCommentId(result.comment?.id ?? activeInlineSavedComment.id);
      } else {
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
      setInspectorCommentText("");
      setInspectorCommentStatus("saved");
      void refreshPendingComments();
    } catch (error) {
      setInspectorCommentStatus("failed");
      setInspectorCommentError(error instanceof Error ? error.message : String(error));
    }
  }, [
    activeInlineSavedComment,
    inspector.selectedBlock,
    inspector.selectedObjectEntity,
    inspector.selectedTarget,
    inspector.selectedTarget?.placement,
    inspectorCommentDisabled,
    inspectorCommentText,
    refreshPendingComments,
  ]);

  const handleOpenInlineSavedComment = useCallback((comment: InlineSavedComment) => {
    setInlineSavedCommentId(comment.id);
    setInspectorCommentText(comment.note);
    setInspectorCommentStatus("idle");
    setInspectorCommentError("");
  }, []);

  const handleRemoveInlineSavedComment = useCallback(async (comment: InlineSavedComment) => {
    setInspectorCommentStatus("submitting");
    setInspectorCommentError("");
    try {
      await clearInspectorComment({ id: comment.id });
      setPendingComments((comments) => comments.filter((item) => item.id !== comment.id));
      setInlineSavedCommentId((currentId) => (currentId === comment.id ? null : currentId));
      setInspectorCommentText("");
      setInspectorCommentStatus("idle");
      inspector.selectTarget(null);
      void refreshPendingComments();
    } catch (error) {
      setInspectorCommentStatus("failed");
      setInspectorCommentError(error instanceof Error ? error.message : String(error));
    }
  }, [inspector, refreshPendingComments]);

  const handleSelectPendingComment = useCallback((comment: PendingComment) => {
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
    handleOpenInlineSavedComment(inlineComment);

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
    handleOpenInlineSavedComment,
    inlineSavedComments,
    inspector,
    onSelectWorkspacePage,
    sourceBlockMap,
    sourceBlocksByPath,
    sourceContainerRef,
  ]);

  // Reset composer state when the inspector selection changes.
  useEffect(() => {
    setInspectorCommentStatus("idle");
    setInspectorCommentError("");
    setInspectorCommentText("");
  }, [inspector.selectedBlockId, inspector.selectedTarget?.placement]);

  // Drop the inline saved id if its comment is no longer reachable.
  useEffect(() => {
    if (inlineSavedCommentId && !activeInlineSavedComment) {
      setInlineSavedCommentId(null);
    }
  }, [activeInlineSavedComment, inlineSavedCommentId]);

  // Initial + dev-mode refresh of pending comments.
  useEffect(() => {
    if (!devMode) return;
    void refreshPendingComments();
  }, [devMode, refreshPendingComments]);

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
    setInspectorCommentText,
    refreshPendingComments,
    clearPendingComment,
    handleSubmitInspectorComment,
    handleOpenInlineSavedComment,
    handleRemoveInlineSavedComment,
    handleSelectPendingComment,
  };
}

function cssEscape(value: string) {
  return globalThis.CSS?.escape ? globalThis.CSS.escape(value) : value.replace(/["\\]/g, "\\$&");
}
