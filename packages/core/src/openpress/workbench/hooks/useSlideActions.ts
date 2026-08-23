import { useCallback } from "react";
import type { DocumentRefreshOptions } from "../../document-model";
import { useSourceEdit } from "./useSourceEdit";

type SlideMutationResponse = {
  ok: boolean;
  slide?: { id: string; notes?: string };
  document?: { path: string; pageCount: number; renderId?: string };
};

type SlideAddOptions = string | {
  id?: string;
  onAdded?: (slide: { id: string }) => void | Promise<void>;
};

export function useSlideActions(
  slug: string,
  onDocumentRefresh?: (options?: DocumentRefreshOptions) => void | Promise<void>,
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
    (options?: SlideAddOptions) => {
      const id = typeof options === "string" ? options : options?.id;
      const onAdded = typeof options === "string" ? undefined : options?.onAdded;
      void execute<SlideMutationResponse>(
        { type: "slide-add", slug, id },
        {
          onSuccess: async (data) => {
            if (data.slide) await onAdded?.(data.slide);
            await handleSuccess();
          },
        },
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

  const updateNotes = useCallback(
    (id: string, notes: string) => execute<SlideMutationResponse>(
      { type: "slide-notes", slug, id, notes },
      {
        onSuccess: async (data) => {
          await onDocumentRefresh?.({ expectedRenderId: data.document?.renderId });
        },
      },
    ),
    [execute, onDocumentRefresh, slug],
  );

  return { add, remove, reorder, skip, unskip, unskipMany, updateNotes };
}
