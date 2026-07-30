import type { ReaderDocument } from "../../document-model";
import { localMutationHeaders } from "../localMutationRequest";

export type ChangeProposalDecision = "accept" | "reject" | "more-info";

export interface ChangeProposalFeedback {
  decision?: ChangeProposalDecision;
  comment?: string;
}

export interface ChangeProposal {
  index: number;
  path: string;
  before: string;
  after: string;
  note?: string;
  feedback?: ChangeProposalFeedback;
  matches: number;
  line?: number;
  endLine?: number;
  afterLine?: number;
  afterEndLine?: number;
}

export interface ChangePreview {
  proposals: ChangeProposal[];
  document?: ReaderDocument | null;
  renderError?: string;
}

interface ChangePreviewResponse {
  ok: boolean;
  preview?: ChangePreview | null;
  message?: string;
}

interface ChangeFeedbackResponse {
  ok: boolean;
  proposal?: {
    index: number;
    feedback?: ChangeProposalFeedback;
  };
  message?: string;
}

export async function fetchChangePreview({
  pressSlug,
  endpoint = "/__openpress/change-preview",
  fetchImpl = globalThis.fetch?.bind(globalThis),
}: {
  pressSlug?: string | null;
  endpoint?: string;
  fetchImpl?: typeof fetch;
} = {}): Promise<ChangePreview | null> {
  if (typeof fetchImpl !== "function") throw new Error("OpenPress change preview endpoint is unavailable.");
  const requestEndpoint = pressSlug?.trim()
    ? `${endpoint}${endpoint.includes("?") ? "&" : "?"}press=${encodeURIComponent(pressSlug.trim())}`
    : endpoint;
  const response = await fetchImpl(requestEndpoint);
  const result = await response.json().catch(() => null) as ChangePreviewResponse | null;
  if (!response.ok) {
    throw new Error(result?.message ?? `OpenPress change preview failed with status ${response.status}`);
  }
  return result?.preview && Array.isArray(result.preview.proposals) ? result.preview : null;
}

export async function saveChangeProposalFeedback({
  proposal,
  feedback,
  endpoint = "/__openpress/change-preview",
  fetchImpl = globalThis.fetch?.bind(globalThis),
}: {
  proposal: Pick<ChangeProposal, "index" | "path" | "before" | "after">;
  feedback?: ChangeProposalFeedback;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}): Promise<ChangeProposalFeedback | undefined> {
  if (typeof fetchImpl !== "function") throw new Error("OpenPress change feedback endpoint is unavailable.");
  const response = await fetchImpl(endpoint, {
    method: "PATCH",
    headers: localMutationHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      index: proposal.index,
      path: proposal.path,
      before: proposal.before,
      after: proposal.after,
      feedback: feedback ?? {},
    }),
  });
  const result = await response.json().catch(() => null) as ChangeFeedbackResponse | null;
  if (!response.ok) {
    throw new Error(result?.message ?? `OpenPress change feedback failed with status ${response.status}`);
  }
  return result?.proposal?.feedback;
}
