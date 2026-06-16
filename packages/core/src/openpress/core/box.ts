import type { CSSProperties } from "react";
import type { FixedBox, FixedBoxLength } from "./types";

export function createFixedBoxStyle(box: FixedBox | undefined): CSSProperties | undefined {
  if (!box) return undefined;
  const style: CSSProperties = { position: "absolute" };
  if (box.x !== undefined) style.left = normalizeFixedBoxLength(box.x);
  if (box.y !== undefined) style.top = normalizeFixedBoxLength(box.y);
  if (box.w !== undefined) style.width = normalizeFixedBoxLength(box.w);
  if (box.h !== undefined) style.height = normalizeFixedBoxLength(box.h);
  return style;
}

export function mergeFixedBoxStyle(
  box: FixedBox | undefined,
  style: CSSProperties | undefined,
): CSSProperties | undefined {
  const boxStyle = createFixedBoxStyle(box);
  if (!boxStyle) return style;
  return { ...boxStyle, ...style };
}

function normalizeFixedBoxLength(value: FixedBoxLength): string {
  return typeof value === "number" ? `${value}px` : value;
}
