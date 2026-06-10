import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Download, FileDown, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toPng } from "html-to-image";
import type { HtmlPageBlock, Theme } from "../../document-model";
import { PageThumbnails } from "../../reader";
import { WorkbenchDialog } from "../dialog";
import {
  ZOOM_CHEVRON_CLASS,
  ZOOM_CONTROL_CLASS,
  ZOOM_CONTROL_WRAP_CLASS,
  ZOOM_MENU_CHECK_CLASS,
  ZOOM_MENU_CLASS,
  ZOOM_MENU_ITEM_CLASS,
  ZOOM_MENU_SECTION_CLASS,
} from "../toolbarClasses";

type ExportDialog = "none" | "pdf" | "png";
type PngExportStatus = "idle" | "exporting" | "done" | "error";
type PdfRangeMode = "all" | "range";

const EXPORT_CONTROL_WRAP_CLASS = [
  ZOOM_CONTROL_WRAP_CLASS,
  "[&_.openpress-workbench-zoom-control]:max-w-[110px]",
  "[&_.openpress-workbench-zoom-control]:overflow-visible",
  "[&_.openpress-workbench-zoom-control]:[font-family:inherit]",
  "[&_.openpress-workbench-zoom-control]:text-[11px]",
  "[&_.openpress-workbench-zoom-control]:font-[560]",
  "[&_.openpress-workbench-zoom-control]:text-[#d8dadd]",
].join(" ");
const EXPORT_DIALOG_CLASS = [
].join(" ");
const EXPORT_DIALOG_FOOTER_CLASS = "!justify-end !gap-2";
const EXPORT_WIDE_DIALOG_CLASS = `${EXPORT_DIALOG_CLASS} !w-[min(680px,calc(100vw_-_56px))]`;
const EXPORT_ACTION_CLASS = [
  "inline-flex !h-[30px] cursor-pointer items-center justify-center gap-[7px]",
  "rounded-[var(--openpress-workbench-radius-sm)] border border-[var(--openpress-workbench-border)] bg-transparent px-3",
  "text-[11px] font-[560] text-[var(--openpress-workbench-text-soft)] no-underline [font:inherit]",
  "hover:border-[rgb(240_182_76_/_0.34)] hover:text-[var(--openpress-workbench-accent)]",
  "disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:h-[13px] [&_svg]:w-[13px]",
].join(" ");
const EXPORT_BODY_CLASS = "px-6 pb-6 pt-5";
const EXPORT_SUMMARY_CLASS = "m-0 text-xs leading-normal text-[rgb(180_186_192_/_0.7)]";
const EXPORT_CONTENT_CLASS = "flex min-h-0 flex-col overflow-hidden";
const EXPORT_SELECTION_BAR_CLASS = [
  "flex min-h-[42px] items-center justify-between gap-3 border-b border-[var(--openpress-workbench-border-muted)]",
  "px-4 py-[10px] text-[11px] leading-tight text-[var(--openpress-workbench-muted)]",
].join(" ");
const EXPORT_SELECTION_ACTIONS_CLASS = "inline-flex shrink-0 gap-1.5";
const EXPORT_SELECTION_ACTION_BUTTON_CLASS = [
  "h-[26px] cursor-pointer rounded-[var(--openpress-workbench-radius-sm)] border border-[var(--openpress-workbench-border-muted)]",
  "bg-transparent px-[9px] text-[11px] text-[var(--openpress-workbench-text-soft)] [font:inherit]",
  "hover:border-[rgb(240_182_76_/_0.34)] hover:text-[var(--openpress-workbench-accent)]",
].join(" ");
const EXPORT_THUMBS_CLASS = "min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2 [scrollbar-color:rgb(255_255_255_/_0.14)_transparent] [scrollbar-width:thin]";
const EXPORT_THUMB_CLASS_NAMES = {
  card: "relative cursor-pointer",
  list: "!grid list-none grid-cols-2 gap-2 !m-0 !overflow-visible !p-0",
  selectedCard: "!border-[rgb(240_182_76_/_0.62)] !bg-[rgb(240_182_76_/_0.07)]",
};
const EXPORT_PDF_BUTTON_INNER_CLASS = "inline-flex items-center gap-[7px] [&_svg]:h-[13px] [&_svg]:w-[13px]";
const EXPORT_RANGE_CLASS = [
  "flex min-h-[42px] flex-wrap items-center gap-3 border-b border-[var(--openpress-workbench-border-muted)]",
  "px-4 py-[10px] text-[11px] text-[var(--openpress-workbench-muted)]",
].join(" ");
const EXPORT_RANGE_RADIO_CLASS = "inline-flex cursor-pointer items-center gap-1.5";
const EXPORT_RANGE_INPUTS_CLASS = "inline-flex items-center gap-1.5";
const EXPORT_RANGE_INPUT_CLASS = [
  "h-[26px] w-12 rounded-[var(--openpress-workbench-radius-sm)] border border-[var(--openpress-workbench-border-muted)]",
  "bg-transparent px-1 text-center text-[11px] text-[var(--openpress-workbench-text)] outline-none [font:inherit]",
  "focus:border-[var(--openpress-workbench-accent)]",
].join(" ");

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
    <div ref={rootRef} className={EXPORT_CONTROL_WRAP_CLASS} data-openpress-export-control>
      <button
        type="button"
        className={ZOOM_CONTROL_CLASS}
        aria-label="匯出"
        title="匯出"
        aria-haspopup="menu"
        aria-expanded={dropdownOpen}
        aria-controls={dropdownOpen ? menuId : undefined}
        onClick={() => setDropdownOpen((v) => !v)}
      >
        <FileDown aria-hidden="true" />
        <span>匯出</span>
        <ChevronDown className={ZOOM_CHEVRON_CLASS} aria-hidden="true" />
      </button>

      {dropdownOpen ? (
        <div id={menuId} className={ZOOM_MENU_CLASS} role="menu" aria-label="匯出選項">
          <div className={ZOOM_MENU_SECTION_CLASS} role="group">
            {hasPdf ? (
              <button type="button" className={ZOOM_MENU_ITEM_CLASS} role="menuitem" onClick={openPdf}>
                <span className={ZOOM_MENU_CHECK_CLASS} aria-hidden="true" />
                <FileText aria-hidden="true" />
                <span>PDF</span>
              </button>
            ) : null}
            <button type="button" className={ZOOM_MENU_ITEM_CLASS} role="menuitem" onClick={openPng}>
              <span className={ZOOM_MENU_CHECK_CLASS} aria-hidden="true" />
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
          className={EXPORT_DIALOG_CLASS}
          footerClassName={EXPORT_DIALOG_FOOTER_CLASS}
          onClose={closeDialog}
          footer={
            <a
              href={pdfHref}
              target="_blank"
              rel="noopener noreferrer"
              className={EXPORT_ACTION_CLASS}
              onClick={closeDialog}
            >
              <Download aria-hidden="true" />
              <span>下載 PDF</span>
            </a>
          }
        >
          <div className={EXPORT_BODY_CLASS}>
            <p className={EXPORT_SUMMARY_CLASS}>共 {pages.length} 頁</p>
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
          className={EXPORT_WIDE_DIALOG_CLASS}
          footerClassName={EXPORT_DIALOG_FOOTER_CLASS}
          onClose={closeDialog}
          footer={
            <button
              type="button"
              className={EXPORT_ACTION_CLASS}
              disabled={pdfDisabled || pdfExporting || pdfExportIndexes.length === 0}
              data-openpress-export-status={pdfActionStatus}
              onClick={handleExportPdf}
            >
              <AnimatePresence mode="wait" initial={false}>
                {pdfExporting ? (
                  <motion.span
                    key="loading"
                    className={EXPORT_PDF_BUTTON_INNER_CLASS}
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
                    className={EXPORT_PDF_BUTTON_INNER_CLASS}
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
          <div className={EXPORT_CONTENT_CLASS}>
            <div className={EXPORT_RANGE_CLASS}>
              <label className={EXPORT_RANGE_RADIO_CLASS}>
                <input
                  type="radio"
                  name="pdf-range-mode"
                  checked={pdfRangeMode === "all"}
                  onChange={() => setPdfRangeMode("all")}
                />
                <span>全部頁面（{pages.length} 頁）</span>
              </label>
              <label className={EXPORT_RANGE_RADIO_CLASS}>
                <input
                  type="radio"
                  name="pdf-range-mode"
                  checked={pdfRangeMode === "range"}
                  onChange={() => setPdfRangeMode("range")}
                />
                <span>自訂範圍</span>
              </label>
              {pdfRangeMode === "range" ? (
                <div className={EXPORT_RANGE_INPUTS_CLASS}>
                  <span>第</span>
                  <input
                    type="number"
                    className={EXPORT_RANGE_INPUT_CLASS}
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
                    className={EXPORT_RANGE_INPUT_CLASS}
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
            <div className={EXPORT_THUMBS_CLASS}>
              <PageThumbnails
                pages={pdfPreviewPages}
                currentPageIndex={-1}
                onSelectPage={() => undefined}
                theme={theme}
                classNames={EXPORT_THUMB_CLASS_NAMES}
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
          className={EXPORT_WIDE_DIALOG_CLASS}
          footerClassName={EXPORT_DIALOG_FOOTER_CLASS}
          onClose={closeDialog}
          footer={
            <button
              type="button"
              className={EXPORT_ACTION_CLASS}
              disabled={pngStatus === "exporting" || selectedPngCount === 0}
              data-openpress-export-status={pngStatus}
              onClick={handleExportPng}
            >
              <Download aria-hidden="true" />
              <span>{pngButtonLabel}</span>
            </button>
          }
        >
          <div className={EXPORT_CONTENT_CLASS}>
            <div className={EXPORT_SELECTION_BAR_CLASS}>
              <span>{selectedPngCount} / {pages.length} 張已選</span>
              <div className={EXPORT_SELECTION_ACTIONS_CLASS}>
                <button type="button" className={EXPORT_SELECTION_ACTION_BUTTON_CLASS} onClick={selectAllPngPages}>全選</button>
                <button type="button" className={EXPORT_SELECTION_ACTION_BUTTON_CLASS} onClick={clearPngPages}>清除</button>
              </div>
            </div>
            <div className={EXPORT_THUMBS_CLASS}>
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
                classNames={EXPORT_THUMB_CLASS_NAMES}
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
