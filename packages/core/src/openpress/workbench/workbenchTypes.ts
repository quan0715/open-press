import type { InspectorPlacement, ObjectSelection } from "./inspector/inspectorModel";

export type DeployStatus = "idle" | "deploying" | "deployed" | "unavailable" | "failed" | "setup";
export type PdfActionStatus = "idle" | "generating" | "opening" | "failed";
export type InspectorCommentStatus = "idle" | "submitting" | "saved" | "failed";
export type PendingCommentsStatus = "idle" | "loading" | "ready" | "failed" | "clearing";

export interface InlineSavedComment {
  id: string;
  objectId?: string;
  blockId?: string;
  placement: InspectorPlacement;
  note: string;
  path?: string;
  line?: number;
  timestamp?: string;
  markerLabel?: string;
}

export interface InlineSavedCommentMarkerEntry {
  target: ObjectSelection;
  comments: InlineSavedComment[];
}

export interface InspectorLayerRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface InspectorInsertTargetView {
  blockId: string;
  rect: InspectorLayerRect;
}
