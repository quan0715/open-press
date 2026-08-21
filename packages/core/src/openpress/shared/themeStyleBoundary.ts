import type { CSSProperties } from "react";

const PAGE_LAYOUT_VARIABLES = [
  "--openpress-page-width",
  "--openpress-page-height",
  "--openpress-page-aspect-ratio",
  "--openpress-page-height-ratio",
  "--openpress-page-padding",
  "--openpress-page-margin",
] as const;

/**
 * Workspace chrome only needs document geometry to size its canvas. Document
 * colors, typography, and theme tokens stay on output-only descendants.
 */
export function workspaceLayoutStyle(documentStyle: CSSProperties): CSSProperties {
  const source = documentStyle as Record<string, string | number | undefined>;
  const layout: Record<string, string | number> = {};
  for (const key of PAGE_LAYOUT_VARIABLES) {
    const value = source[key];
    if (value !== undefined) layout[key] = value;
  }
  return layout as CSSProperties;
}
