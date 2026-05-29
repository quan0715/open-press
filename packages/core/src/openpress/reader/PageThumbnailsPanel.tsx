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
  theme,
}: {
  pages: HtmlPageBlock[];
  currentPageIndex: number;
  onSelectPage: (pageIndex: number, options?: { behavior?: ScrollBehavior }) => void;
  theme?: Theme;
}) {
  const pageWidthPx = parsePxLength(theme?.pageWidth) ?? FALLBACK_PAGE_WIDTH_PX;
  const pageHeightPx = parsePxLength(theme?.pageHeight) ?? pageWidthPx;
  // Compute aspect from the parsed dimensions so it always matches the
  // page render. theme.pageAspectRatio may be missing on per-Press
  // documents in multi-Press workspaces, which is why we don't read it
  // here.
  const aspectRatio = `${pageWidthPx} / ${pageHeightPx}`;

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
  onClick,
  pageWidthPx,
  pageHeightPx,
  aspectRatio,
}: {
  page: HtmlPageBlock;
  index: number;
  active: boolean;
  onClick: () => void;
  pageWidthPx: number;
  pageHeightPx: number;
  aspectRatio: string;
}) {
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

  const className = `openpress-thumb-card${active ? " is-active" : ""}`;
  // Wrap the page HTML using the same class structure as the main
  // reader (`.openpress-html-page > .openpress-html-page__html`) so
  // section-scoped CSS that targets those classes still applies in
  // the miniature.
  const pageClass = page.className
    ? `openpress-html-page ${page.className}`
    : "openpress-html-page";
  const stageStyle: CSSProperties = {
    width: `${pageWidthPx}px`,
    height: `${pageHeightPx}px`,
    transform: scale ? `translate(-50%, -50%) scale(${scale})` : "translate(-50%, -50%)",
    transformOrigin: "center center",
    position: "absolute",
    top: "50%",
    left: "50%",
    visibility: scale ? "visible" : "hidden",
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={className}
      data-openpress-thumb-index={index}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="openpress-thumb-card__surface" ref={surfaceRef} style={{ aspectRatio }}>
        <div className={pageClass} style={stageStyle} data-openpress-thumb-page="true">
          <div
            className="openpress-html-page__html"
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
