import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { HtmlPageBlock, ReaderDocument, WorkspaceManifest, WorkspaceManifestPress } from "../document-model";

interface Props {
  manifest: WorkspaceManifest;
  // Called when the reader navigates into a specific Press. The host
  // is responsible for routing (history.pushState, hash, etc.); the
  // gallery just emits the chosen slug.
  onSelectPress: (press: WorkspaceManifestPress) => void;
}

// Reader landing page for multi-Press workspaces. Shows a Figma-style
// uniform-grid card per Press; each card lazily loads that Press's
// document.json and renders the first page as a thumbnail preview.
// Single-Press workspaces skip the gallery entirely.
export function WorkspaceGalleryPage({ manifest, onSelectPress }: Props) {
  const heading = manifest.name ?? "Workspace";

  return (
    <main className="openpress-workspace-gallery" aria-labelledby="workspace-gallery-heading">
      <header className="openpress-workspace-gallery__header">
        <p className="openpress-workspace-gallery__eyebrow">Workspace</p>
        <h1 id="workspace-gallery-heading">{heading}</h1>
        <p className="openpress-workspace-gallery__count">
          {manifest.presses.length} {manifest.presses.length === 1 ? "document" : "documents"} in this project
        </p>
      </header>

      <ul className="openpress-workspace-gallery__grid" role="list">
        {manifest.presses.map((press) => (
          <li key={press.slug || "root"} className="openpress-workspace-gallery__item">
            <PressCard press={press} onSelect={() => onSelectPress(press)} />
          </li>
        ))}
      </ul>
    </main>
  );
}

// Card is a div+role=button (not <button>) so it can contain the
// rendered page HTML — buttons may only hold phrasing content, and
// page HTML is block-level.
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
      <div className="openpress-workspace-gallery__body">
        <div className="openpress-workspace-gallery__title">{press.title}</div>
        <div className="openpress-workspace-gallery__meta">
          {press.slug ? (
            <>
              <span className="openpress-workspace-gallery__slug">/{press.slug}</span>
              <span className="openpress-workspace-gallery__dot" aria-hidden="true">·</span>
            </>
          ) : null}
          <span className="openpress-workspace-gallery__pages">
            {press.pageCount} {press.pageCount === 1 ? "page" : "pages"}
          </span>
          {press.page?.pageLabel ? (
            <>
              <span className="openpress-workspace-gallery__dot" aria-hidden="true">·</span>
              <span className="openpress-workspace-gallery__geom">{press.page.pageLabel}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PressThumbnail({ press }: { press: WorkspaceManifestPress }) {
  const [state, setState] = useState<ThumbnailState>({ status: "loading" });

  // Lazy-load each Press's document.json so the gallery doesn't block
  // on a network waterfall when there are many Press. Errors degrade
  // to the geometry-only placeholder used by the loading state.
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

  // Outer card is uniform 4:3 (set in CSS). The page itself letterboxes
  // inside via centered scale, so A4 portrait renders tall-and-narrow,
  // social square renders centered, 16:9 slide stretches edge-to-edge.
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

  // Match the wrapping used by PublicReaderPage so scoped CSS targeting
  // `.openpress-html-page__html` selectors lights up identically.
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
  const pageClass = page.className
    ? `openpress-html-page ${page.className}`
    : "openpress-html-page";

  return (
    <div className="openpress-workspace-gallery__thumb-stage" ref={containerRef}>
      <div className={pageClass} style={stageStyle} data-openpress-thumb-page="true">
        <div
          className="openpress-html-page__html"
          // Trusted HTML — same source as the reader's main render path.
          dangerouslySetInnerHTML={{ __html: page.html }}
        />
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

// Convert a CSS length string (px / mm / cm / in) into device pixels
// at 96 dpi. A4 pages are stored as "210mm" / "297mm" so the gallery
// and thumbnail scalers need this to compute their fit ratio — using
// the bare string would always fall back to the default fallback.
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
