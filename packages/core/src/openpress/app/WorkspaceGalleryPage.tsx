import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { HtmlPageBlock, ReaderDocument, WorkspaceManifest, WorkspaceManifestPress } from "../document-model";

type GalleryFilter = "all" | "pages" | "slides";

interface Props {
  manifest: WorkspaceManifest;
  onSelectPress: (press: WorkspaceManifestPress) => void;
}

export function WorkspaceGalleryPage({ manifest, onSelectPress }: Props) {
  const heading = manifest.name ?? "Workspace";
  const [filter, setFilter] = useState<GalleryFilter>("all");

  const counts = {
    all: manifest.presses.length,
    pages: manifest.presses.filter((p) => p.type === "pages").length,
    slides: manifest.presses.filter((p) => p.type === "slides").length,
  };

  const visiblePresses = filter === "all"
    ? manifest.presses
    : manifest.presses.filter((p) => p.type === filter);

  return (
    <main className="openpress-workspace-gallery" aria-labelledby="workspace-gallery-heading">
      <header className="openpress-workspace-gallery__header">
        <div className="openpress-workspace-gallery__headline">
          <p className="openpress-workspace-gallery__brand">
            <span className="openpress-workspace-gallery__brand-mark">open-press</span>
            <span className="openpress-workspace-gallery__brand-sep" aria-hidden="true">/</span>
            <span className="openpress-workspace-gallery__eyebrow">Workspace</span>
          </p>
          <h1 id="workspace-gallery-heading">{heading}</h1>
        </div>
      </header>

      <div className="openpress-workspace-gallery__body">
        <nav className="openpress-workspace-gallery__sidebar" aria-label="文件類型篩選">
          <FilterButton label="All" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterButton label="Pages" count={counts.pages} active={filter === "pages"} onClick={() => setFilter("pages")} />
          <FilterButton label="Slides" count={counts.slides} active={filter === "slides"} onClick={() => setFilter("slides")} />
        </nav>

        <section className="openpress-workspace-gallery__main" aria-label={`${filter} 文件`}>
          {visiblePresses.length > 0 ? (
            <ul className="openpress-workspace-gallery__grid" role="list">
              {visiblePresses.map((press) => (
                <li key={press.slug || "root"} className="openpress-workspace-gallery__item">
                  <PressCard press={press} onSelect={() => onSelectPress(press)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="openpress-workspace-gallery__empty">No {filter} documents.</p>
          )}
        </section>
      </div>
    </main>
  );
}

function FilterButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="openpress-workspace-gallery__filter-btn"
      aria-pressed={active}
      data-active={active ? "true" : "false"}
      onClick={onClick}
    >
      <span className="openpress-workspace-gallery__filter-label">{label}</span>
      <span className="openpress-workspace-gallery__filter-count">{String(count).padStart(2, "0")}</span>
    </button>
  );
}

function PressCard({ press, onSelect }: { press: WorkspaceManifestPress; onSelect: () => void }) {
  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="openpress-workspace-gallery__card"
      onClick={onSelect}
      onKeyDown={handleKey}
      aria-label={`Open ${press.title}`}
    >
      <PressThumbnail press={press} />
      <div className="openpress-workspace-gallery__card-body">
        <div className="openpress-workspace-gallery__title">{press.title}</div>
        <div className="openpress-workspace-gallery__meta">
          {press.slug ? <span className="openpress-workspace-gallery__slug">{press.slug}</span> : null}
          {press.page?.pageLabel ? (
            <span className="openpress-workspace-gallery__geom">{press.page.pageLabel}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PressThumbnail({ press }: { press: WorkspaceManifestPress }) {
  const [state, setState] = useState<ThumbnailState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchFirstPage(press.documentUrl).then((page) => {
      if (cancelled) return;
      setState(page ? { status: "ready", page } : { status: "error" });
    }).catch(() => {
      if (!cancelled) setState({ status: "error" });
    });
    return () => { cancelled = true; };
  }, [press.documentUrl]);

  return (
    <div className="openpress-workspace-gallery__thumb" aria-hidden="true">
      {state.status === "ready" ? (
        <PageMiniature page={state.page} press={press} />
      ) : (
        <div className="openpress-workspace-gallery__thumb-placeholder" data-state={state.status}>
          <div className="openpress-workspace-gallery__thumb-skel" style={skelAspectStyle(press)} />
        </div>
      )}
    </div>
  );
}

function skelAspectStyle(press: WorkspaceManifestPress): CSSProperties {
  const w = parsePxLength(press.page?.pageWidth);
  const h = parsePxLength(press.page?.pageHeight);
  if (w && h) return { aspectRatio: `${w} / ${h}`, height: "75%" };
  return { aspectRatio: "1 / 1.414", height: "75%" };
}

function PageMiniature({ page, press }: { page: HtmlPageBlock; press: WorkspaceManifestPress }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);
  const pageWidthPx = parsePxLength(press.page?.pageWidth) ?? 1080;
  const pageHeightPx = parsePxLength(press.page?.pageHeight) ?? pageWidthPx;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        setScale(Math.min(w / pageWidthPx, h / pageHeightPx));
      }
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageWidthPx, pageHeightPx]);

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
  const pageClass = page.className
    ? `openpress-html-page ${page.className}`
    : "openpress-html-page";

  return (
    <div className="openpress-workspace-gallery__thumb-stage" ref={containerRef}>
      <div className="openpress-workspace-gallery__thumb-frame" style={frameStyle}>
        <div className={pageClass} style={pageStyle} data-openpress-thumb-page="true">
          <div
            className="openpress-html-page__html"
            dangerouslySetInnerHTML={{ __html: page.html }}
          />
        </div>
      </div>
    </div>
  );
}

type ThumbnailState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; page: HtmlPageBlock };

async function fetchFirstPage(url: string): Promise<HtmlPageBlock | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const doc = (await response.json()) as ReaderDocument;
    const firstPage = doc.blocks.find((b): b is HtmlPageBlock => b.kind === "htmlPage");
    return firstPage ?? null;
  } catch {
    return null;
  }
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
