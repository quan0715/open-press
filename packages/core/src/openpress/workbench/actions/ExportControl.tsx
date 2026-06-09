import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Download, FileDown, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toPng } from "html-to-image";
import type { HtmlPageBlock, Theme } from "../../document-model";
import { PageThumbnails } from "../../reader";
import { WorkbenchDialog } from "../dialog";

type ExportDialog = "none" | "pdf" | "png";
type PngExportStatus = "idle" | "exporting" | "done" | "error";
type PdfRangeMode = "all" | "range";

export function ExportControl({
  pages,
  currentPageIndex,
  pressTitle,
  theme,
  pdfHref,
  onExportPdf,
  pdfDisabled = false,
  pdfLabel,
  pdfStatusMessage,
  pdfActionStatus,
}: {
  pages: HtmlPageBlock[];
  currentPageIndex: number;
  pressTitle: string;
  theme?: Theme;
  pdfHref?: string;
  onExportPdf?: (pageIndexes: number[]) => void;
  pdfDisabled?: boolean;
  pdfLabel?: string;
  pdfStatusMessage?: string | null;
  pdfActionStatus?: string;
}) {
  const menuId = useId();
  const pdfTitleId = useId();
  const pngTitleId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<ExportDialog>("none");

  // PNG state
  const [pngPageIndex, setPngPageIndex] = useState(currentPageIndex);
  const [selectedPngPageIndexes, setSelectedPngPageIndexes] = useState<Set<number>>(() => new Set());
  const [pngStatus, setPngStatus] = useState<PngExportStatus>("idle");

  // PDF range state (dev / onExportPdf path only)
  const [pdfRangeMode, setPdfRangeMode] = useState<PdfRangeMode>("all");
  const [pdfRangeStart, setPdfRangeStart] = useState(1);
  const [pdfRangeEnd, setPdfRangeEnd] = useState(1);

  const pdfExportIndexes = useMemo(() => {
    if (pdfRangeMode === "all") return pages.map((_, i) => i);
    const start = Math.max(0, pdfRangeStart - 1);
    const end = Math.min(pages.length - 1, pdfRangeEnd - 1);
    if (start > end) return [];
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [pdfRangeMode, pdfRangeStart, pdfRangeEnd, pages]);

  const pdfPreviewPages = useMemo(
    () => pdfExportIndexes.map((i) => pages[i]).filter(Boolean),
    [pdfExportIndexes, pages],
  );

  useEffect(() => {
    if (!dropdownOpen) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setDropdownOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDropdownOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen]);

  const openPdf = () => {
    setDropdownOpen(false);
    setPdfRangeMode("all");
    setPdfRangeStart(1);
    setPdfRangeEnd(pages.length);
    setActiveDialog("pdf");
  };
  const openPng = () => {
    setDropdownOpen(false);
    setPngPageIndex(currentPageIndex);
    setSelectedPngPageIndexes(createAllPageIndexSet(pages));
    setPngStatus("idle");
    setActiveDialog("png");
  };
  const closeDialog = () => setActiveDialog("none");

  const togglePngPage = (pageIndex: number) => {
    setSelectedPngPageIndexes((current) => {
      const next = new Set(current);
      if (next.has(pageIndex)) next.delete(pageIndex);
      else next.add(pageIndex);
      return next;
    });
  };

  const selectAllPngPages = () => setSelectedPngPageIndexes(createAllPageIndexSet(pages));
  const clearPngPages = () => setSelectedPngPageIndexes(new Set());

  const handleExportPng = useCallback(async () => {
    if (pngStatus === "exporting") return;
    const pageIndexes = pages
      .map((page) => page.pageNumber - 1)
      .filter((pageIndex) => selectedPngPageIndexes.has(pageIndex));
    if (pageIndexes.length === 0) return;
    setPngStatus("exporting");
    try {
      const safeTitle = sanitizeFilename(pressTitle) || "openpress";
      for (const pageIndex of pageIndexes) {
        const pageEl = typeof window === "undefined"
          ? null
          : window.document.querySelector<HTMLElement>(`[data-openpress-page-index="${pageIndex}"]`);
        if (!pageEl) throw new Error(`找不到第 ${pageIndex + 1} 頁元素`);
        const dataUrl = await toPng(pageEl, { pixelRatio: 2, cacheBust: true, backgroundColor: "#ffffff" });
        const safePage = String(pageIndex + 1).padStart(2, "0");
        const link = window.document.createElement("a");
        link.href = dataUrl;
        link.download = `${safeTitle}-${safePage}.png`;
        window.document.body.appendChild(link);
        link.click();
        link.remove();
      }
      setPngStatus("done");
      window.setTimeout(() => setPngStatus("idle"), 1600);
    } catch (error) {
      console.error("[openpress] PNG export failed", error);
      setPngStatus("error");
      window.setTimeout(() => setPngStatus("idle"), 2400);
    }
  }, [pages, pngStatus, pressTitle, selectedPngPageIndexes]);

  const handleExportPdf = useCallback(() => {
    if (!onExportPdf || pdfDisabled || pdfExportIndexes.length === 0) return;
    onExportPdf(pdfExportIndexes);
  }, [onExportPdf, pdfDisabled, pdfExportIndexes]);

  const hasPdf = Boolean(pdfHref ?? onExportPdf);
  const selectedPngCount = selectedPngPageIndexes.size;

  const pngButtonLabel = pngStatus === "exporting" ? "匯出中…"
    : pngStatus === "done" ? "已下載"
    : pngStatus === "error" ? "匯出失敗"
    : selectedPngCount === 0 ? "請選擇圖片"
    : `匯出 ${selectedPngCount} 張`;

  const pdfButtonLabel = pdfExportIndexes.length === 0 ? "請選擇頁面" : `匯出 ${pdfExportIndexes.length} 頁`;
  const pdfExporting = pdfActionStatus === "generating" || pdfActionStatus === "opening";

  return (
    <div ref={rootRef} className="openpress-workbench-zoom-control-wrap" data-openpress-export-control>
      <button
        type="button"
        className="openpress-workbench-zoom-control"
        aria-label="匯出"
        title="匯出"
        aria-haspopup="menu"
        aria-expanded={dropdownOpen}
        aria-controls={dropdownOpen ? menuId : undefined}
        onClick={() => setDropdownOpen((v) => !v)}
      >
        <FileDown aria-hidden="true" />
        <span>匯出</span>
        <ChevronDown className="openpress-workbench-zoom-control__chevron" aria-hidden="true" />
      </button>

      {dropdownOpen ? (
        <div id={menuId} className="openpress-workbench-zoom-menu" role="menu" aria-label="匯出選項">
          <div className="openpress-workbench-zoom-menu__section" role="group">
            {hasPdf ? (
              <button type="button" className="openpress-workbench-zoom-menu__item" role="menuitem" onClick={openPdf}>
                <span className="openpress-workbench-zoom-menu__check" aria-hidden="true" />
                <FileText aria-hidden="true" />
                <span>PDF</span>
              </button>
            ) : null}
            <button type="button" className="openpress-workbench-zoom-menu__item" role="menuitem" onClick={openPng}>
              <span className="openpress-workbench-zoom-menu__check" aria-hidden="true" />
              <ImageIcon aria-hidden="true" />
              <span>PNG 圖片</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* PDF dialog: static link variant */}
      {activeDialog === "pdf" && pdfHref ? (
        <WorkbenchDialog
          titleId={pdfTitleId}
          eyebrow="匯出"
          title="PDF"
          closeLabel="關閉"
          className="openpress-export-dialog"
          onClose={closeDialog}
          footer={
            <a
              href={pdfHref}
              target="_blank"
              rel="noopener noreferrer"
              className="openpress-export-dialog__action"
              onClick={closeDialog}
            >
              <Download aria-hidden="true" />
              <span>下載 PDF</span>
            </a>
          }
        >
          <div className="openpress-export-dialog__body">
            <p className="openpress-export-dialog__summary">共 {pages.length} 頁</p>
          </div>
        </WorkbenchDialog>
      ) : null}

      {/* PDF dialog: dev / local-generation variant with range selection */}
      {activeDialog === "pdf" && !pdfHref && onExportPdf ? (
        <WorkbenchDialog
          titleId={pdfTitleId}
          eyebrow="匯出"
          title="PDF"
          closeLabel="關閉"
          className="openpress-export-dialog openpress-export-pdf-dialog"
          onClose={closeDialog}
          footer={
            <button
              type="button"
              className="openpress-export-dialog__action openpress-export-pdf-dialog__action"
              disabled={pdfDisabled || pdfExporting || pdfExportIndexes.length === 0}
              data-openpress-export-status={pdfActionStatus}
              onClick={handleExportPdf}
            >
              <AnimatePresence mode="wait" initial={false}>
                {pdfExporting ? (
                  <motion.span
                    key="loading"
                    className="openpress-export-pdf-dialog__btn-inner"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <motion.span
                      className="inline-flex"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      <Loader2 aria-hidden="true" />
                    </motion.span>
                    <span>匯出中…</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    className="openpress-export-pdf-dialog__btn-inner"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Download aria-hidden="true" />
                    <span>{pdfButtonLabel}</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          }
        >
          <div className="openpress-export-png-dialog__content">
            <div className="openpress-export-pdf-dialog__range">
              <label className="openpress-export-pdf-dialog__range-radio">
                <input
                  type="radio"
                  name="pdf-range-mode"
                  checked={pdfRangeMode === "all"}
                  onChange={() => setPdfRangeMode("all")}
                />
                <span>全部頁面（{pages.length} 頁）</span>
              </label>
              <label className="openpress-export-pdf-dialog__range-radio">
                <input
                  type="radio"
                  name="pdf-range-mode"
                  checked={pdfRangeMode === "range"}
                  onChange={() => setPdfRangeMode("range")}
                />
                <span>自訂範圍</span>
              </label>
              {pdfRangeMode === "range" ? (
                <div className="openpress-export-pdf-dialog__range-inputs">
                  <span>第</span>
                  <input
                    type="number"
                    className="openpress-export-pdf-dialog__range-input"
                    min={1}
                    max={pages.length}
                    value={pdfRangeStart}
                    onChange={(e) => {
                      const v = Math.max(1, Math.min(pages.length, Number(e.target.value) || 1));
                      setPdfRangeStart(v);
                      if (v > pdfRangeEnd) setPdfRangeEnd(v);
                    }}
                  />
                  <span>～</span>
                  <input
                    type="number"
                    className="openpress-export-pdf-dialog__range-input"
                    min={1}
                    max={pages.length}
                    value={pdfRangeEnd}
                    onChange={(e) => {
                      const v = Math.max(1, Math.min(pages.length, Number(e.target.value) || 1));
                      setPdfRangeEnd(v);
                      if (v < pdfRangeStart) setPdfRangeStart(v);
                    }}
                  />
                  <span>頁</span>
                </div>
              ) : null}
            </div>
            <div className="openpress-export-dialog__thumbs">
              <PageThumbnails
                pages={pdfPreviewPages}
                currentPageIndex={-1}
                onSelectPage={() => undefined}
                theme={theme}
              />
            </div>
          </div>
        </WorkbenchDialog>
      ) : null}

      {activeDialog === "png" ? (
        <WorkbenchDialog
          titleId={pngTitleId}
          eyebrow="匯出"
          title="PNG 圖片"
          closeLabel="關閉"
          className="openpress-export-dialog openpress-export-png-dialog"
          onClose={closeDialog}
          footer={
            <button
              type="button"
              className="openpress-export-dialog__action"
              disabled={pngStatus === "exporting" || selectedPngCount === 0}
              data-openpress-export-status={pngStatus}
              onClick={handleExportPng}
            >
              <Download aria-hidden="true" />
              <span>{pngButtonLabel}</span>
            </button>
          }
        >
          <div className="openpress-export-png-dialog__content">
            <div className="openpress-export-dialog__selection-bar">
              <span>{selectedPngCount} / {pages.length} 張已選</span>
              <div className="openpress-export-dialog__selection-actions">
                <button type="button" onClick={selectAllPngPages}>全選</button>
                <button type="button" onClick={clearPngPages}>清除</button>
              </div>
            </div>
            <div className="openpress-export-dialog__thumbs">
              <PageThumbnails
                pages={pages}
                currentPageIndex={pngPageIndex}
                selectedPageIndexes={selectedPngPageIndexes}
                onTogglePage={(idx) => {
                  setPngPageIndex(idx);
                  togglePngPage(idx);
                }}
                onSelectPage={(idx) => setPngPageIndex(idx)}
                theme={theme}
              />
            </div>
          </div>
        </WorkbenchDialog>
      ) : null}
    </div>
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

function createAllPageIndexSet(pages: HtmlPageBlock[]) {
  return new Set(pages.map((page) => page.pageNumber - 1));
}
