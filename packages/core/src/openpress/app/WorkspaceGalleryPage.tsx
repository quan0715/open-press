import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { cn } from "../core/cn";
import type { HtmlPageBlock, ReaderDocument, WorkspaceManifest, WorkspaceManifestPress } from "../document-model";
import { PUBLIC_HTML_PAGE_CLASS, PUBLIC_HTML_PAGE_HTML_CLASS } from "../reader/publicViewerClasses";

type GalleryFilter = "all" | "pages" | "slides";

interface Props {
  manifest: WorkspaceManifest;
  onSelectPress: (press: WorkspaceManifestPress) => void;
}

const GALLERY_CLASS = [
  "openpress-workspace-gallery m-0 flex min-h-screen flex-col gap-9 bg-[#10110f]",
  "px-[clamp(2rem,4vw,4.5rem)] pb-24 pt-[3.6rem] font-sans text-[#f4f1e8]",
  "[background:linear-gradient(180deg,#171813,#10110f_42rem),#10110f]",
  "max-[720px]:px-4 max-[720px]:pb-16 max-[720px]:pt-9",
].join(" ");
const GALLERY_HEADER_CLASS = "openpress-workspace-gallery__header flex items-end justify-between gap-10 border-b border-[rgba(244,241,232,0.12)] pb-[1.45rem]";
const GALLERY_HEADLINE_CLASS = "openpress-workspace-gallery__headline grid gap-3";
const GALLERY_BRAND_CLASS = "openpress-workspace-gallery__brand m-0 flex items-center gap-2 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.12em]";
const GALLERY_BRAND_MARK_CLASS = "openpress-workspace-gallery__brand-mark text-[#f4f1e8]";
const GALLERY_BRAND_SEP_CLASS = "openpress-workspace-gallery__brand-sep tracking-normal text-[rgba(244,241,232,0.52)]";
const GALLERY_EYEBROW_CLASS = "openpress-workspace-gallery__eyebrow text-[rgba(244,241,232,0.52)]";
const GALLERY_TITLE_CLASS = "m-0 font-sans text-[clamp(1.4rem,2.6vw,2.2rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-[#f4f1e8]";
const GALLERY_BODY_CLASS = "openpress-workspace-gallery__body grid grid-cols-[180px_1fr] items-start gap-10 max-[860px]:grid-cols-1";
const GALLERY_SIDEBAR_CLASS = "openpress-workspace-gallery__sidebar sticky top-6 flex flex-col gap-0.5 max-[860px]:static max-[860px]:flex-row max-[860px]:flex-wrap max-[860px]:gap-1.5";
const GALLERY_FILTER_CLASS = [
  "openpress-workspace-gallery__filter-btn flex w-full cursor-pointer items-center justify-between gap-[0.6rem]",
  "rounded-[7px] border border-transparent bg-transparent px-3 py-[0.52rem] text-left font-sans text-[0.82rem]",
  "font-medium text-[rgba(244,241,232,0.52)] transition-[background,color,border-color] duration-[140ms]",
  "hover:bg-[rgba(244,241,232,0.06)] hover:text-[#f4f1e8] max-[860px]:w-auto max-[860px]:shrink-0",
].join(" ");
const GALLERY_FILTER_ACTIVE_CLASS = "!border-white/15 !bg-white/10 !text-[#f4f1e8]";
const GALLERY_FILTER_LABEL_CLASS = "openpress-workspace-gallery__filter-label flex-auto";
const GALLERY_FILTER_COUNT_CLASS = "openpress-workspace-gallery__filter-count shrink-0 font-mono text-[0.72rem] font-medium tracking-[0.04em] text-[rgba(244,241,232,0.52)]";
const GALLERY_FILTER_COUNT_ACTIVE_CLASS = "!text-[#f4f1e8]";
const GALLERY_MAIN_CLASS = "openpress-workspace-gallery__main min-w-0";
const GALLERY_GRID_CLASS = "openpress-workspace-gallery__grid !m-0 grid !list-none grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] items-start gap-6 !p-0 max-[720px]:grid-cols-1";
const GALLERY_ITEM_CLASS = "openpress-workspace-gallery__item flex";
const GALLERY_EMPTY_CLASS = "openpress-workspace-gallery__empty m-0 py-12 text-[0.88rem] text-[rgba(244,241,232,0.52)]";
const GALLERY_CARD_CLASS = [
  "openpress-workspace-gallery__card grid w-full cursor-pointer appearance-none grid-rows-[auto_minmax(6.75rem,auto)]",
  "self-start overflow-hidden rounded-lg border border-white/[0.08] bg-[#f7f5ee] p-0 text-left text-[#141411]",
  "transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-white/30 hover:shadow-[0_18px_44px_rgba(0,0,0,0.34)]",
  "focus-visible:-translate-y-0.5 focus-visible:border-white/30 focus-visible:shadow-[0_18px_44px_rgba(0,0,0,0.34)] focus-visible:outline-none",
].join(" ");
const GALLERY_CARD_BODY_CLASS = "openpress-workspace-gallery__card-body grid min-h-[6.75rem] content-between gap-[1.2rem] bg-[#f7f5ee] px-[1.22rem] pb-[1.15rem] pt-[1.1rem]";
const GALLERY_CARD_TITLE_CLASS = "openpress-workspace-gallery__title block overflow-hidden text-ellipsis whitespace-nowrap text-base font-bold leading-[1.2] text-[#141411]";
const GALLERY_META_CLASS = "openpress-workspace-gallery__meta flex flex-wrap items-center justify-between gap-[0.7rem] font-mono text-[0.66rem] tracking-[0.03em] text-[#65635d]";
const GALLERY_SLUG_CLASS = "openpress-workspace-gallery__slug max-w-52 overflow-hidden text-ellipsis whitespace-nowrap font-medium uppercase text-[rgba(20,20,17,0.72)]";
const GALLERY_GEOM_CLASS = "openpress-workspace-gallery__geom inline-flex min-h-[1.35rem] items-center whitespace-nowrap rounded border border-[rgba(20,20,17,0.1)] bg-white/35 px-[0.48rem] text-[0.62rem] text-[rgba(20,20,17,0.76)]";
const GALLERY_THUMB_CLASS = [
  "openpress-workspace-gallery__thumb relative block aspect-[4/3] w-full overflow-hidden border-b border-[rgba(20,20,17,0.1)]",
  "[background:linear-gradient(135deg,color-mix(in_srgb,#141411_5%,#e8e5dc),#e8e5dc)]",
].join(" ");
const GALLERY_THUMB_GRID_CLASS = [
  "pointer-events-none absolute inset-0 opacity-50",
  "[background-image:linear-gradient(rgba(20,20,17,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(20,20,17,0.05)_1px,transparent_1px)]",
  "[background-size:24px_24px]",
].join(" ");
const GALLERY_THUMB_STAGE_CLASS = "openpress-workspace-gallery__thumb-stage absolute inset-[clamp(0.85rem,6%,1.45rem)] grid place-items-center";
const GALLERY_THUMB_FRAME_CLASS = "openpress-workspace-gallery__thumb-frame relative shadow-[0_18px_36px_rgba(20,20,17,0.18),0_0_0_1px_rgba(20,20,17,0.08)]";
const GALLERY_THUMB_PLACEHOLDER_CLASS = "openpress-workspace-gallery__thumb-placeholder absolute inset-[clamp(0.85rem,6%,1.45rem)] grid place-items-center";
const GALLERY_THUMB_SKEL_CLASS = [
  "openpress-workspace-gallery__thumb-skel block w-[70%] rounded-[3px] border border-[rgba(20,20,17,0.1)] bg-white",
  "shadow-[0_14px_28px_rgba(20,20,17,0.14)] [background:repeating-linear-gradient(135deg,rgba(20,20,17,0.04)_0_6px,transparent_6px_14px),#fff]",
].join(" ");
const GALLERY_THUMB_SKEL_LOADING_CLASS = "animate-pulse";
const THUMB_PAGE_CLASS = "block select-none pointer-events-none";

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
    <main className={GALLERY_CLASS} aria-labelledby="workspace-gallery-heading">
      <header className={GALLERY_HEADER_CLASS}>
        <div className={GALLERY_HEADLINE_CLASS}>
          <p className={GALLERY_BRAND_CLASS}>
            <span className={GALLERY_BRAND_MARK_CLASS}>open-press</span>
            <span className={GALLERY_BRAND_SEP_CLASS} aria-hidden="true">/</span>
            <span className={GALLERY_EYEBROW_CLASS}>Workspace</span>
          </p>
          <h1 id="workspace-gallery-heading" className={GALLERY_TITLE_CLASS}>{heading}</h1>
        </div>
      </header>

      <div className={GALLERY_BODY_CLASS}>
        <nav className={GALLERY_SIDEBAR_CLASS} aria-label="文件類型篩選">
          <FilterButton label="All" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterButton label="Pages" count={counts.pages} active={filter === "pages"} onClick={() => setFilter("pages")} />
          <FilterButton label="Slides" count={counts.slides} active={filter === "slides"} onClick={() => setFilter("slides")} />
        </nav>

        <section className={GALLERY_MAIN_CLASS} aria-label={`${filter} 文件`}>
          {visiblePresses.length > 0 ? (
            <ul className={GALLERY_GRID_CLASS} role="list">
              {visiblePresses.map((press) => (
                <li key={press.slug || "root"} className={GALLERY_ITEM_CLASS}>
                  <PressCard press={press} onSelect={() => onSelectPress(press)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className={GALLERY_EMPTY_CLASS}>No {filter} documents.</p>
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
      className={cn(GALLERY_FILTER_CLASS, active && GALLERY_FILTER_ACTIVE_CLASS)}
      aria-pressed={active}
      data-active={active ? "true" : "false"}
      onClick={onClick}
    >
      <span className={GALLERY_FILTER_LABEL_CLASS}>{label}</span>
      <span className={cn(GALLERY_FILTER_COUNT_CLASS, active && GALLERY_FILTER_COUNT_ACTIVE_CLASS)}>{String(count).padStart(2, "0")}</span>
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
      className={GALLERY_CARD_CLASS}
      onClick={onSelect}
      onKeyDown={handleKey}
      aria-label={`Open ${press.title}`}
    >
      <PressThumbnail press={press} />
      <div className={GALLERY_CARD_BODY_CLASS}>
        <div className={GALLERY_CARD_TITLE_CLASS}>{press.title}</div>
        <div className={GALLERY_META_CLASS}>
          {press.slug ? <span className={GALLERY_SLUG_CLASS}>{press.slug}</span> : null}
          {press.page?.pageLabel ? (
            <span className={GALLERY_GEOM_CLASS}>{press.page.pageLabel}</span>
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
    <div className={GALLERY_THUMB_CLASS} aria-hidden="true">
      <span className={GALLERY_THUMB_GRID_CLASS} aria-hidden="true" />
      {state.status === "ready" ? (
        <PageMiniature page={state.page} press={press} />
      ) : (
        <div className={GALLERY_THUMB_PLACEHOLDER_CLASS} data-state={state.status}>
          <div
            className={cn(GALLERY_THUMB_SKEL_CLASS, state.status === "loading" && GALLERY_THUMB_SKEL_LOADING_CLASS)}
            style={skelAspectStyle(press)}
          />
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
    ? `${PUBLIC_HTML_PAGE_CLASS} ${page.className} ${THUMB_PAGE_CLASS}`
    : `${PUBLIC_HTML_PAGE_CLASS} ${THUMB_PAGE_CLASS}`;

  return (
    <div className={GALLERY_THUMB_STAGE_CLASS} ref={containerRef}>
      <div className={GALLERY_THUMB_FRAME_CLASS} style={frameStyle}>
        <div className={pageClass} style={pageStyle} data-openpress-thumb-page="true">
          <div
            className={PUBLIC_HTML_PAGE_HTML_CLASS}
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
