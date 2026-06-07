import { GripVertical } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { HtmlPageBlock, Theme } from "../document-model";
import { Panel } from "../shared";

// Used by canvas-style Press (slides, social posts) that don't have an
// MDX-derived TOC. Renders each page as a clickable miniature so the user
// can navigate without bookmarks. The miniature embeds the same HTML
// that the main reader renders, scaled to fit the panel width.

const FALLBACK_PAGE_WIDTH_PX = 794; // A4 portrait at 96dpi — matches reader default.

export function PageThumbnails({
  pages,
  currentPageIndex,
  onSelectPage,
  selectedPageIndexes,
  onTogglePage,
  onReorderPages,
  theme,
}: {
  pages: HtmlPageBlock[];
  currentPageIndex: number;
  onSelectPage: (pageIndex: number, options?: { behavior?: ScrollBehavior }) => void;
  selectedPageIndexes?: ReadonlySet<number>;
  onTogglePage?: (pageIndex: number) => void;
  onReorderPages?: (fromIndex: number, toIndex: number) => void;
  theme?: Theme;
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
    return <Panel.Empty className="openpress-asset-empty" role="status">尚無頁面</Panel.Empty>;
  }

  if (!onReorderPages) {
    return (
      <ul className="openpress-thumb-list" aria-label="頁面縮圖">
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
              aspectRatio={aspectRatio}
              pageWidthPx={pageWidthPx}
              pageHeightPx={pageHeightPx}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Reorder.Group
      as="ul"
      axis="y"
      values={orderedPages}
      onReorder={handleReorder}
      className="openpress-thumb-list"
      aria-label="頁面縮圖"
      layoutScroll
    >
      {orderedPages.map((page, index) => (
        <ReorderThumbnailItem
          key={page.id}
          page={page}
          index={index}
          active={page === pages[currentPageIndex]}
          selected={selectedPageIndexes?.has(pages.indexOf(page)) ?? false}
          selectionMode={selectionMode}
          onClick={() => {
            if (selectionMode) { onTogglePage!(pages.indexOf(page)); return; }
            onSelectPage(pages.indexOf(page), { behavior: "smooth" });
          }}
          aspectRatio={aspectRatio}
          pageWidthPx={pageWidthPx}
          pageHeightPx={pageHeightPx}
        />
      ))}
    </Reorder.Group>
  );
}

function ReorderThumbnailItem({
  page,
  index,
  active,
  selected,
  selectionMode,
  onClick,
  aspectRatio,
  pageWidthPx,
  pageHeightPx,
}: {
  page: HtmlPageBlock;
  index: number;
  active: boolean;
  selected: boolean;
  selectionMode: boolean;
  onClick: () => void;
  aspectRatio: string;
  pageWidthPx: number;
  pageHeightPx: number;
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
        aspectRatio={aspectRatio}
        pageWidthPx={pageWidthPx}
        pageHeightPx={pageHeightPx}
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
  pageWidthPx,
  pageHeightPx,
  aspectRatio,
}: {
  page: HtmlPageBlock;
  index: number;
  active: boolean;
  selected: boolean;
  selectionMode: boolean;
  draggable: boolean;
  dragControls?: ReturnType<typeof useDragControls>;
  onClick: () => void;
  pageWidthPx: number;
  pageHeightPx: number;
  aspectRatio: string;
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

  const className = [
    "openpress-thumb-card",
    active ? "is-active" : "",
    selected ? "is-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const pageClass = page.className
    ? `openpress-html-page ${page.className}`
    : "openpress-html-page";
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

  return (
    <div
      ref={cardRef}
      role={selectionMode ? "checkbox" : "button"}
      tabIndex={0}
      className={className}
      data-openpress-thumb-index={index}
      data-openpress-thumb-selected={selectionMode ? (selected ? "true" : "false") : undefined}
      aria-label={selectionMode ? `選取第 ${index + 1} 頁：${pageTitle}` : `前往第 ${index + 1} 頁：${pageTitle}`}
      aria-checked={selectionMode ? selected : undefined}
      aria-current={!selectionMode && active ? "page" : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      {draggable && dragControls ? (
        <button
          type="button"
          className="openpress-thumb-card__drag-handle"
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
        <span className="openpress-thumb-card__check" aria-hidden="true">
          {selected ? "✓" : ""}
        </span>
      ) : null}
      <div className="openpress-thumb-card__surface" ref={surfaceRef} style={{ aspectRatio }}>
        <div className="openpress-thumb-card__frame" style={frameStyle}>
          <div className={pageClass} style={pageStyle} data-openpress-thumb-page="true">
            <div
              className="openpress-html-page__html"
              // Page HTML comes from the trusted build pipeline (same source
              // as the main reader).
              dangerouslySetInnerHTML={{ __html: page.html }}
            />
          </div>
        </div>
      </div>
      <div className="openpress-thumb-card__meta">
        <span className="openpress-thumb-card__index">{String(index + 1).padStart(2, "0")}</span>
        <span className="openpress-thumb-card__title">{pageTitle}</span>
      </div>
    </div>
  );
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
