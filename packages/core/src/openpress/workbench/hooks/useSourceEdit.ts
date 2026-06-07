import { useCallback } from "react";
import { useEditStatus } from "../WorkbenchEditStatusContext";

export function useSourceEdit() {
  const { startSave, completeSave, failSave } = useEditStatus();

  const execute = useCallback(
    async <T = unknown>(
      body: Record<string, unknown>,
      options?: {
        optimistic?: () => void;
        onSuccess?: (data: T) => void;
      },
    ): Promise<void> => {
      options?.optimistic?.();
      startSave();
      try {
        const res = await fetch("/__openpress/source-edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => String(res.status));
          throw new Error(text || `Source edit failed with status ${res.status}`);
        }
        const data = (await res.json()) as T;
        completeSave();
        options?.onSuccess?.(data);
      } catch (err) {
        failSave(err instanceof Error ? err.message : String(err));
      }
    },
    [startSave, completeSave, failSave],
  );

  return { execute };
}
