import { GripVertical, Plus } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { cn } from "../core/cn";
import type { HtmlPageBlock, Theme } from "../document-model";
import { Panel } from "../shared";
import { PUBLIC_HTML_PAGE_CLASS, PUBLIC_HTML_PAGE_HTML_CLASS } from "./publicViewerClasses";

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
  "rounded-[7px] border border-[rgb(242_242_240_/_0.12)] bg-[rgb(20_20_20_/_0.5)] py-1.5 pl-0 pr-2",
  "cursor-pointer text-left text-inherit [font:inherit] transition-[border-color,box-shadow,transform] duration-150 ease-out",
  "hover:-translate-y-px hover:border-[rgb(242_242_240_/_0.26)]",
].join(" ");
const THUMB_CARD_ACTIVE_CLASS = "border-[var(--openpress-accent,#df4b21)] shadow-[inset_0_0_0_1px_var(--openpress-accent,#df4b21)]";
const THUMB_CARD_SKIPPED_CLASS = "opacity-[0.92]";
const THUMB_SURFACE_CLASS = [
  "openpress-thumb-card__surface relative col-start-2 row-start-1 grid w-full place-items-center overflow-hidden",
  "rounded border border-[rgb(242_242_240_/_0.12)] bg-white",
].join(" ");
const THUMB_SURFACE_MISSING_CLASS = "bg-[linear-gradient(135deg,rgb(255_255_255_/_0.08),rgb(255_255_255_/_0.02)),rgb(18_18_18)]";
const THUMB_SURFACE_SKIP_OVERLAY_CLASS = "absolute inset-0 z-[3] bg-[rgb(18_18_18_/_0.62)] pointer-events-none";
const THUMB_SKIP_MARK_CLASS = "openpress-thumb-card__skip-mark pointer-events-none absolute left-1/2 top-1/2 z-[4] h-5 w-[38px] -translate-x-1/2 -translate-y-1/2";
const THUMB_SKIP_MARK_EYE_CLASS = "absolute top-0.5 h-[13px] w-4 rounded-b-[18px] border-b-4 border-b-[rgb(255_255_255_/_0.92)]";
const THUMB_FRAME_CLASS = "openpress-thumb-card__frame relative";
const THUMB_META_CLASS = [
  "openpress-thumb-card__meta col-start-1 row-start-1 grid min-w-0 grid-rows-[auto] items-center justify-items-center",
  "pb-px text-[11px] text-[rgb(242_242_240_/_0.58)]",
].join(" ");
const THUMB_INDEX_CLASS = [
  "openpress-thumb-card__index text-[11px] tracking-normal text-[rgb(242_242_240_/_0.68)]",
  "[font-family:var(--openpress-mono,ui-monospace,monospace)]",
].join(" ");
const THUMB_ACTIVE_INDEX_CLASS = "text-[var(--openpress-accent,#df4b21)]";
const THUMB_TITLE_CLASS = "openpress-thumb-card__title absolute h-px w-px overflow-hidden whitespace-nowrap [clip:rect(0_0_0_0)]";
const THUMB_DRAG_HANDLE_CLASS = [
  "openpress-thumb-card__drag-handle absolute left-1 top-1 z-[2] flex h-5 w-5 cursor-grab items-center justify-center",
  "rounded-[3px] border-0 bg-transparent p-0 text-white/50 opacity-0 transition-opacity duration-150",
  "group-hover:opacity-100 group-focus-within:opacity-100 active:cursor-grabbing [&_svg]:pointer-events-none",
].join(" ");
const THUMB_ADD_BUTTON_CLASS = [
  "openpress-thumb-add-button inline-flex w-full cursor-pointer items-center justify-center gap-[0.45rem]",
  "rounded-md border border-dashed border-[rgb(242_242_240_/_0.26)] bg-[rgb(242_242_240_/_0.07)] px-3 py-[0.65rem]",
  "text-[0.78rem] font-bold text-[rgb(242_242_240_/_0.68)] [font:inherit]",
  "hover:border-[rgb(242_242_240_/_0.46)] hover:bg-[rgb(242_242_240_/_0.12)] hover:text-[rgb(242_242_240_/_0.88)]",
  "focus-visible:border-[rgb(242_242_240_/_0.46)] focus-visible:bg-[rgb(242_242_240_/_0.12)] focus-visible:text-[rgb(242_242_240_/_0.88)]",
  "[&_svg]:h-[15px] [&_svg]:w-[15px]",
].join(" ");
const THUMB_CONTEXT_MENU_CLASS = [
  "openpress-thumb-context-menu fixed z-[80] min-w-[230px] rounded-[14px] border border-white/[0.12]",
  "bg-[rgb(28_28_28_/_0.96)] p-[0.45rem] text-[rgb(255_255_255_/_0.92)] shadow-[0_18px_46px_rgb(0_0_0_/_0.34)]",
].join(" ");
const THUMB_CONTEXT_MENU_BUTTON_CLASS = [
  "flex w-full cursor-pointer items-center justify-between gap-6 rounded-[9px] border-0 bg-transparent px-[0.8rem] py-[0.7rem]",
  "text-left text-[0.92rem] leading-[1.1] text-inherit [font:inherit] hover:bg-white/10 focus-visible:bg-white/10",
].join(" ");
const THUMB_CONTEXT_MENU_KBD_CLASS = "text-white/55 [font:inherit]";
const THUMB_EMPTY_CLASS = "openpress-asset-empty !m-0 !px-[30px] !py-0 !text-xs !leading-normal !text-[#696f75]";

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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; pageIndex: number } | null>(null);
  useEffect(() => { setOrderedPages(pages); }, [pages]);
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [contextMenu]);

  const selectionMode = Boolean(selectedPageIndexes && onTogglePage);
  const openContextMenu = (pageIndex: number, event: MouseEvent) => {
    if (!onAddPage && !onDeletePage && !onToggleSkipPage) return;
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, pageIndex });
  };
  const contextMenuPage = contextMenu ? pages[contextMenu.pageIndex] : undefined;
  const contextMenuSlideId = contextMenuPage?.frameKey;
  const contextMenuSkipped = typeof contextMenuSlideId === "string" && skippedPageIds?.has(contextMenuSlideId) === true;

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
                onContextMenu={(event) => openContextMenu(index, event)}
                aspectRatio={aspectRatio}
                pageWidthPx={pageWidthPx}
                pageHeightPx={pageHeightPx}
                classNames={classNames}
              />
            </li>
          ))}
        </ul>
        <SlideThumbnailContextMenu
          menu={contextMenu}
          isSkipped={contextMenuSkipped}
          onAddPage={onAddPage}
          onDeletePage={onDeletePage && contextMenu ? () => onDeletePage(contextMenu.pageIndex) : undefined}
          onToggleSkipPage={onToggleSkipPage && contextMenu ? () => onToggleSkipPage(contextMenu.pageIndex) : undefined}
          onClose={() => setContextMenu(null)}
        />
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
              onContextMenu={(event) => openContextMenu(pageIndex, event)}
              aspectRatio={aspectRatio}
              pageWidthPx={pageWidthPx}
              pageHeightPx={pageHeightPx}
              classNames={classNames}
            />
          );
        })}
      </Reorder.Group>
      <SlideThumbnailContextMenu
        menu={contextMenu}
        isSkipped={contextMenuSkipped}
        onAddPage={onAddPage}
        onDeletePage={onDeletePage && contextMenu ? () => onDeletePage(contextMenu.pageIndex) : undefined}
        onToggleSkipPage={onToggleSkipPage && contextMenu ? () => onToggleSkipPage(contextMenu.pageIndex) : undefined}
        onClose={() => setContextMenu(null)}
      />
      <AddSlideButton onAddPage={onAddPage} />
    </>
  );
}

function AddSlideButton({ onAddPage }: { onAddPage?: () => void }) {
  if (!onAddPage) return null;
  return (
    <button
      type="button"
      className={THUMB_ADD_BUTTON_CLASS}
      onClick={onAddPage}
    >
      <Plus aria-hidden="true" />
      <span>Add slide</span>
    </button>
  );
}

function SlideThumbnailContextMenu({
  menu,
  isSkipped,
  onAddPage,
  onDeletePage,
  onToggleSkipPage,
  onClose,
}: {
  menu: { x: number; y: number; pageIndex: number } | null;
  isSkipped: boolean;
  onAddPage?: () => void;
  onDeletePage?: () => void;
  onToggleSkipPage?: () => void;
  onClose: () => void;
}) {
  if (!menu) return null;
  const run = (action?: () => void) => {
    onClose();
    action?.();
  };

  return (
    <div
      className={THUMB_CONTEXT_MENU_CLASS}
      style={{ left: menu.x, top: menu.y }}
      role="menu"
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      {onDeletePage ? (
        <button type="button" className={THUMB_CONTEXT_MENU_BUTTON_CLASS} role="menuitem" onClick={() => run(onDeletePage)}>
          <span>Delete</span>
          <kbd className={THUMB_CONTEXT_MENU_KBD_CLASS}>⌫</kbd>
        </button>
      ) : null}
      {onAddPage ? (
        <button type="button" className={THUMB_CONTEXT_MENU_BUTTON_CLASS} role="menuitem" onClick={() => run(onAddPage)}>
          <span>Create new slide</span>
          <kbd className={THUMB_CONTEXT_MENU_KBD_CLASS}>⇧S</kbd>
        </button>
      ) : null}
      {onToggleSkipPage ? (
        <button type="button" className={THUMB_CONTEXT_MENU_BUTTON_CLASS} role="menuitem" onClick={() => run(onToggleSkipPage)}>
          <span>{isSkipped ? "Unskip slide" : "Skip slide"}</span>
        </button>
      ) : null}
    </div>
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
  onContextMenu,
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
  onContextMenu?: (event: MouseEvent) => void;
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
        onContextMenu={onContextMenu}
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
  onContextMenu,
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
  onContextMenu?: (event: MouseEvent) => void;
  pageWidthPx: number;
  pageHeightPx: number;
  aspectRatio: string;
  classNames?: PageThumbnailClassNames;
}) {
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

  return (
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
      onContextMenu={onContextMenu}
      onKeyDown={(event) => {
        if ((event.key === "Delete" || event.key === "Backspace") && onDelete) {
          event.preventDefault();
          event.stopPropagation();
          onDelete();
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      {draggable && dragControls ? (
        <button
          type="button"
          className={THUMB_DRAG_HANDLE_CLASS}
          onPointerDown={(e) => {
            e.preventDefault();
            dragControls.start(e);
          }}
          aria-label={`拖曳第 ${index + 1} 頁`}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical aria-hidden="true" />
        </button>
      ) : null}
      {selectionMode ? (
        <span
          className={cn(
            "openpress-thumb-card__check absolute right-2 top-2 z-[2] inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/30 bg-[rgb(18_18_18_/_0.82)] text-[13px] font-bold leading-none text-[var(--openpress-workbench-accent)] shadow-[0_6px_18px_rgb(0_0_0_/_0.28)]",
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
