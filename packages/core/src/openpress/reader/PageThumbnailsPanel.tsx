import { GripVertical, Plus } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "../core/cn";
import type { HtmlPageBlock, Theme } from "../document-model";
import { Panel } from "../shared";
import { PUBLIC_HTML_PAGE_CLASS, PUBLIC_HTML_PAGE_HTML_CLASS } from "./publicViewerClasses";
import { Button } from "@/openpress/ui/button";
import { matchesHotkey } from "../hotkeys";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/openpress/ui/context-menu";

// Used by canvas-style Press (slides, social posts) that don't have an
// MDX-derived TOC. Renders each page as a clickable miniature so the user
// can navigate without bookmarks. The miniature embeds the same HTML
// that the main reader renders, scaled to fit the panel width.

const FALLBACK_PAGE_WIDTH_PX = 794; // A4 portrait at 96dpi — matches reader default.
const THUMB_LIST_CLASS = [
  "flex min-h-0 flex-col gap-[10px] overflow-auto overscroll-contain",
  "!m-0 !list-none !pb-[10px] !pl-0 !pr-0 !pt-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
].join(" ");
const THUMB_CARD_CLASS = [
  "openpress-thumb-card grid w-full min-w-0 grid-cols-[20px_minmax(0,1fr)] items-stretch gap-1.5 overflow-hidden",
  "rounded-[7px] border border-[var(--op-workspace-border)] bg-[color-mix(in_srgb,var(--op-workspace-bg)_50%,transparent)] py-1.5 pl-0 pr-2",
  "cursor-pointer text-left text-inherit [font-family:inherit] transition-[border-color,box-shadow,transform] duration-150 ease-out",
  "hover:-translate-y-px hover:border-[var(--op-workspace-border-strong)]",
].join(" ");
const THUMB_CARD_ACTIVE_CLASS = "border-[var(--op-workspace-accent)] shadow-[inset_0_0_0_1px_var(--op-workspace-accent)]";
const THUMB_CARD_SKIPPED_CLASS = "opacity-[0.92]";
const THUMB_SURFACE_CLASS = [
  "openpress-thumb-card__surface relative col-start-2 row-start-1 grid w-full place-items-center overflow-hidden",
  "rounded border border-[var(--op-workspace-border)] bg-white",
].join(" ");
const THUMB_SURFACE_MISSING_CLASS = "bg-[linear-gradient(135deg,var(--op-workspace-surface-hover),var(--op-workspace-surface-muted)),var(--op-workspace-surface)]";
const THUMB_SURFACE_SKIP_OVERLAY_CLASS = "absolute inset-0 z-[3] bg-[color-mix(in_srgb,var(--op-workspace-surface)_62%,transparent)] pointer-events-none";
const THUMB_SKIP_MARK_CLASS = "openpress-thumb-card__skip-mark pointer-events-none absolute left-1/2 top-1/2 z-[4] h-5 w-[38px] -translate-x-1/2 -translate-y-1/2";
const THUMB_SKIP_MARK_EYE_CLASS = "absolute top-0.5 h-[13px] w-4 rounded-b-[18px] border-b-4 border-b-[var(--op-workspace-text-inverse)]";
const THUMB_FRAME_CLASS = "openpress-thumb-card__frame relative";
const THUMB_META_CLASS = [
  "openpress-thumb-card__meta col-start-1 row-start-1 grid min-w-0 grid-rows-[auto] items-center justify-items-center",
  "pb-px text-[11px] text-[var(--op-workspace-text-muted)]",
].join(" ");
const THUMB_INDEX_CLASS = [
  "openpress-thumb-card__index text-[11px] tracking-normal text-[var(--op-workspace-text-muted)]",
  "[font-family:var(--openpress-mono,ui-monospace,monospace)]",
].join(" ");
const THUMB_ACTIVE_INDEX_CLASS = "text-[var(--op-workspace-accent)]";
const THUMB_TITLE_CLASS = "openpress-thumb-card__title absolute h-px w-px overflow-hidden whitespace-nowrap [clip:rect(0_0_0_0)]";
const THUMB_DRAG_HANDLE_CLASS = [
  "openpress-thumb-card__drag-handle absolute left-1 top-1 z-[2] flex h-5 w-5 cursor-grab items-center justify-center",
  "rounded-[3px] border-0 bg-transparent p-0 text-white/50 opacity-0 transition-opacity duration-150",
  "group-hover:opacity-100 group-focus-within:opacity-100 active:cursor-grabbing [&_svg]:pointer-events-none",
].join(" ");
const THUMB_ADD_BUTTON_CLASS = [
  "openpress-thumb-add-button inline-flex w-full cursor-pointer items-center justify-center gap-[0.45rem]",
  "rounded-md border border-dashed border-[var(--op-workspace-border-strong)] bg-[var(--op-workspace-surface-muted)] px-3 py-[0.65rem]",
  "text-[0.78rem] font-bold text-[var(--op-workspace-text-muted)] [font-family:inherit]",
  "hover:border-[var(--op-workspace-border-strong)] hover:bg-[var(--op-workspace-surface-hover)] hover:text-[var(--op-workspace-text-soft)]",
  "focus-visible:border-[var(--op-workspace-border-strong)] focus-visible:bg-[var(--op-workspace-surface-hover)] focus-visible:text-[var(--op-workspace-text-soft)]",
  "[&_svg]:h-[15px] [&_svg]:w-[15px]",
].join(" ");
const THUMB_CONTEXT_MENU_CONTENT_CLASS = [
  "op-ui-menu openpress-thumb-context-menu min-w-[230px] rounded-[var(--op-workspace-radius-lg)] border border-[var(--op-workspace-border)]",
  "bg-[var(--op-workspace-surface-raised)] p-1.5 text-[var(--op-workspace-text)] shadow-[var(--op-workspace-shadow-popover)]",
].join(" ");
const THUMB_CONTEXT_MENU_ITEM_CLASS = [
  "op-ui-menu-item flex min-h-8 cursor-pointer items-center justify-between gap-6 rounded-[var(--op-workspace-radius-md)] px-2.5 py-2",
  "text-xs font-semibold leading-none text-[var(--op-workspace-text-soft)] focus:bg-[var(--op-workspace-surface-hover)] focus:text-[var(--op-workspace-text)]",
].join(" ");
const THUMB_CONTEXT_MENU_KBD_CLASS = "text-[var(--op-workspace-text-muted)] [font-family:inherit]";
const THUMB_EMPTY_CLASS = "openpress-asset-empty !m-0 !px-[30px] !py-0 !text-xs !leading-normal !text-[var(--op-workspace-text-muted)]";

type ThumbnailPage = HtmlPageBlock & {
  skipped?: boolean;
  missingPreview?: boolean;
};

export type PageThumbnailClassNames = {
  activeCard?: string;
  activeIndex?: string;
  card?: string;
  check?: string;
  index?: string;
  list?: string;
  selectedCard?: string;
  title?: string;
};

export function PageThumbnails({
  pages,
  currentPageIndex,
  onSelectPage,
  selectedPageIndexes,
  onTogglePage,
  onReorderPages,
  onAddPage,
  onDeletePage,
  onToggleSkipPage,
  skippedPageIds,
  theme,
  classNames,
}: {
  pages: ThumbnailPage[];
  currentPageIndex: number;
  onSelectPage: (pageIndex: number, options?: { behavior?: ScrollBehavior }) => void;
  selectedPageIndexes?: ReadonlySet<number>;
  onTogglePage?: (pageIndex: number) => void;
  onReorderPages?: (fromIndex: number, toIndex: number) => void;
  onAddPage?: () => void;
  onDeletePage?: (pageIndex: number) => void;
  onToggleSkipPage?: (pageIndex: number) => void;
  skippedPageIds?: ReadonlySet<string>;
  theme?: Theme;
  classNames?: PageThumbnailClassNames;
}) {
  const pageWidthPx = parsePxLength(theme?.pageWidth) ?? FALLBACK_PAGE_WIDTH_PX;
  const pageHeightPx = parsePxLength(theme?.pageHeight) ?? pageWidthPx;
  const aspectRatio = `${pageWidthPx} / ${pageHeightPx}`;

  // Local ordered copy used by Reorder.Group. Synced from props on external changes.
  const [orderedPages, setOrderedPages] = useState(pages);
  useEffect(() => { setOrderedPages(pages); }, [pages]);

  const selectionMode = Boolean(selectedPageIndexes && onTogglePage);

  const handleReorder = (newOrder: HtmlPageBlock[]) => {
    setOrderedPages(newOrder);
    if (!onReorderPages) return;
    const fromIndex = pages.indexOf(newOrder.find((p, i) => p !== orderedPages[i]) ?? newOrder[0]);
    const toIndex = newOrder.indexOf(newOrder.find((p, i) => p !== orderedPages[i]) ?? newOrder[0]);
    if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
      onReorderPages(fromIndex, toIndex);
    }
  };

  if (pages.length === 0) {
    return <Panel.Empty className={THUMB_EMPTY_CLASS} role="status">尚無頁面</Panel.Empty>;
  }

  if (!onReorderPages) {
    return (
      <>
        <ul className={thumbnailListClassName(classNames?.list)} aria-label="頁面縮圖">
          {pages.map((page, index) => (
            <li key={page.id}>
              <ThumbnailCard
                page={page}
                index={index}
                active={index === currentPageIndex}
                selected={selectedPageIndexes?.has(index) ?? false}
                selectionMode={selectionMode}
                draggable={false}
                onClick={() => {
                  if (selectionMode) { onTogglePage!(index); return; }
                  onSelectPage(index, { behavior: "smooth" });
                }}
                onDelete={onDeletePage ? () => onDeletePage(index) : undefined}
                onAddPage={onAddPage}
                onToggleSkipPage={onToggleSkipPage ? () => onToggleSkipPage(index) : undefined}
                skippedPageIds={skippedPageIds}
                aspectRatio={aspectRatio}
                pageWidthPx={pageWidthPx}
                pageHeightPx={pageHeightPx}
                classNames={classNames}
              />
            </li>
          ))}
        </ul>
        <AddSlideButton onAddPage={onAddPage} />
      </>
    );
  }

  return (
    <>
      <Reorder.Group
        as="ul"
        axis="y"
        values={orderedPages}
        onReorder={handleReorder}
        className={thumbnailListClassName(classNames?.list)}
        aria-label="頁面縮圖"
        layoutScroll
      >
        {orderedPages.map((page, index) => {
          const pageIndex = pages.indexOf(page);
          return (
            <ReorderThumbnailItem
              key={page.id}
              page={page}
              index={index}
              active={page === pages[currentPageIndex]}
              selected={selectedPageIndexes?.has(pageIndex) ?? false}
              selectionMode={selectionMode}
              onClick={() => {
                if (selectionMode) { onTogglePage!(pageIndex); return; }
                onSelectPage(pageIndex, { behavior: "smooth" });
              }}
              onDelete={onDeletePage ? () => onDeletePage(pageIndex) : undefined}
              onAddPage={onAddPage}
              onToggleSkipPage={onToggleSkipPage ? () => onToggleSkipPage(pageIndex) : undefined}
              skippedPageIds={skippedPageIds}
              aspectRatio={aspectRatio}
              pageWidthPx={pageWidthPx}
              pageHeightPx={pageHeightPx}
              classNames={classNames}
            />
          );
        })}
      </Reorder.Group>
      <AddSlideButton onAddPage={onAddPage} />
    </>
  );
}

function AddSlideButton({ onAddPage }: { onAddPage?: () => void }) {
  if (!onAddPage) return null;
  return (
    <Button
      type="button"
      variant="outline"
      className={THUMB_ADD_BUTTON_CLASS}
      onClick={onAddPage}
    >
      <Plus aria-hidden="true" />
      <span>Add slide</span>
    </Button>
  );
}

function ReorderThumbnailItem({
  page,
  index,
  active,
  selected,
  selectionMode,
  onClick,
  onDelete,
  onAddPage,
  onToggleSkipPage,
  skippedPageIds,
  aspectRatio,
  pageWidthPx,
  pageHeightPx,
  classNames,
}: {
  page: ThumbnailPage;
  index: number;
  active: boolean;
  selected: boolean;
  selectionMode: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onAddPage?: () => void;
  onToggleSkipPage?: () => void;
  skippedPageIds?: ReadonlySet<string>;
  aspectRatio: string;
  pageWidthPx: number;
  pageHeightPx: number;
  classNames?: PageThumbnailClassNames;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      as="li"
      value={page}
      dragListener={false}
      dragControls={dragControls}
      style={{ position: "relative" }}
    >
      <ThumbnailCard
        page={page}
        index={index}
        active={active}
        selected={selected}
        selectionMode={selectionMode}
        draggable
        dragControls={dragControls}
        onClick={onClick}
        onDelete={onDelete}
        onAddPage={onAddPage}
        onToggleSkipPage={onToggleSkipPage}
        skippedPageIds={skippedPageIds}
        aspectRatio={aspectRatio}
        pageWidthPx={pageWidthPx}
        pageHeightPx={pageHeightPx}
        classNames={classNames}
      />
    </Reorder.Item>
  );
}

function ThumbnailCard({
  page,
  index,
  active,
  selected,
  selectionMode,
  draggable,
  dragControls,
  onClick,
  onDelete,
  onAddPage,
  onToggleSkipPage,
  skippedPageIds,
  pageWidthPx,
  pageHeightPx,
  aspectRatio,
  classNames,
}: {
  page: ThumbnailPage;
  index: number;
  active: boolean;
  selected: boolean;
  selectionMode: boolean;
  draggable: boolean;
  dragControls?: ReturnType<typeof useDragControls>;
  onClick: () => void;
  onDelete?: () => void;
  onAddPage?: () => void;
  onToggleSkipPage?: () => void;
  skippedPageIds?: ReadonlySet<string>;
  pageWidthPx: number;
  pageHeightPx: number;
  aspectRatio: string;
  classNames?: PageThumbnailClassNames;
}) {
  const hasContextMenu = Boolean(onAddPage || onDelete || onToggleSkipPage);
  const isSkippedInMenu = typeof page.frameKey === "string" && skippedPageIds?.has(page.frameKey) === true;
  const cardRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setScale(Math.min(w / pageWidthPx, h / pageHeightPx));
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageWidthPx, pageHeightPx]);

  useEffect(() => {
    if (!active) return;
    cardRef.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const className = cn(
    THUMB_CARD_CLASS,
    "group",
    active ? "is-active" : undefined,
    selected ? "is-selected" : undefined,
    page.skipped ? "is-skipped" : undefined,
    page.missingPreview ? "is-missing-preview" : undefined,
    active ? THUMB_CARD_ACTIVE_CLASS : undefined,
    page.skipped ? THUMB_CARD_SKIPPED_CLASS : undefined,
    classNames?.card,
    active ? classNames?.activeCard : undefined,
    selected ? classNames?.selectedCard : undefined,
  );

  const pageClass = page.className
    ? `${PUBLIC_HTML_PAGE_CLASS} ${page.className}`
    : PUBLIC_HTML_PAGE_CLASS;
  const scaledWidth = scale ? pageWidthPx * scale : 0;
  const scaledHeight = scale ? pageHeightPx * scale : 0;
  const frameStyle: CSSProperties = {
    width: `${scaledWidth}px`,
    height: `${scaledHeight}px`,
    position: "relative",
    visibility: scale ? "visible" : "hidden",
  };
  const pageStyle: CSSProperties = {
    "--openpress-page-width": `${pageWidthPx}px`,
    "--openpress-page-height": `${pageHeightPx}px`,
    width: `${pageWidthPx}px`,
    height: `${pageHeightPx}px`,
    transform: scale ? `scale(${scale})` : undefined,
    transformOrigin: "top left",
    position: "absolute",
    top: 0,
    left: 0,
  } as CSSProperties;
  const pageTitle = page.title || `Page ${index + 1}`;
  const ariaLabel = selectionMode
    ? `選取第 ${index + 1} 頁：${pageTitle}${page.skipped ? "（已略過）" : ""}`
    : `前往第 ${index + 1} 頁：${pageTitle}${page.skipped ? "（已略過）" : ""}`;

  const cardEl = (
    <div
      ref={cardRef}
      role={selectionMode ? "checkbox" : "button"}
      tabIndex={0}
      className={className}
      data-openpress-thumb-index={index}
      data-openpress-thumb-selected={selectionMode ? (selected ? "true" : "false") : undefined}
      aria-label={ariaLabel}
      aria-checked={selectionMode ? selected : undefined}
      aria-current={!selectionMode && active ? "page" : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (matchesHotkey("thumbnails.delete", event) && onDelete) {
          event.preventDefault();
          event.stopPropagation();
          onDelete();
          return;
        }
        if (matchesHotkey("thumbnails.activate", event)) {
          event.preventDefault();
          event.stopPropagation();
          onClick();
        }
      }}
    >
      {draggable && dragControls ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={THUMB_DRAG_HANDLE_CLASS}
          onPointerDown={(e) => {
            e.preventDefault();
            dragControls.start(e);
          }}
          aria-label={`拖曳第 ${index + 1} 頁`}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical aria-hidden="true" />
        </Button>
      ) : null}
      {selectionMode ? (
        <span
          className={cn(
            "openpress-thumb-card__check absolute right-2 top-2 z-[2] inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/30 bg-[color-mix(in_srgb,var(--op-workspace-surface)_82%,transparent)] text-[13px] font-bold leading-none text-[var(--op-workspace-accent)] shadow-[var(--op-workspace-shadow-floating)]",
            selected ? undefined : "text-transparent",
            classNames?.check,
          )}
          aria-hidden="true"
        >
          {selected ? "✓" : ""}
        </span>
      ) : null}
      <div
        className={cn(THUMB_SURFACE_CLASS, page.missingPreview ? THUMB_SURFACE_MISSING_CLASS : undefined)}
        ref={surfaceRef}
        style={{ aspectRatio }}
      >
        {page.skipped ? <span className={THUMB_SURFACE_SKIP_OVERLAY_CLASS} aria-hidden="true" /> : null}
        <div className={THUMB_FRAME_CLASS} style={frameStyle}>
          <div className={pageClass} style={pageStyle} data-openpress-thumb-page="true">
            <div
              className={`${PUBLIC_HTML_PAGE_HTML_CLASS} pointer-events-none select-none`}
              // Page HTML comes from the trusted build pipeline (same source
              // as the main reader).
              dangerouslySetInnerHTML={{ __html: page.html }}
            />
          </div>
        </div>
        {page.skipped ? (
          <span className={THUMB_SKIP_MARK_CLASS} aria-hidden="true">
            <span className={cn(THUMB_SKIP_MARK_EYE_CLASS, "left-px rotate-[25deg]")} />
            <span className={cn(THUMB_SKIP_MARK_EYE_CLASS, "right-px -rotate-[25deg]")} />
          </span>
        ) : null}
      </div>
      <div className={THUMB_META_CLASS}>
        <span className={cn(THUMB_INDEX_CLASS, active ? THUMB_ACTIVE_INDEX_CLASS : undefined, classNames?.index, active ? classNames?.activeIndex : undefined)}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className={cn(THUMB_TITLE_CLASS, classNames?.title)}>{pageTitle}</span>
      </div>
    </div>
  );

  if (!hasContextMenu) return cardEl;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{cardEl}</ContextMenuTrigger>
      <ContextMenuContent className={THUMB_CONTEXT_MENU_CONTENT_CLASS}>
        {onDelete ? (
          <ContextMenuItem className={THUMB_CONTEXT_MENU_ITEM_CLASS} onSelect={onDelete}>
            <span>Delete</span>
            <kbd className={THUMB_CONTEXT_MENU_KBD_CLASS}>⌫</kbd>
          </ContextMenuItem>
        ) : null}
        {onAddPage ? (
          <ContextMenuItem className={THUMB_CONTEXT_MENU_ITEM_CLASS} onSelect={onAddPage}>
            <span>Create new slide</span>
            <kbd className={THUMB_CONTEXT_MENU_KBD_CLASS}>⇧S</kbd>
          </ContextMenuItem>
        ) : null}
        {onToggleSkipPage ? (
          <ContextMenuItem className={THUMB_CONTEXT_MENU_ITEM_CLASS} onSelect={onToggleSkipPage}>
            <span>{isSkippedInMenu ? "Unskip slide" : "Skip slide"}</span>
          </ContextMenuItem>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
}

function thumbnailListClassName(customClassName?: string) {
  return cn("openpress-thumb-list", customClassName ?? THUMB_LIST_CLASS);
}

function parsePxLength(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.trim().match(/^([\d.]+)\s*(px|mm|cm|in)$/i);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = match[2].toLowerCase();
  switch (unit) {
    case "px": return n;
    case "mm": return n * (96 / 25.4);
    case "cm": return n * (96 / 2.54);
    case "in": return n * 96;
    default: return null;
  }
}
