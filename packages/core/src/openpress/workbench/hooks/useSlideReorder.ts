import { useCallback } from "react";
import { useSourceEdit } from "./useSourceEdit";

export function useSlideReorder(
  slug: string,
  onDocumentRefresh?: () => void | Promise<void>,
) {
  const { execute } = useSourceEdit();

  const reorder = useCallback(
    (order: string[]) => {
      void execute<{ ok: boolean }>(
        { type: "slide-reorder", slug, order },
        { onSuccess: () => void onDocumentRefresh?.() },
      );
    },
    [execute, slug, onDocumentRefresh],
  );

  return { reorder };
}
