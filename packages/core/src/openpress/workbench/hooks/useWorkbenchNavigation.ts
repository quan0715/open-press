import { useCallback } from "react";
import { resolveAnchorPageIndex } from "../../document-model";
import { type DisplayPage } from "../../reader";

type SetPage = (pageIndex: number, options?: { behavior?: ScrollBehavior }) => void;

export function useWorkbenchNavigation({
  anchorPageMap,
  pages,
  setPage,
}: {
  anchorPageMap: Map<string, number>;
  pages: DisplayPage[];
  setPage: SetPage;
}) {
  const selectWorkspacePage = useCallback((pageIndex: number, options?: { behavior?: ScrollBehavior }) => {
    setPage(pageIndex, options);
  }, [setPage]);

  const selectWorkspaceAnchor = useCallback((anchorId: string, pageIndex?: number) => {
    const targetPageIndex = resolveAnchorPageIndex(anchorPageMap, pages.length, anchorId, pageIndex);
    if (targetPageIndex === null) return false;
    selectWorkspacePage(targetPageIndex, { behavior: "smooth" });
    return true;
  }, [anchorPageMap, pages.length, selectWorkspacePage]);

  return {
    selectWorkspaceAnchor,
    selectWorkspacePage,
  };
}
