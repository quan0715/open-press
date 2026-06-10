import { useCallback } from "react";
import { useSourceEdit } from "./useSourceEdit";

type SlideMutationResponse = {
  ok: boolean;
  slide?: { id: string };
  document?: { path: string; pageCount: number };
};

export function useSlideActions(
  slug: string,
  onDocumentRefresh?: () => void | Promise<void>,
) {
  const { execute } = useSourceEdit();

  const handleSuccess = useCallback(
    async () => {
      await onDocumentRefresh?.();
    },
    [onDocumentRefresh],
  );

  const reorder = useCallback(
    (order: string[]) => {
      void execute<SlideMutationResponse>(
        { type: "slide-reorder", slug, order },
        { onSuccess: handleSuccess },
      );
    },
    [execute, handleSuccess, slug],
  );

  const add = useCallback(
    (id?: string) => {
      void execute<SlideMutationResponse>(
        { type: "slide-add", slug, id },
        { onSuccess: handleSuccess },
      );
    },
    [execute, handleSuccess, slug],
  );

  const remove = useCallback(
    (id: string) => {
      void execute<SlideMutationResponse>(
        { type: "slide-remove", slug, id },
        { onSuccess: handleSuccess },
      );
    },
    [execute, handleSuccess, slug],
  );

  const skip = useCallback(
    (id: string) => {
      void execute<SlideMutationResponse>(
        { type: "slide-skip", slug, id },
        { onSuccess: handleSuccess },
      );
    },
    [execute, handleSuccess, slug],
  );

  const unskip = useCallback(
    (id: string) => {
      void execute<SlideMutationResponse>(
        { type: "slide-unskip", slug, id },
        { onSuccess: handleSuccess },
      );
    },
    [execute, handleSuccess, slug],
  );

  const unskipMany = useCallback(
    (ids: string[]) => {
      void execute<SlideMutationResponse>(
        { type: "slide-unskip-many", slug, ids },
        { onSuccess: handleSuccess },
      );
    },
    [execute, handleSuccess, slug],
  );

  return { add, remove, reorder, skip, unskip, unskipMany };
}
