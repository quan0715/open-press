import type { InspectorPlacement } from "./inspector";
import type { ObjectEntity, SourceBlock, Theme } from "../document-model";
import type { PendingCommentsStatus, InspectorCommentStatus } from "./workbenchTypes";

export type PageGeometrySpec = {
  label: string;
  dimensions: string;
  title: string;
};

const DEFAULT_PAGE_GEOMETRY = {
  pageWidth: "210mm",
  pageHeight: "297mm",
};

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

export function formatPageGeometrySpec(theme?: Pick<Theme, "pageLabel" | "pageWidth" | "pageHeight">): PageGeometrySpec {
  const width = parseCssLength(theme?.pageWidth ?? DEFAULT_PAGE_GEOMETRY.pageWidth);
  const height = parseCssLength(theme?.pageHeight ?? DEFAULT_PAGE_GEOMETRY.pageHeight);
  const dimensions = formatLengthPair(width, height);
  const label = theme?.pageLabel?.trim() || pageGeometryLabel(width, height);

  return {
    label,
    dimensions,
    title: `${label} · ${dimensions}`,
  };
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

function pageGeometryLabel(width: CssLength, height: CssLength) {
  if (matchesPageSize(width, height, "210", "297", "mm")) return "A4 Page";
  if (matchesPageSize(width, height, "176", "250", "mm")) return "B5 Page";
  if (matchesPageSize(width, height, "215.9", "279.4", "mm")) return "Letter Page";
  if (isSixteenByNine(width, height)) return "16:9 Page";
  return "Custom Page";
}

type CssLength = {
  raw: string;
  value: string | null;
  unit: string | null;
};

function parseCssLength(value: string): CssLength {
  const raw = value.trim();
  const match = raw.match(/^(-?\d+(?:\.\d+)?)([a-z%]+)$/i);
  if (!match) return { raw, value: null, unit: null };
  return { raw, value: trimTrailingZeroes(match[1]), unit: match[2] };
}

function formatLengthPair(width: CssLength, height: CssLength) {
  if (width.value && height.value && width.unit && width.unit === height.unit) {
    return `${width.value} × ${height.value} ${width.unit}`;
  }
  return `${width.raw} × ${height.raw}`;
}

function matchesPageSize(width: CssLength, height: CssLength, targetWidth: string, targetHeight: string, unit: string) {
  return width.value === targetWidth && height.value === targetHeight && width.unit === unit && height.unit === unit;
}

function isSixteenByNine(width: CssLength, height: CssLength) {
  if (!width.value || !height.value || !width.unit || width.unit !== height.unit) return false;
  const ratio = Number(width.value) / Number(height.value);
  return ratio > 1 && Math.abs(ratio - (16 / 9)) < 0.02;
}

function decodeHintValue(value?: string) {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function trimTrailingZeroes(value: string) {
  return value.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}
