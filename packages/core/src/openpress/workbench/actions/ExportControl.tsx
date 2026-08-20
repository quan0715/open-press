import { useCallback, useId, useMemo, useState, type CSSProperties } from "react";
import { ChevronDown, Download, FileDown, FileText, Image as ImageIcon, Loader2, Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toPng } from "html-to-image";
import type { HtmlPageBlock, Theme } from "../../document-model";
import { PageThumbnails } from "../../reader";
import { WorkbenchDialog } from "../dialog";
import {
  ZOOM_CHEVRON_CLASS,
  ZOOM_CONTROL_CLASS,
  ZOOM_CONTROL_WRAP_CLASS,
  ZOOM_MENU_SECTION_CLASS,
  TOOLBAR_ACTION_CLASS,
} from "../toolbarClasses";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/openpress/ui/dropdown-menu";
import { Button } from "@/openpress/ui/button";
import { Input } from "@/openpress/ui/input";
import { RadioGroup, RadioGroupItem } from "@/openpress/ui/radio-group";
import type { WordExportMode, WordExportOptions } from "./useDeploymentWorkbench";

type ExportDialog = "none" | "pdf" | "png" | "word";
type PngExportStatus = "idle" | "exporting" | "done" | "error";
type PdfRangeMode = "all" | "range";
type WordRangeMode = "all" | "range";

const EXPORT_CONTROL_WRAP_CLASS = [
  ZOOM_CONTROL_WRAP_CLASS,
  "[&_.op-workspace-zoom-control]:max-w-[110px]",
  "[&_.op-workspace-zoom-control]:overflow-visible",
  "[&_.op-workspace-zoom-control]:[font-family:inherit]",
  "[&_.op-workspace-zoom-control]:text-[11px]",
  "[&_.op-workspace-zoom-control]:font-[560]",
  "[&_.op-workspace-zoom-control]:text-[var(--op-workspace-text-soft)]",
].join(" ");
const EXPORT_TOOLBAR_WRAP_CLASS = "relative inline-flex h-full";
const EXPORT_DROPDOWN_CONTENT_CLASS = [
  "op-ui-menu op-workspace-zoom-menu grid w-[188px] gap-1.5",
  "rounded-[10px] border border-[var(--op-workspace-border)] bg-[var(--op-workspace-surface-raised)] p-2 text-[var(--op-workspace-text-soft)]",
  "shadow-[var(--op-workspace-shadow-popover)]",
].join(" ");
const EXPORT_MENU_ITEM_CLASS = [
  "op-ui-menu-item op-workspace-zoom-menu-item grid min-h-[30px] cursor-pointer grid-cols-[18px_minmax(0,1fr)] items-center",
  "gap-[9px] rounded-[var(--op-workspace-radius-md)] border-0 bg-transparent px-2 text-left text-xs font-[650]",
  "leading-none text-inherit [font-family:inherit] hover:bg-[var(--op-workspace-surface-hover)] focus-visible:bg-[var(--op-workspace-surface-hover)] focus-visible:outline-0",
  "[&_svg]:h-[15px] [&_svg]:w-[15px]",
].join(" ");
const EXPORT_DIALOG_CLASS = [
].join(" ");
const EXPORT_DIALOG_FOOTER_CLASS = "!justify-end !gap-2";
const EXPORT_WIDE_DIALOG_CLASS = `${EXPORT_DIALOG_CLASS} !w-[min(680px,calc(100vw_-_56px))]`;
const EXPORT_ACTION_CLASS = [
  "inline-flex !h-[30px] cursor-pointer items-center justify-center gap-[7px]",
  "rounded-[var(--op-workspace-radius-sm)] border border-[var(--op-workspace-border)] bg-transparent px-3",
  "text-[11px] font-[560] text-[var(--op-workspace-text-soft)] no-underline [font-family:inherit]",
  "hover:border-[rgb(240_182_76_/_0.34)] hover:text-[var(--op-workspace-accent)]",
  "disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:h-[13px] [&_svg]:w-[13px]",
].join(" ");
const EXPORT_BODY_CLASS = "px-6 pb-6 pt-5";
const EXPORT_SUMMARY_CLASS = "m-0 text-xs leading-normal text-[rgb(180_186_192_/_0.7)]";
const EXPORT_CONTENT_CLASS = "flex min-h-0 flex-col overflow-hidden";
const EXPORT_SELECTION_BAR_CLASS = [
  "flex min-h-[42px] items-center justify-between gap-3 border-b border-[var(--op-workspace-border-muted)]",
  "px-4 py-[10px] text-[11px] leading-tight text-[var(--op-workspace-text-muted)]",
].join(" ");
const EXPORT_SELECTION_ACTIONS_CLASS = "inline-flex shrink-0 gap-1.5";
const EXPORT_SELECTION_ACTION_BUTTON_CLASS = [
  "h-[26px] cursor-pointer rounded-[var(--op-workspace-radius-sm)] border border-[var(--op-workspace-border-muted)]",
  "bg-transparent px-[9px] text-[11px] text-[var(--op-workspace-text-soft)] [font-family:inherit]",
  "hover:border-[rgb(240_182_76_/_0.34)] hover:text-[var(--op-workspace-accent)]",
].join(" ");
const EXPORT_THUMBS_CLASS = "min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2 [scrollbar-color:rgb(255_255_255_/_0.14)_transparent] [scrollbar-width:thin]";
const EXPORT_THUMB_CLASS_NAMES = {
  card: "relative cursor-pointer",
  list: "!grid list-none grid-cols-2 gap-2 !m-0 !overflow-visible !p-0",
  selectedCard: "!border-[rgb(240_182_76_/_0.62)] !bg-[rgb(240_182_76_/_0.07)]",
};
const EXPORT_PDF_BUTTON_INNER_CLASS = "inline-flex items-center gap-[7px] [&_svg]:h-[13px] [&_svg]:w-[13px]";
const EXPORT_RANGE_CLASS = [
  "flex min-h-[42px] flex-wrap items-center gap-3 border-b border-[var(--op-workspace-border-muted)]",
  "px-4 py-[10px] text-[11px] text-[var(--op-workspace-text-muted)]",
].join(" ");
const EXPORT_RANGE_RADIO_CLASS = "inline-flex cursor-pointer items-center gap-1.5";
const EXPORT_RANGE_INPUTS_CLASS = "inline-flex items-center gap-1.5";
const EXPORT_RANGE_INPUT_CLASS = [
  "h-[26px] w-12 rounded-[var(--op-workspace-radius-sm)] border border-[var(--op-workspace-border-muted)]",
  "bg-transparent px-1 text-center text-[11px] text-[var(--op-workspace-text)] outline-none [font-family:inherit]",
  "focus:border-[var(--op-workspace-accent)]",
].join(" ");
const EXPORT_WORD_OPTIONS_CLASS = [
  "grid gap-2 border-b border-[var(--op-workspace-border-muted)] px-4 py-3",
  "text-[11px] text-[var(--op-workspace-text-muted)]",
].join(" ");
const EXPORT_WORD_OPTION_CLASS = [
  "grid cursor-pointer grid-cols-[16px_minmax(0,1fr)] gap-2 rounded-[var(--op-workspace-radius-sm)]",
  "border border-[var(--op-workspace-border-muted)] px-3 py-2",
  "has-[[data-state=checked]]:border-[rgb(240_182_76_/_0.48)] has-[[data-state=checked]]:bg-[rgb(240_182_76_/_0.06)]",
].join(" ");
const EXPORT_WORD_OPTION_TITLE_CLASS = "block text-xs font-[650] leading-tight text-[var(--op-workspace-text-soft)]";
const EXPORT_WORD_OPTION_META_CLASS = "mt-1 block text-[10px] leading-snug text-[var(--op-workspace-text-muted)]";

export function ExportControl({
  pages,
  currentPageIndex,
  pressTitle,
  theme,
  documentStyle,
  pdfHref,
  onExportPdf,
  pdfDisabled = false,
  pdfActionStatus,
  onExportWord,
  wordDisabled = false,
  wordActionStatus,
  onOpenPresentation,
  placement = "panel",
}: {
  pages: HtmlPageBlock[];
  currentPageIndex: number;
  pressTitle: string;
  theme?: Theme;
  documentStyle?: CSSProperties;
  pdfHref?: string;
  onExportPdf?: (pageIndexes: number[]) => void;
  pdfDisabled?: boolean;
  pdfActionStatus?: string;
  onExportWord?: (options: WordExportOptions) => void;
  wordDisabled?: boolean;
  wordActionStatus?: string;
  onOpenPresentation?: () => void;
  placement?: "panel" | "toolbar";
}) {
  const pdfTitleId = useId();
  const pngTitleId = useId();
  const wordTitleId = useId();
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

  // Word state
  const [wordMode, setWordMode] = useState<WordExportMode>("visual");
  const [wordRangeMode, setWordRangeMode] = useState<WordRangeMode>("all");
  const [wordRangeStart, setWordRangeStart] = useState(1);
  const [wordRangeEnd, setWordRangeEnd] = useState(1);

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
  const wordExportIndexes = useMemo(() => {
    if (wordRangeMode === "all") return pages.map((_, i) => i);
    const start = Math.max(0, wordRangeStart - 1);
    const end = Math.min(pages.length - 1, wordRangeEnd - 1);
    if (start > end) return [];
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [wordRangeMode, wordRangeStart, wordRangeEnd, pages]);

  const wordPreviewPages = useMemo(
    () => wordExportIndexes.map((i) => pages[i]).filter(Boolean),
    [wordExportIndexes, pages],
  );

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
  const openWord = () => {
    setDropdownOpen(false);
    setWordMode("visual");
    setWordRangeMode("all");
    setWordRangeStart(1);
    setWordRangeEnd(pages.length);
    setActiveDialog("word");
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

  const handleExportWord = useCallback(() => {
    if (!onExportWord || wordDisabled) return;
    if (wordMode === "visual") {
      if (wordExportIndexes.length === 0) return;
      onExportWord({ mode: "visual", pageIndexes: wordExportIndexes });
      return;
    }
    onExportWord({ mode: "semantic" });
  }, [onExportWord, wordDisabled, wordExportIndexes, wordMode]);

  const hasPdf = Boolean(pdfHref ?? onExportPdf);
  const hasWord = Boolean(onExportWord);
  const selectedPngCount = selectedPngPageIndexes.size;

  const pngButtonLabel = pngStatus === "exporting" ? "匯出中…"
    : pngStatus === "done" ? "已下載"
    : pngStatus === "error" ? "匯出失敗"
    : selectedPngCount === 0 ? "請選擇圖片"
    : `匯出 ${selectedPngCount} 張`;

  const pdfButtonLabel = pdfExportIndexes.length === 0 ? "請選擇頁面" : `匯出 ${pdfExportIndexes.length} 頁`;
  const pdfExporting = pdfActionStatus === "generating" || pdfActionStatus === "opening";
  const wordExporting = wordActionStatus === "generating" || wordActionStatus === "opening";
  const wordButtonLabel = wordMode === "semantic"
    ? "匯出可編輯 DOCX"
    : wordExportIndexes.length === 0 ? "請選擇頁面" : `匯出 ${wordExportIndexes.length} 頁`;

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <div
        className={placement === "toolbar" ? EXPORT_TOOLBAR_WRAP_CLASS : EXPORT_CONTROL_WRAP_CLASS}
        data-openpress-export-control
        data-openpress-export-placement={placement}
      >
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className={placement === "toolbar" ? TOOLBAR_ACTION_CLASS : ZOOM_CONTROL_CLASS}
            data-openpress-toolbar-active={placement === "toolbar" && dropdownOpen ? "true" : undefined}
            aria-label="匯出"
            title="匯出"
          >
            <FileDown aria-hidden="true" />
            {placement === "panel" ? <span>匯出</span> : null}
            {placement === "panel" ? <ChevronDown className={ZOOM_CHEVRON_CLASS} aria-hidden="true" /> : null}
          </Button>
        </DropdownMenuTrigger>

          <DropdownMenuContent
            className={EXPORT_DROPDOWN_CONTENT_CLASS}
            aria-label="匯出選項"
            align={placement === "toolbar" ? "end" : "center"}
            sideOffset={8}
          >
          <DropdownMenuGroup className={ZOOM_MENU_SECTION_CLASS}>
            {onOpenPresentation ? (
              <DropdownMenuItem
                className={EXPORT_MENU_ITEM_CLASS}
                onSelect={() => {
                  setDropdownOpen(false);
                  onOpenPresentation();
                }}
              >
                <Play aria-hidden="true" />
                <span>放映模式</span>
              </DropdownMenuItem>
            ) : null}
            {hasPdf ? (
              <DropdownMenuItem className={EXPORT_MENU_ITEM_CLASS} onSelect={openPdf}>
                <FileText aria-hidden="true" />
                <span>PDF</span>
              </DropdownMenuItem>
            ) : null}
            {hasWord ? (
              <DropdownMenuItem
                className={EXPORT_MENU_ITEM_CLASS}
                disabled={wordDisabled || wordExporting}
                onSelect={openWord}
              >
                <FileText aria-hidden="true" />
                <span>Word DOCX</span>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem className={EXPORT_MENU_ITEM_CLASS} onSelect={openPng}>
              <ImageIcon aria-hidden="true" />
              <span>PNG 圖片</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>

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
            <Button
              variant="ghost"
              size="sm"
              asChild
              className={EXPORT_ACTION_CLASS}
              onClick={closeDialog}
            >
              <a href={pdfHref} target="_blank" rel="noopener noreferrer">
                <Download aria-hidden="true" />
                <span>下載 PDF</span>
              </a>
            </Button>
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
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
            </Button>
          }
        >
          <div className={EXPORT_CONTENT_CLASS}>
            <div className={EXPORT_RANGE_CLASS}>
              <RadioGroup
                value={pdfRangeMode}
                onValueChange={(v) => setPdfRangeMode(v as PdfRangeMode)}
                className="flex flex-wrap items-center gap-x-4 gap-y-2"
              >
                <label className={EXPORT_RANGE_RADIO_CLASS}>
                  <RadioGroupItem value="all" className="h-3.5 w-3.5 border-[var(--op-workspace-border)]" />
                  <span>全部頁面（{pages.length} 頁）</span>
                </label>
                <label className={EXPORT_RANGE_RADIO_CLASS}>
                  <RadioGroupItem value="range" className="h-3.5 w-3.5 border-[var(--op-workspace-border)]" />
                  <span>自訂範圍</span>
                </label>
              </RadioGroup>
              {pdfRangeMode === "range" ? (
                <div className={EXPORT_RANGE_INPUTS_CLASS}>
                  <span>第</span>
                  <Input
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
                  <Input
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
                documentStyle={documentStyle}
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={EXPORT_ACTION_CLASS}
              disabled={pngStatus === "exporting" || selectedPngCount === 0}
              data-openpress-export-status={pngStatus}
              onClick={handleExportPng}
            >
              <Download aria-hidden="true" />
              <span>{pngButtonLabel}</span>
            </Button>
          }
        >
          <div className={EXPORT_CONTENT_CLASS}>
            <div className={EXPORT_SELECTION_BAR_CLASS}>
              <span>{selectedPngCount} / {pages.length} 張已選</span>
              <div className={EXPORT_SELECTION_ACTIONS_CLASS}>
                <Button type="button" variant="ghost" size="xs" className={EXPORT_SELECTION_ACTION_BUTTON_CLASS} onClick={selectAllPngPages}>全選</Button>
                <Button type="button" variant="ghost" size="xs" className={EXPORT_SELECTION_ACTION_BUTTON_CLASS} onClick={clearPngPages}>清除</Button>
              </div>
            </div>
            <div className={EXPORT_THUMBS_CLASS}>
              <PageThumbnails
                pages={pages}
                documentStyle={documentStyle}
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

      {activeDialog === "word" ? (
        <WorkbenchDialog
          titleId={wordTitleId}
          eyebrow="匯出"
          title="Word DOCX"
          closeLabel="關閉"
          className={EXPORT_WIDE_DIALOG_CLASS}
          footerClassName={EXPORT_DIALOG_FOOTER_CLASS}
          onClose={closeDialog}
          footer={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={EXPORT_ACTION_CLASS}
              disabled={wordDisabled || wordExporting || (wordMode === "visual" && wordExportIndexes.length === 0)}
              data-openpress-export-status={wordActionStatus}
              onClick={handleExportWord}
            >
              <AnimatePresence mode="wait" initial={false}>
                {wordExporting ? (
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
                    <span>{wordButtonLabel}</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          }
        >
          <div className={EXPORT_CONTENT_CLASS}>
            <div className={EXPORT_WORD_OPTIONS_CLASS}>
              <RadioGroup
                value={wordMode}
                onValueChange={(v) => setWordMode(v as WordExportMode)}
                className="grid gap-2"
              >
                <label className={EXPORT_WORD_OPTION_CLASS}>
                  <RadioGroupItem value="visual" className="mt-0.5 h-3.5 w-3.5 border-[var(--op-workspace-border)]" />
                  <span>
                    <span className={EXPORT_WORD_OPTION_TITLE_CLASS}>高還原</span>
                    <span className={EXPORT_WORD_OPTION_META_CLASS}>接近 PDF 視覺，建立時間較久</span>
                  </span>
                </label>
                <label className={EXPORT_WORD_OPTION_CLASS}>
                  <RadioGroupItem value="semantic" className="mt-0.5 h-3.5 w-3.5 border-[var(--op-workspace-border)]" />
                  <span>
                    <span className={EXPORT_WORD_OPTION_TITLE_CLASS}>可編輯</span>
                    <span className={EXPORT_WORD_OPTION_META_CLASS}>段落可編輯，版面較簡</span>
                  </span>
                </label>
              </RadioGroup>
            </div>
            {wordMode === "visual" ? (
              <>
                <div className={EXPORT_RANGE_CLASS}>
                  <RadioGroup
                    value={wordRangeMode}
                    onValueChange={(v) => setWordRangeMode(v as WordRangeMode)}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2"
                  >
                    <label className={EXPORT_RANGE_RADIO_CLASS}>
                      <RadioGroupItem value="all" className="h-3.5 w-3.5 border-[var(--op-workspace-border)]" />
                      <span>全部頁面（{pages.length} 頁）</span>
                    </label>
                    <label className={EXPORT_RANGE_RADIO_CLASS}>
                      <RadioGroupItem value="range" className="h-3.5 w-3.5 border-[var(--op-workspace-border)]" />
                      <span>自訂範圍</span>
                    </label>
                  </RadioGroup>
                  {wordRangeMode === "range" ? (
                    <div className={EXPORT_RANGE_INPUTS_CLASS}>
                      <span>第</span>
                      <Input
                        type="number"
                        className={EXPORT_RANGE_INPUT_CLASS}
                        min={1}
                        max={pages.length}
                        value={wordRangeStart}
                        onChange={(e) => {
                          const v = Math.max(1, Math.min(pages.length, Number(e.target.value) || 1));
                          setWordRangeStart(v);
                          if (v > wordRangeEnd) setWordRangeEnd(v);
                        }}
                      />
                      <span>～</span>
                      <Input
                        type="number"
                        className={EXPORT_RANGE_INPUT_CLASS}
                        min={1}
                        max={pages.length}
                        value={wordRangeEnd}
                        onChange={(e) => {
                          const v = Math.max(1, Math.min(pages.length, Number(e.target.value) || 1));
                          setWordRangeEnd(v);
                          if (v < wordRangeStart) setWordRangeStart(v);
                        }}
                      />
                      <span>頁</span>
                    </div>
                  ) : null}
                </div>
                <div className={EXPORT_THUMBS_CLASS}>
                  <PageThumbnails
                    pages={wordPreviewPages}
                    documentStyle={documentStyle}
                    currentPageIndex={-1}
                    onSelectPage={() => undefined}
                    theme={theme}
                    classNames={EXPORT_THUMB_CLASS_NAMES}
                  />
                </div>
              </>
            ) : (
              <div className={EXPORT_BODY_CLASS}>
                <p className={EXPORT_SUMMARY_CLASS}>共 {pages.length} 頁</p>
              </div>
            )}
          </div>
        </WorkbenchDialog>
      ) : null}
      </div>
    </DropdownMenu>
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
