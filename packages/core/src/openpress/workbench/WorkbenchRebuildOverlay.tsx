import { useEditStatus } from "./WorkbenchEditStatusContext";

export function WorkbenchRebuildOverlay() {
  const { status } = useEditStatus();
  if (status === "idle" || status === "failed") return null;
  const isSaving = status === "saving";
  return (
    <div
      className={[
        "fixed inset-0 z-[900] flex items-center justify-center",
        isSaving
          ? "pointer-events-auto bg-black/25 backdrop-blur-[1.5px]"
          : "pointer-events-none bg-transparent",
      ].join(" ")}
      role="status"
      aria-live="polite"
      aria-label={isSaving ? "重新建置中" : "已儲存"}
    >
      {isSaving ? (
        <span className="inline-flex items-center gap-[10px] rounded-full border border-white/15 bg-neutral-950/85 px-[14px] py-[10px] text-[13px] font-[650] text-white/90 shadow-[0_16px_38px_rgb(0_0_0_/_0.24)]">
          <span
            className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/35 border-t-white"
            aria-hidden="true"
          />
          <span>Updating workspace...</span>
        </span>
      ) : (
        <span className="animate-pulse text-[28px] text-green-400" aria-hidden="true">✓</span>
      )}
    </div>
  );
}
