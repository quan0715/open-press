import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { HtmlPageBlock, Theme } from "../document-model";
import { Panel } from "../shared";

// Used by canvas-style Press (slides, social posts) that don't have an
// MDX-derived TOC. Renders each page as a clickable miniature so the user
// can navigate without bookmarks. The miniature embeds the same HTML
// that the main reader renders, scaled to fit the panel width.

const FALLBACK_PAGE_WIDTH_PX = 794; // A4 portrait at 96dpi — matches reader default.
const FALLBACK_ASPECT_RATIO = "1 / 1.414"; // A4 portrait.

export function PageThumbnails({
  pages,
  currentPageIndex,
  onSelectPage,
  theme,
}: {
  pages: HtmlPageBlock[];
  currentPageIndex: number;
  onSelectPage: (pageIndex: number, options?: { behavior?: ScrollBehavior }) => void;
  theme?: Theme;
}) {
  const pageWidthPx = parsePxLength(theme?.pageWidth) ?? FALLBACK_PAGE_WIDTH_PX;
  const aspectRatio = theme?.pageAspectRatio ?? FALLBACK_ASPECT_RATIO;

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
            onClick={() => onSelectPage(index, { behavior: "smooth" })}
            pageWidthPx={pageWidthPx}
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
  onClick,
  pageWidthPx,
  aspectRatio,
}: {
  page: HtmlPageBlock;
  index: number;
  active: boolean;
  onClick: () => void;
  pageWidthPx: number;
  aspectRatio: string;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  // The embedded page HTML is sized in absolute pixels (e.g. 1080×1080).
  // We measure the thumbnail surface and apply a scale transform so the
  // page fits exactly inside it. ResizeObserver keeps it in sync if the
  // panel is resized.
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      if (width > 0) setScale(width / pageWidthPx);
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageWidthPx]);

  const className = `openpress-thumb-card${active ? " is-active" : ""}`;
  const pageClass = page.className ? `openpress-public-page ${page.className}` : "openpress-public-page";
  const pageStyle: CSSProperties = {
    width: `${pageWidthPx}px`,
    aspectRatio,
    transform: scale ? `scale(${scale})` : undefined,
    transformOrigin: "top left",
    visibility: scale ? "visible" : "hidden",
  };

  return (
    <button
      type="button"
      className={className}
      data-openpress-thumb-index={index}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      <div className="openpress-thumb-card__surface" ref={surfaceRef} style={{ aspectRatio }}>
        <div className="openpress-thumb-card__page-host">
          <div
            className={pageClass}
            style={pageStyle}
            // Page HTML comes from the trusted build pipeline (same source
            // as the main reader).
            dangerouslySetInnerHTML={{ __html: page.html }}
          />
        </div>
      </div>
      <div className="openpress-thumb-card__meta">
        <span className="openpress-thumb-card__index">{String(index + 1).padStart(2, "0")}</span>
        <span className="openpress-thumb-card__title">{page.title || `Page ${index + 1}`}</span>
      </div>
    </button>
  );
}

function parsePxLength(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.trim().match(/^([\d.]+)\s*px$/i);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}
