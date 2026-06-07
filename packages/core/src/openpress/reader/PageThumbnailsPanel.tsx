import { GripVertical } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from "react";
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
  // Compute aspect from the parsed dimensions so it always matches the
  // page render. theme.pageAspectRatio may be missing on per-Press
  // documents in multi-Press workspaces, which is why we don't read it
  // here.
  const aspectRatio = `${pageWidthPx} / ${pageHeightPx}`;
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDrop = (fromIndex: number, toIndex: number) => {
    setDragOverIndex(null);
    if (fromIndex !== toIndex) onReorderPages?.(fromIndex, toIndex);
  };

  if (pages.length === 0) {
    return <Panel.Empty className="openpress-asset-empty" role="status">尚無頁面</Panel.Empty>;
  }

  return (
    <ul className="openpress-thumb-list" aria-label="頁面縮圖">
      {pages.map((page, index) => (
        <li key={page.id}>
          <ThumbnailCard
            page={page}
            index={index}
            active={index === currentPageIndex}
            selected={selectedPageIndexes?.has(index) ?? false}
            selectionMode={Boolean(selectedPageIndexes && onTogglePage)}
            draggable={Boolean(onReorderPages)}
            dragOver={dragOverIndex === index}
            onClick={() => {
              if (selectedPageIndexes && onTogglePage) {
                onTogglePage(index);
                return;
              }
              onSelectPage(index, { behavior: "smooth" });
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverIndex(index);
            }}
            onDrop={(fromIndex) => handleDrop(fromIndex, index)}
            onDragLeave={() => setDragOverIndex(null)}
            pageWidthPx={pageWidthPx}
            pageHeightPx={pageHeightPx}
            aspectRatio={aspectRatio}
          />
        </li>
      ))}
    </ul>
  );
}

function ThumbnailCard({
  page,
  index,
  active,
  selected,
  selectionMode,
  draggable,
  dragOver,
  onClick,
  onDragOver,
  onDrop,
  onDragLeave,
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
  dragOver: boolean;
  onClick: () => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (fromIndex: number) => void;
  onDragLeave: () => void;
  pageWidthPx: number;
  pageHeightPx: number;
  aspectRatio: string;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
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
    dragOver ? "is-drag-over" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Wrap the page HTML using the same class structure as the main
  // reader (`.openpress-html-page > .openpress-html-page__html`) so
  // section-scoped CSS that targets those classes still applies in
  // the miniature.
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

  const handleDragStart = (e: DragEvent<HTMLButtonElement>) => {
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleCardDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const fromIndex = Number(e.dataTransfer.getData("text/plain"));
    if (!Number.isNaN(fromIndex)) onDrop(fromIndex);
  };

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
      onDragOver={draggable ? onDragOver : undefined}
      onDrop={draggable ? handleCardDrop : undefined}
      onDragLeave={draggable ? onDragLeave : undefined}
    >
      {draggable ? (
        <button
          type="button"
          className="openpress-thumb-card__drag-handle"
          draggable
          onDragStart={handleDragStart}
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
