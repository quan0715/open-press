import type { CSSProperties } from "react";
import type { ObjectSelection } from "./inspectorModel";
import { clampNumber } from "../../shared";
import type { InspectorInsertTargetView, InspectorLayerRect } from "../workbenchTypes";

export const INSPECTOR_MARKER_RAIL_WIDTH = 36;
const INSPECTOR_MARKER_MIN_HEIGHT = 32;
const INSPECTOR_MARKER_VIEWPORT_PADDING = 8;

export function collectInspectorBlockElements(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-openpress-block-id]")).filter((element) => {
    if (!element.dataset.openpressBlockId) return false;
    if (element.parentElement?.closest("[data-openpress-block-id]")) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

export function createInspectorInsertTargets(elements: HTMLElement[]): InspectorInsertTargetView[] {
  const targets: InspectorInsertTargetView[] = [];
  const seen = new Set<string>();

  for (let index = 1; index < elements.length; index += 1) {
    const previous = elements[index - 1];
    const current = elements[index];
    const blockId = current.dataset.openpressBlockId;
    if (!blockId || seen.has(blockId)) continue;

    const previousPage = previous.closest<HTMLElement>(".openpress-html-page");
    const currentPage = current.closest<HTMLElement>(".openpress-html-page");
    if (!previousPage || previousPage !== currentPage) continue;

    const previousRect = previous.getBoundingClientRect();
    const currentRect = current.getBoundingClientRect();
    const gap = currentRect.top - previousRect.bottom;
    if (gap < 10) continue;

    const pageRect = currentPage.getBoundingClientRect();
    const inset = Math.min(56, Math.max(20, pageRect.width * 0.07));
    const height = Math.min(28, Math.max(14, gap - 4));
    const rect = {
      top: previousRect.bottom + ((gap - height) / 2),
      left: pageRect.left + inset,
      width: Math.max(96, pageRect.width - (inset * 2)),
      height,
    };
    if (!isInspectorRectNearViewport(rect)) continue;

    targets.push({ blockId, rect });
    seen.add(blockId);
  }

  return targets;
}

export function resolveInspectorSelectionRect(
  root: HTMLElement,
  target: ObjectSelection | null,
  insertTargets: InspectorInsertTargetView[],
): InspectorLayerRect | null {
  if (!target) return null;
  if (target.placement === "before" && target.blockId) {
    const insertTarget = insertTargets.find((item) => item.blockId === target.blockId);
    if (insertTarget) return insertTarget.rect;
    const block = findInspectorBlockElement(root, target.blockId);
    if (!block) return null;
    const rect = block.getBoundingClientRect();
    return {
      top: rect.top - 22,
      left: rect.left,
      width: rect.width,
      height: 22,
    };
  }

  const selector = target.objectId
    ? `[data-openpress-object-id="${cssEscape(target.objectId)}"]`
    : target.blockId
      ? `[data-openpress-block-id="${cssEscape(target.blockId)}"]`
      : "";
  const element = selector ? root.querySelector<HTMLElement>(selector) : null;
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

export function findInspectorBlockElement(root: HTMLElement, blockId: string) {
  return collectInspectorBlockElements(root).find((element) => element.dataset.openpressBlockId === blockId) ?? null;
}

export function syncInspectorSelectedBlock(root: HTMLElement, target: ObjectSelection | null) {
  root.querySelectorAll<HTMLElement>('[data-openpress-inspector-selected="true"]').forEach((element) => {
    delete element.dataset.openpressInspectorSelected;
  });
  if (!target || target.placement !== "block") return;
  const selected = target.objectId
    ? root.querySelector<HTMLElement>(`[data-openpress-object-id="${cssEscape(target.objectId)}"]`)
    : target.blockId
      ? findInspectorBlockElement(root, target.blockId)
      : null;
  if (selected) selected.dataset.openpressInspectorSelected = "true";
}

export function rectToFixedStyle(rect: InspectorLayerRect): CSSProperties {
  return {
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
}

export function createInspectorComposerStyle(rect: InspectorLayerRect, expanded: boolean): CSSProperties {
  if (typeof window === "undefined") return {};
  const targetWidth = expanded ? 460 : 292;
  const width = Math.min(targetWidth, Math.max(240, window.innerWidth - 32));
  const preferredLeft = rect.left + (rect.width / 2) - (width / 2);
  const left = clampNumber(preferredLeft, 16, Math.max(16, window.innerWidth - width - 16));
  const topAbove = rect.top - 66;
  const top = topAbove > 12 ? topAbove : rect.top + rect.height + 14;
  return {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
  };
}

export function createInspectorMarkerStyle(rect: InspectorLayerRect): CSSProperties {
  if (typeof window === "undefined") return {};
  const height = Math.max(INSPECTOR_MARKER_MIN_HEIGHT, rect.height);
  const maxTop = Math.max(INSPECTOR_MARKER_VIEWPORT_PADDING, window.innerHeight - height - INSPECTOR_MARKER_VIEWPORT_PADDING);
  const maxLeft = Math.max(
    INSPECTOR_MARKER_VIEWPORT_PADDING,
    window.innerWidth - INSPECTOR_MARKER_RAIL_WIDTH - INSPECTOR_MARKER_VIEWPORT_PADDING,
  );

  return {
    top: `${clampNumber(rect.top, INSPECTOR_MARKER_VIEWPORT_PADDING, maxTop)}px`,
    left: `${clampNumber(rect.left - INSPECTOR_MARKER_RAIL_WIDTH, INSPECTOR_MARKER_VIEWPORT_PADDING, maxLeft)}px`,
    width: `${INSPECTOR_MARKER_RAIL_WIDTH}px`,
    height: `${height}px`,
  };
}

function isInspectorRectNearViewport(rect: InspectorLayerRect, margin = 240) {
  if (typeof window === "undefined") return true;
  return rect.top + rect.height >= -margin
    && rect.top <= window.innerHeight + margin
    && rect.left + rect.width >= -margin
    && rect.left <= window.innerWidth + margin;
}

function cssEscape(value: string) {
  return globalThis.CSS?.escape ? globalThis.CSS.escape(value) : value.replace(/["\\]/g, "\\$&");
}
