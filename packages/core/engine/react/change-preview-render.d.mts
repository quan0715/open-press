import type { ReaderDocument } from "../../src/openpress/document-model/documentTypes";

export interface RenderedChangeProposal {
  index: number;
  path: string;
  before: string;
  after: string;
  note?: string;
  feedback?: {
    decision?: "accept" | "reject" | "more-info";
    comment?: string;
  };
  matches: number;
  line?: number;
  endLine?: number;
  afterLine?: number;
  afterEndLine?: number;
}

export interface RenderedChangePreview {
  proposals: RenderedChangeProposal[];
  document?: ReaderDocument | null;
  renderError?: string;
}

export function renderChangePreview(options?: {
  root?: string;
  pressSlug?: string;
}): Promise<RenderedChangePreview | null>;

export function createChangePreviewSourceOverrides(options: {
  root?: string;
  config: {
    root: string;
    paths: { documentRoot: string };
  };
  proposals: RenderedChangeProposal[];
}): Promise<{
  proposals: RenderedChangeProposal[];
  sourceTextOverrides: Record<string, string>;
}>;
