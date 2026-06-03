import { useCallback } from "react";
import { resolveAnchorPageIndex } from "../../document-model";
import { PUBLIC_DRAWER_BREAKPOINT, type DisplayPage } from "../../reader";

type SetPage = (pageIndex: number, options?: { behavior?: ScrollBehavior }) => void;

export function useWorkbenchNavigation({
  anchorPageMap,
  pages,
  rightPanelOpen,
  setPage,
  toggleRightPanel,
}: {
  anchorPageMap: Map<string, number>;
  pages: DisplayPage[];
  rightPanelOpen: boolean;
  setPage: SetPage;
  toggleRightPanel: () => void;
}) {
  const selectWorkspacePage = useCallback((pageIndex: number, options?: { behavior?: ScrollBehavior }) => {
    setPage(pageIndex, options);
    if (
      typeof window !== "undefined"
      && window.innerWidth < PUBLIC_DRAWER_BREAKPOINT
      && rightPanelOpen
    ) {
      toggleRightPanel();
    }
  }, [rightPanelOpen, setPage, toggleRightPanel]);

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
