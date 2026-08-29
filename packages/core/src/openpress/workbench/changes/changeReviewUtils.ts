import type { ChangeProposal } from "./changePreviewModel";

export interface ChangeReviewProgressStats {
  total: number;
  accepted: number;
  rejected: number;
  moreInfo: number;
  reviewed: number;
  pending: number;
  percent: number;
}

export function computeChangeReviewProgress(proposals: ChangeProposal[]): ChangeReviewProgressStats {
  const total = proposals.length;
  let accepted = 0;
  let rejected = 0;
  let moreInfo = 0;
  let reviewed = 0;

  for (const proposal of proposals) {
    const decision = proposal.feedback?.decision;
    if (decision === "accept") accepted += 1;
    else if (decision === "reject") rejected += 1;
    else if (decision === "more-info") moreInfo += 1;

    if (decision || (proposal.feedback?.comment && proposal.feedback.comment.trim().length > 0)) {
      reviewed += 1;
    }
  }

  const pending = Math.max(0, total - reviewed);
  const percent = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  return {
    total,
    accepted,
    rejected,
    moreInfo,
    reviewed,
    pending,
    percent,
  };
}

export function getAdjacentProposalIndex(
  currentIndex: number,
  total: number,
  direction: "next" | "prev",
  wrap = true,
): number {
  if (total <= 0) return 0;
  if (direction === "next") {
    if (currentIndex < total - 1) return currentIndex + 1;
    return wrap ? 0 : currentIndex;
  } else {
    if (currentIndex > 0) return currentIndex - 1;
    return wrap ? total - 1 : 0;
  }
}
