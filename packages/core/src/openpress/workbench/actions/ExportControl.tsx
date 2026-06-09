import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Download, FileDown, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toPng } from "html-to-image";
import type { HtmlPageBlock, Theme } from "../../document-model";
import { PageThumbnails } from "../../reader";
import { WorkbenchDialog } from "../dialog";

type ExportDialog = "none" | "pdf" | "png";
type PngExportStatus = "idle" | "exporting" | "done" | "error";

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

  // PDF state (only used for the onExportPdf / dev path)
  const [pdfPageIndex, setPdfPageIndex] = useState(currentPageIndex);
  const [selectedPdfPageIndexes, setSelectedPdfPageIndexes] = useState<Set<number>>(() => new Set());

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
    setPdfPageIndex(currentPageIndex);
    setSelectedPdfPageIndexes(createAllPageIndexSet(pages));
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

  const togglePdfPage = (pageIndex: number) => {
    setSelectedPdfPageIndexes((current) => {
      const next = new Set(current);
      if (next.has(pageIndex)) next.delete(pageIndex);
      else next.add(pageIndex);
      return next;
    });
  };

  const selectAllPngPages = () => setSelectedPngPageIndexes(createAllPageIndexSet(pages));
  const clearPngPages = () => setSelectedPngPageIndexes(new Set());
  const selectAllPdfPages = () => setSelectedPdfPageIndexes(createAllPageIndexSet(pages));
  const clearPdfPages = () => setSelectedPdfPageIndexes(new Set());

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
    if (!onExportPdf || pdfDisabled) return;
    const pageIndexes = pages
      .map((page) => page.pageNumber - 1)
      .filter((pageIndex) => selectedPdfPageIndexes.has(pageIndex));
    if (pageIndexes.length === 0) return;
    onExportPdf(pageIndexes);
  }, [onExportPdf, pdfDisabled, pages, selectedPdfPageIndexes]);

  const hasPdf = Boolean(pdfHref ?? onExportPdf);
  const selectedPngCount = selectedPngPageIndexes.size;
  const selectedPdfCount = selectedPdfPageIndexes.size;

  const pngButtonLabel = pngStatus === "exporting" ? "匯出中…"
    : pngStatus === "done" ? "已下載"
    : pngStatus === "error" ? "匯出失敗"
    : selectedPngCount === 0 ? "請選擇圖片"
    : `匯出 ${selectedPngCount} 張`;

  const pdfButtonLabel = selectedPdfCount === 0 ? "請選擇頁面" : `匯出 ${selectedPdfCount} 頁`;
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

      {/* PDF dialog: dev / local-generation variant with page selection */}
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
              disabled={pdfDisabled || pdfExporting || selectedPdfCount === 0}
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
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      style={{ display: "inline-flex" }}
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
            <div className="openpress-export-dialog__selection-bar">
              <span>{selectedPdfCount} / {pages.length} 頁已選</span>
              <div className="openpress-export-dialog__selection-actions">
                <button type="button" onClick={selectAllPdfPages}>全選</button>
                <button type="button" onClick={clearPdfPages}>清除</button>
              </div>
            </div>
            <div className="openpress-export-dialog__thumbs">
              <PageThumbnails
                pages={pages}
                currentPageIndex={pdfPageIndex}
                selectedPageIndexes={selectedPdfPageIndexes}
                onTogglePage={(idx) => {
                  setPdfPageIndex(idx);
                  togglePdfPage(idx);
                }}
                onSelectPage={(idx) => setPdfPageIndex(idx)}
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
