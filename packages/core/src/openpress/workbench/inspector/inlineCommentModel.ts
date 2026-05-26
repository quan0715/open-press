import type { ObjectSelection, PendingComment } from "./inspectorModel";
import type { SourceBlock } from "../../document-model";
import { parseCommentHint } from "../workbenchFormatters";
import type { InlineSavedComment, InlineSavedCommentMarkerEntry } from "../workbenchTypes";

export function getInlineSavedCommentForTarget(
  comments: InlineSavedComment[],
  target: ObjectSelection | null,
  preferredId?: string | null,
) {
  if (!target) return null;
  const targetKey = objectSelectionKey(target);
  const targetComments = comments.filter((comment) => inlineCommentTargetKey(comment) === targetKey);
  if (!targetComments.length) return null;
  if (preferredId) {
    const preferred = targetComments.find((comment) => comment.id === preferredId);
    if (preferred) return preferred;
  }
  return targetComments[0] ?? null;
}

export function getInlineSavedCommentMarkers(comments: InlineSavedComment[]) {
  const markerMap = new Map<string, InlineSavedCommentMarkerEntry>();

  for (const comment of comments) {
    const target: ObjectSelection = {
      objectId: comment.objectId,
      blockId: comment.blockId,
      placement: comment.placement,
    };
    const key = objectSelectionKey(target);
    if (!key) continue;
    const bucket = markerMap.get(key);
    if (bucket) {
      bucket.comments.push(comment);
    } else {
      markerMap.set(key, { target, comments: [comment] });
    }
  }

  return Array.from(markerMap.values()).map((entry) => ({
    ...entry,
    comments: [...entry.comments],
  })).sort((left, right) => {
    const leftId = left.target.objectId ?? left.target.blockId ?? "";
    const rightId = right.target.objectId ?? right.target.blockId ?? "";
    if (leftId === rightId) {
      if (left.target.placement === right.target.placement) return 0;
      return left.target.placement === "before" ? -1 : 1;
    }
    return leftId.localeCompare(rightId, "zh-Hant");
  });
}

export function resolveInlineSavedComment(comment: PendingComment, sourceBlocksByPath: Record<string, SourceBlock[]>) {
  const target = resolveInlineSavedCommentTarget(comment, sourceBlocksByPath);
  if (!target) return [];
  const hintMeta = parseCommentHint(comment.hint);
  return [{
    id: comment.id,
    objectId: hintMeta?.targetObjectId,
    blockId: target.id,
    placement: hintMeta?.placement ?? "block",
    note: comment.note,
    path: comment.path,
    line: comment.line,
    timestamp: comment.timestamp,
  }];
}

function objectSelectionKey(target: ObjectSelection | null) {
  if (!target) return null;
  return `${target.objectId ?? target.blockId ?? "unknown"}\u0000${target.placement}`;
}

function inlineCommentTargetKey(comment: InlineSavedComment) {
  return `${comment.objectId ?? comment.blockId ?? "unknown"}\u0000${comment.placement}`;
}

export function groupSourceBlocksByPath(sourceBlockMap: Record<string, SourceBlock>) {
  const grouped = Object.values(sourceBlockMap).reduce<Record<string, SourceBlock[]>>((accumulator, sourceBlock) => {
    const path = normalizeSourcePath(sourceBlock.path);
    if (!path) return accumulator;
    if (!accumulator[path]) accumulator[path] = [];
    accumulator[path].push(sourceBlock);
    return accumulator;
  }, {});

  Object.values(grouped).forEach((blocks) => {
    blocks.sort((left, right) => {
      const leftLine = left.source?.line ?? Number.POSITIVE_INFINITY;
      const rightLine = right.source?.line ?? Number.POSITIVE_INFINITY;
      if (leftLine === rightLine) return left.id.localeCompare(right.id, "zh-Hant");
      return leftLine - rightLine;
    });
  });

  return grouped;
}

function resolveInlineSavedCommentTarget(comment: PendingComment, sourceBlocksByPath: Record<string, SourceBlock[]>) {
  if (!comment.path || !comment.line) return null;
  const commentPath = normalizeSourcePath(comment.path);
  const candidateBlocks = sourceBlocksByPath[commentPath];
  if (!candidateBlocks?.length) return null;

  const normalizedLine = Number(comment.line);
  if (!Number.isInteger(normalizedLine) || normalizedLine < 1) return null;

  let selectedBlock: SourceBlock | null = null;
  for (const block of candidateBlocks) {
    if (typeof block.source?.line !== "number") continue;
    if (block.source.line <= normalizedLine) {
      selectedBlock = block;
      continue;
    }
    break;
  }
  if (selectedBlock) return selectedBlock;
  return candidateBlocks[0] ?? null;
}

function normalizeSourcePath(value: string) {
  return value.trim().replaceAll("\\", "/").replace(/^\.\//, "").replace(/^document\//, "");
}
