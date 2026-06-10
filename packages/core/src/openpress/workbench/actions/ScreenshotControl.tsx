import { Camera } from "lucide-react";
import { toPng, getFontEmbedCSS } from "html-to-image";
import { useCallback, useState } from "react";
import { useToast } from "../../shared";
import { TOOLBAR_ACTION_CLASS } from "../toolbarClasses";

type ScreenshotStatus = "idle" | "capturing";

// Fonts are fetched + base64-encoded once and reused across captures.
// This avoids re-downloading the same font files on every screenshot.
let fontEmbedCache: Promise<string> | undefined;

function getOrBuildFontEmbed(el: HTMLElement): Promise<string> {
  if (!fontEmbedCache) fontEmbedCache = getFontEmbedCSS(el);
  return fontEmbedCache;
}

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
      const fontEmbedCSS = await getOrBuildFontEmbed(pageEl);
      const dataUrl = await toPng(pageEl, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        fontEmbedCSS,
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      showToast("已複製到剪貼簿", "success");
    } catch (err) {
      console.error("[openpress] screenshot failed", err);
      // Reset cache on error so next attempt retries font fetching
      fontEmbedCache = undefined;
      showToast("截圖失敗，請重試", "error");
    } finally {
      setStatus("idle");
    }
  }, [currentPageIndex, status, showToast]);

  return (
    <button
      type="button"
      className={TOOLBAR_ACTION_CLASS}
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
