import { useCallback, useState } from "react";
import { Camera } from "lucide-react";
import { toPng } from "html-to-image";

type ExportStatus = "idle" | "exporting" | "done" | "error";

// Exports the currently visible page as a PNG. Locates the page DOM via
// the data-openpress-page-index attribute (set in PublicReaderPage) and
// hands it to html-to-image, then triggers a browser download.
//
// Lives in the workbench toolbar so it's reachable for any Press shape
// (manuscript / canvas / slide); for multi-page Press the user navigates
// to the page first, then exports.
export function ExportImageControl({
  currentPageIndex,
  currentPageLabel,
  pressTitle,
}: {
  currentPageIndex: number;
  currentPageLabel: string;
  pressTitle: string;
}) {
  const [status, setStatus] = useState<ExportStatus>("idle");

  const handleExport = useCallback(async () => {
    if (status === "exporting") return;
    setStatus("exporting");

    try {
      const pageEl = typeof window === "undefined"
        ? null
        : window.document.querySelector<HTMLElement>(
            `[data-openpress-page-index="${currentPageIndex}"]`,
          );
      if (!pageEl) throw new Error("找不到目前頁面");

      // pixelRatio: 2 — retina-ish; keeps text crisp without blowing the file size.
      // cacheBust: true — force re-fetch of images so stale CORS doesn't taint the canvas.
      const dataUrl = await toPng(pageEl, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });

      const safeTitle = sanitizeFilename(pressTitle) || "openpress";
      const safePage = sanitizeFilename(currentPageLabel) || String(currentPageIndex + 1);
      const link = window.document.createElement("a");
      link.href = dataUrl;
      link.download = `${safeTitle}-${safePage}.png`;
      window.document.body.appendChild(link);
      link.click();
      link.remove();

      setStatus("done");
      window.setTimeout(() => setStatus("idle"), 1600);
    } catch (error) {
      console.error("[openpress] page PNG export failed", error);
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 2400);
    }
  }, [currentPageIndex, currentPageLabel, pressTitle, status]);

  const label = status === "exporting"
    ? "匯出中…"
    : status === "done"
    ? "已下載"
    : status === "error"
    ? "匯出失敗"
    : "PNG";
  const title = "將目前頁面匯出為 PNG";

  return (
    <button
      type="button"
      className="openpress-workbench-toolbar-action"
      data-openpress-page-png-export
      data-openpress-export-status={status}
      disabled={status === "exporting"}
      onClick={handleExport}
      title={title}
      aria-label={title}
    >
      <Camera aria-hidden="true" />
      <span className="openpress-workbench-toolbar-action__label">{label}</span>
    </button>
  );
}

function sanitizeFilename(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
