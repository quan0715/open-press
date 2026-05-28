import { useEffect, useRef, useState, type CSSProperties } from "react";
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

function PressCard({ press, onSelect }: { press: WorkspaceManifestPress; onSelect: () => void }) {
  return (
    <button
      type="button"
      className="openpress-workspace-gallery__card"
      onClick={onSelect}
      aria-label={`Open ${press.title}`}
    >
      <PressThumbnail press={press} />
      <span className="openpress-workspace-gallery__body">
        <span className="openpress-workspace-gallery__title">{press.title}</span>
        <span className="openpress-workspace-gallery__meta">
          <span className="openpress-workspace-gallery__slug">/{press.slug || ""}</span>
          <span className="openpress-workspace-gallery__dot" aria-hidden="true">·</span>
          <span className="openpress-workspace-gallery__pages">
            {press.pageCount} {press.pageCount === 1 ? "page" : "pages"}
          </span>
          {press.page?.pageLabel ? (
            <>
              <span className="openpress-workspace-gallery__dot" aria-hidden="true">·</span>
              <span className="openpress-workspace-gallery__geom">{press.page.pageLabel}</span>
            </>
          ) : null}
        </span>
      </span>
    </button>
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

  return (
    <span className="openpress-workspace-gallery__thumb" aria-hidden="true">
      {state.status === "ready" ? (
        <PageMiniature page={state.page} press={press} />
      ) : (
        <span className="openpress-workspace-gallery__thumb-placeholder" data-state={state.status}>
          <span className="openpress-workspace-gallery__thumb-skel" style={frameStyle(press)} />
        </span>
      )}
    </span>
  );
}

function PageMiniature({ page, press }: { page: HtmlPageBlock; press: WorkspaceManifestPress }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState<number | null>(null);
  const pageWidthPx = parsePxLength(press.page?.pageWidth) ?? 1080;
  const pageHeightPx = parsePxLength(press.page?.pageHeight) ?? pageWidthPx;

  // Page HTML is sized in absolute px. Measure the slot we have inside
  // the card and apply a scale transform so the page fits exactly,
  // letterboxed by aspect-ratio differences.
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

  const pageStyle: CSSProperties = {
    width: `${pageWidthPx}px`,
    height: `${pageHeightPx}px`,
    transform: scale ? `translate(-50%, -50%) scale(${scale})` : "translate(-50%, -50%)",
    transformOrigin: "center center",
    position: "absolute",
    top: "50%",
    left: "50%",
    visibility: scale ? "visible" : "hidden",
  };
  const pageClass = page.className ? `openpress-public-page ${page.className}` : "openpress-public-page";

  return (
    <span className="openpress-workspace-gallery__thumb-stage" ref={containerRef}>
      <span
        className={pageClass}
        style={pageStyle}
        // Trusted HTML — same source as the reader's main render path.
        dangerouslySetInnerHTML={{ __html: page.html }}
      />
    </span>
  );
}

function frameStyle(press: WorkspaceManifestPress): CSSProperties {
  const ratio = press.page?.pageAspectRatio;
  return ratio ? { aspectRatio: ratio } : { aspectRatio: "1 / 1.414" };
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
  const match = value.trim().match(/^([\d.]+)\s*px$/i);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}
