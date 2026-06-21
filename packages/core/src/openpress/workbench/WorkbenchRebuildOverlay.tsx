import { Loader2 } from "lucide-react";
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
      aria-label={isSaving ? "Save and render in progress" : "Save and render complete"}
    >
      {isSaving ? (
        <span
          className={[
            "inline-flex min-w-[238px] items-center gap-3 rounded-[10px] border border-white/15",
            "bg-neutral-950/90 px-4 py-3 text-white/90 shadow-[0_24px_60px_rgb(0_0_0_/_0.34)]",
          ].join(" ")}
          data-openpress-save-render-overlay
        >
          <span className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[0.06]" aria-hidden="true">
            <Loader2 className="h-[18px] w-[18px] animate-spin text-white/80" />
          </span>
          <span className="grid min-w-0 gap-1">
            <strong className="text-[13px] font-[720] leading-none tracking-normal">Save &amp; Render</strong>
            <span className="text-[11px] leading-none text-white/58">Building the latest preview...</span>
          </span>
        </span>
      ) : (
        <span
          className="rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-2 text-[12px] font-[700] text-emerald-200 shadow-[0_16px_38px_rgb(0_0_0_/_0.22)]"
          aria-hidden="true"
        >
          Rendered
        </span>
      )}
    </div>
  );
}
