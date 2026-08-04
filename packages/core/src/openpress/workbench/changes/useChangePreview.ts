import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchChangePreview,
  saveChangeProposalFeedback,
  type ChangePreview,
  type ChangeProposal,
  type ChangeProposalFeedback,
} from "./changePreviewModel";

export type ChangePreviewStatus = "idle" | "loading" | "empty" | "ready" | "failed";

export function useChangePreview({
  workspaceMode,
  pressSlug,
}: {
  workspaceMode: boolean;
  pressSlug?: string | null;
}) {
  const [preview, setPreview] = useState<ChangePreview | null>(null);
  const [status, setStatus] = useState<ChangePreviewStatus>("idle");
  const [error, setError] = useState("");
  const refreshVersionRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!workspaceMode) return;
    const refreshVersion = ++refreshVersionRef.current;
    setStatus("loading");
    setError("");
    try {
      const nextPreview = await fetchChangePreview({ pressSlug });
      if (refreshVersionRef.current !== refreshVersion) return;
      setPreview(nextPreview);
      setStatus(nextPreview?.proposals.length ? "ready" : "empty");
    } catch (nextError) {
      if (refreshVersionRef.current !== refreshVersion) return;
      setPreview(null);
      setStatus("failed");
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    }
  }, [pressSlug, workspaceMode]);

  useEffect(() => {
    if (!workspaceMode) {
      refreshVersionRef.current += 1;
      setPreview(null);
      setStatus("idle");
      setError("");
      return undefined;
    }
    void refresh();
    const handleFocus = () => void refresh();
    window.addEventListener("focus", handleFocus);
    return () => {
      refreshVersionRef.current += 1;
      window.removeEventListener("focus", handleFocus);
    };
  }, [refresh, workspaceMode]);

  const saveFeedback = useCallback(async (
    proposal: Pick<ChangeProposal, "index" | "path" | "before" | "after">,
    feedback?: ChangeProposalFeedback,
  ) => {
    const savedFeedback = await saveChangeProposalFeedback({ proposal, feedback });
    setPreview((current) => current
      ? {
          ...current,
          proposals: current.proposals.map((item) => item.index === proposal.index
            && item.path === proposal.path
            && item.before === proposal.before
            && item.after === proposal.after
            ? { ...item, feedback: savedFeedback }
            : item),
        }
      : current);
  }, []);

  return { preview, status, error, refresh, saveFeedback };
}
