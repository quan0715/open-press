// Anchor → page-index resolution shared between the public viewer and
// the workbench. Lives in its own module so React Fast Refresh can keep
// `PublicPage` / `HtmlWorkbench` HMR-clean (Fast Refresh expects component
// files to export only components).

import type { DisplayPage } from "../reader";

export function createAnchorPageMap(pages: DisplayPage[]) {
  const map = new Map<string, number>();
  pages.forEach((page, index) => {
    page.anchors?.forEach((anchor) => {
      if (anchor && !map.has(anchor)) map.set(anchor, index);
    });
  });
  return map;
}

export function resolveAnchorPageIndex(
  anchorPageMap: Map<string, number>,
  pageCount: number,
  anchorId: string,
  pageIndex?: number,
): number | null {
  if (typeof pageIndex === "number" && Number.isInteger(pageIndex) && pageIndex >= 0 && pageIndex < pageCount) return pageIndex;
  const mapped = anchorPageMap.get(anchorId);
  return mapped === undefined ? null : mapped;
}
