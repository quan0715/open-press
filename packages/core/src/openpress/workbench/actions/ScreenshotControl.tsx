import { Camera } from "lucide-react";
import { toPng } from "html-to-image";
import { useCallback, useState } from "react";
import { useToast } from "../../shared";

type ScreenshotStatus = "idle" | "capturing";

export function ScreenshotControl({ currentPageIndex }: { currentPageIndex: number }) {
  const [status, setStatus] = useState<ScreenshotStatus>("idle");
  const { showToast } = useToast();

  const handleScreenshot = useCallback(async () => {
    if (status === "capturing") return;
    const pageEl = typeof window !== "undefined"
      ? window.document.querySelector<HTMLElement>(`[data-openpress-page-index="${currentPageIndex}"]`)
      : null;
    if (!pageEl) return;
    setStatus("capturing");
    try {
      const dataUrl = await toPng(pageEl, { pixelRatio: 2, cacheBust: true, backgroundColor: "#ffffff" });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      showToast("已複製到剪貼簿", "success");
    } catch (err) {
      console.error("[openpress] screenshot failed", err);
      showToast("截圖失敗，請重試", "error");
    } finally {
      setStatus("idle");
    }
  }, [currentPageIndex, status, showToast]);

  return (
    <button
      type="button"
      className="openpress-workbench-toolbar-action"
      data-openpress-screenshot
      aria-label="截圖並複製到剪貼簿"
      title="截圖並複製到剪貼簿"
      disabled={status === "capturing"}
      onClick={handleScreenshot}
    >
      <Camera aria-hidden="true" />
    </button>
  );
}
