import type { InspectorPlacement } from "./inspector";
import type { ObjectEntity, SourceBlock } from "../document-model";
import type { PendingCommentsStatus, InspectorCommentStatus } from "./workbenchTypes";

export function formatInspectorSelection(block: SourceBlock | null, entity?: ObjectEntity | null) {
  if (entity) return entity.label;
  if (!block) return "未選取";
  const line = block.source?.line;
  return line ? `${block.path}:${line}` : block.path;
}

export function formatInspectorCommentStatus(status: InspectorCommentStatus, error: string) {
  if (status === "submitting") return "寫入中";
  if (status === "saved") return "已寫入 source";
  if (status === "failed") return error || "寫入失敗";
  return "";
}

export function formatCommentsCount(count: number, status: PendingCommentsStatus) {
  if (status === "loading") return "正在讀取";
  if (status === "clearing") return "正在清除";
  return `${count} 則待處理`;
}

export function parseCommentHint(hint?: string) {
  if (!hint?.startsWith("openpress-react-inspector")) return null;
  const intent = hint.match(/\bintent=(add|edit|delete)\b/)?.[1];
  const placement = hint.match(/\bplacement=(block|before)\b/)?.[1] as InspectorPlacement | undefined;
  const targetObjectId = decodeHintValue(hint.match(/\btarget=([^\s]+)/)?.[1]);
  const intentLabel = intent === "add" ? "Add" : intent === "delete" ? "Remove" : "Edit";
  const placementLabel = placement === "before" ? "插入於區塊前" : "針對目前區塊";
  return { intent: intent ?? "edit", intentLabel, placement: placement ?? "block", placementLabel, targetObjectId };
}

export function formatCommentTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function decodeHintValue(value?: string) {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
