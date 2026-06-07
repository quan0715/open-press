import { useEditStatus } from "./WorkbenchEditStatusContext";

export function WorkbenchRebuildOverlay() {
  const { status } = useEditStatus();
  if (status === "idle" || status === "failed") return null;
  return (
    <div
      className={`openpress-rebuild-overlay openpress-rebuild-overlay--${status}`}
      role="status"
      aria-live="polite"
      aria-label={status === "saving" ? "重新建置中" : "已儲存"}
    >
      {status === "saving" ? (
        <span className="openpress-rebuild-overlay__spinner" aria-hidden="true" />
      ) : (
        <span className="openpress-rebuild-overlay__check" aria-hidden="true">✓</span>
      )}
    </div>
  );
}
