import { useEffect, useRef, useState, type CSSProperties } from "react";
import { FileText, Presentation } from "lucide-react";
import corePackage from "../../../package.json";
import { cn } from "../core/cn";
import type { HtmlPageBlock, ReaderDocument, Theme, WorkspaceManifest, WorkspaceManifestPress } from "../document-model";
import { PUBLIC_HTML_PAGE_CLASS, PUBLIC_HTML_PAGE_HTML_CLASS } from "../reader/publicViewerClasses";
import { Button } from "@/openpress/ui/button";
import { Skeleton } from "@/openpress/ui/skeleton";

type GalleryFilter = "all" | "pages" | "slides";
type WorkspaceColorMode = "dark" | "light";

interface Props {
  manifest: WorkspaceManifest;
  onSelectPress: (press: WorkspaceManifestPress) => void;
}

const WORKSPACE_COLOR_MODE_STORAGE_KEY = "openpress:workspace:color-mode";

const GALLERY_CLASS = [
  "op-workspace openpress-workspace-gallery m-0 flex min-h-screen flex-col gap-9 bg-[var(--op-workspace-bg)]",
  "px-[clamp(2rem,4vw,4.5rem)] pb-24 pt-[3.6rem] font-sans text-[var(--op-workspace-text)]",
  "[background:var(--op-workspace-gallery-bg)]",
  "max-[720px]:px-4 max-[720px]:pb-16 max-[720px]:pt-9",
].join(" ");
const GALLERY_HEADER_CLASS = "openpress-workspace-gallery__header flex items-end justify-between gap-10 border-b border-[var(--op-workspace-border)] pb-[1.45rem]";
const GALLERY_HEADLINE_CLASS = "openpress-workspace-gallery__headline grid gap-3";
const GALLERY_BRAND_CLASS = "openpress-workspace-gallery__brand m-0 flex items-center gap-2 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.12em]";
const GALLERY_BRAND_MARK_CLASS = "openpress-workspace-gallery__brand-mark text-[var(--op-workspace-text)]";
const GALLERY_BRAND_SEP_CLASS = "openpress-workspace-gallery__brand-sep tracking-normal text-[var(--op-workspace-text-muted)]";
const GALLERY_EYEBROW_CLASS = "openpress-workspace-gallery__eyebrow text-[var(--op-workspace-text-muted)]";
const GALLERY_VERSION_CLASS = "openpress-workspace-gallery__version rounded border border-[var(--op-workspace-border-muted)] bg-[var(--op-workspace-surface-muted)] px-1.5 py-0.5 text-[0.62rem] tracking-[0.08em] text-[var(--op-workspace-text-soft)]";
const GALLERY_TITLE_CLASS = "m-0 font-sans text-[clamp(1.4rem,2.6vw,2.2rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--op-workspace-text)]";
const GALLERY_BODY_CLASS = "openpress-workspace-gallery__body grid grid-cols-[180px_1fr] items-start gap-10 max-[860px]:grid-cols-1";
const GALLERY_SIDEBAR_CLASS = "openpress-workspace-gallery__sidebar sticky top-6 flex flex-col gap-0.5 max-[860px]:static max-[860px]:flex-row max-[860px]:flex-wrap max-[860px]:gap-1.5";
const GALLERY_FILTER_CLASS = [
  "openpress-workspace-gallery__filter-btn flex w-full cursor-pointer items-center justify-between gap-[0.6rem]",
  "rounded-[7px] border border-transparent bg-transparent px-3 py-[0.52rem] text-left font-sans text-[0.82rem]",
  "font-medium text-[var(--op-workspace-text-muted)] transition-[background,color,border-color] duration-[var(--op-workspace-duration-fast)]",
  "hover:bg-[var(--op-workspace-surface-hover)] hover:text-[var(--op-workspace-text)] max-[860px]:w-auto max-[860px]:shrink-0",
].join(" ");
const GALLERY_FILTER_ACTIVE_CLASS = "!border-[var(--op-workspace-border-strong)] !bg-[var(--op-workspace-surface-hover)] !text-[var(--op-workspace-text)]";
const GALLERY_FILTER_LABEL_CLASS = "openpress-workspace-gallery__filter-label flex-auto";
const GALLERY_FILTER_COUNT_CLASS = "openpress-workspace-gallery__filter-count shrink-0 font-mono text-[0.72rem] font-medium tracking-[0.04em] text-[var(--op-workspace-text-muted)]";
const GALLERY_FILTER_COUNT_ACTIVE_CLASS = "!text-[var(--op-workspace-text)]";
const GALLERY_MAIN_CLASS = "openpress-workspace-gallery__main min-w-0";
const GALLERY_GRID_CLASS = "openpress-workspace-gallery__grid !m-0 grid !list-none grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] items-start gap-6 !p-0 max-[720px]:grid-cols-1";
const GALLERY_ITEM_CLASS = "openpress-workspace-gallery__item flex";
const GALLERY_EMPTY_CLASS = "openpress-workspace-gallery__empty m-0 py-12 text-[0.88rem] text-[var(--op-workspace-text-muted)]";
const GALLERY_CARD_CLASS = [
  "openpress-workspace-gallery__card grid w-full cursor-pointer appearance-none grid-rows-[auto_3.6rem]",
  "self-start overflow-hidden rounded-[var(--op-workspace-radius-lg)] border border-[var(--op-workspace-card-border)] bg-[var(--op-workspace-card-surface)] p-0 text-left text-[var(--op-workspace-card-text)]",
  "transition-[transform,box-shadow,border-color] duration-[var(--op-workspace-duration-fast)] hover:-translate-y-0.5 hover:border-[var(--op-workspace-card-hover-border)] hover:[box-shadow:var(--op-workspace-card-hover-shadow)]",
  "focus-visible:-translate-y-0.5 focus-visible:border-[var(--op-workspace-card-hover-border)] focus-visible:[box-shadow:var(--op-workspace-card-hover-shadow)] focus-visible:outline-none",
].join(" ");
const GALLERY_CARD_BODY_CLASS = [
  "openpress-workspace-gallery__card-body grid min-h-0 grid-cols-[minmax(0,1fr)_1.9rem] items-center gap-3",
  "bg-[var(--op-workspace-card-surface)] px-[1.05rem] py-0",
].join(" ");
const GALLERY_CARD_TITLE_CLASS = "openpress-workspace-gallery__title block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.92rem] font-bold leading-none text-[var(--op-workspace-card-text)]";
const GALLERY_TYPE_ICON_CLASS = [
  "openpress-workspace-gallery__type-icon grid h-[1.9rem] w-[1.9rem] place-items-center rounded-[var(--op-workspace-radius-sm)]",
  "border border-[var(--op-workspace-card-border)] bg-[var(--op-workspace-surface-muted)] text-[var(--op-workspace-card-text-muted)]",
  "[&_svg]:h-[0.9rem] [&_svg]:w-[0.9rem]",
].join(" ");
const GALLERY_THUMB_CLASS = [
  "openpress-workspace-gallery__thumb relative block aspect-video w-full overflow-hidden border-b border-[var(--op-workspace-card-border)]",
  "bg-[var(--op-workspace-press-preview-bg)]",
].join(" ");
const GALLERY_THUMB_STAGE_CLASS = "openpress-workspace-gallery__thumb-stage absolute inset-0 grid place-items-center";
const GALLERY_THUMB_FRAME_CLASS = "openpress-workspace-gallery__thumb-frame relative outline outline-1 outline-[var(--op-workspace-press-preview-outline)] [box-shadow:var(--op-workspace-press-preview-shadow)]";
const GALLERY_THUMB_PLACEHOLDER_CLASS = "openpress-workspace-gallery__thumb-placeholder absolute inset-0 grid place-items-center";
const GALLERY_THUMB_SKEL_CLASS = [
  "openpress-workspace-gallery__thumb-skel block max-h-full max-w-full rounded-[3px] border border-[var(--op-workspace-press-preview-outline)] bg-[var(--op-workspace-card-surface)]",
  "[box-shadow:var(--op-workspace-press-preview-shadow)] [background:repeating-linear-gradient(135deg,var(--op-workspace-press-preview-grid)_0_6px,transparent_6px_14px),var(--op-workspace-card-surface)]",
].join(" ");
const GALLERY_THUMB_SKEL_LOADING_CLASS = "animate-pulse";
const GALLERY_THUMB_IMAGE_CLASS = "openpress-workspace-gallery__thumb-image block h-full w-full object-contain";
const THUMB_PAGE_CLASS = "block select-none pointer-events-none";

export function WorkspaceGalleryPage({ manifest, onSelectPress }: Props) {
  const heading = manifest.name ?? "Workspace";
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [workspaceColorMode] = useState<WorkspaceColorMode>(() => getInitialWorkspaceColorMode());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.document.documentElement.dataset.openpressWorkspaceColorMode = workspaceColorMode;
    return () => {
      delete window.document.documentElement.dataset.openpressWorkspaceColorMode;
    };
  }, [workspaceColorMode]);

  const counts = {
    all: manifest.presses.length,
    pages: manifest.presses.filter((p) => p.type === "pages").length,
    slides: manifest.presses.filter((p) => p.type === "slides").length,
  };

  const visiblePresses = filter === "all"
    ? manifest.presses
    : manifest.presses.filter((p) => p.type === filter);

  return (
    <main
      className={GALLERY_CLASS}
      data-openpress-workspace-color-mode={workspaceColorMode}
      aria-labelledby="workspace-gallery-heading"
    >
      <header className={GALLERY_HEADER_CLASS}>
        <div className={GALLERY_HEADLINE_CLASS}>
          <p className={GALLERY_BRAND_CLASS}>
            <span className={GALLERY_BRAND_MARK_CLASS}>open-press</span>
            <span className={GALLERY_BRAND_SEP_CLASS} aria-hidden="true">/</span>
            <span className={GALLERY_EYEBROW_CLASS}>Workspace</span>
            <span className={GALLERY_VERSION_CLASS}>core v{corePackage.version}</span>
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
    <Button
      type="button"
      variant="ghost"
      className={cn(GALLERY_FILTER_CLASS, active && GALLERY_FILTER_ACTIVE_CLASS)}
      aria-pressed={active}
      data-active={active ? "true" : "false"}
      onClick={onClick}
    >
      <span className={GALLERY_FILTER_LABEL_CLASS}>{label}</span>
      <span className={cn(GALLERY_FILTER_COUNT_CLASS, active && GALLERY_FILTER_COUNT_ACTIVE_CLASS)}>{String(count).padStart(2, "0")}</span>
    </Button>
  );
}

function PressCard({ press, onSelect }: { press: WorkspaceManifestPress; onSelect: () => void }) {
  return (
    <button
      type="button"
      className={GALLERY_CARD_CLASS}
      onClick={onSelect}
      aria-label={`Open ${press.title}`}
    >
      <PressThumbnail press={press} />
      <div className={GALLERY_CARD_BODY_CLASS}>
        <span className={GALLERY_CARD_TITLE_CLASS} title={press.title}>{press.title}</span>
        <span className={GALLERY_TYPE_ICON_CLASS} title={formatPressTypeLabel(press.type)} aria-label={formatPressTypeLabel(press.type)}>
          <PressTypeIcon type={press.type} />
        </span>
      </div>
    </button>
  );
}

function PressTypeIcon({ type }: { type: WorkspaceManifestPress["type"] }) {
  const Icon = type === "slides" ? Presentation : FileText;
  return <Icon aria-hidden="true" />;
}

function PressThumbnail({ press }: { press: WorkspaceManifestPress }) {
  const [state, setState] = useState<ThumbnailState>({ status: "loading" });
  const [imageFailed, setImageFailed] = useState(false);
  const thumbnailUrl = typeof press.thumbnailUrl === "string" && press.thumbnailUrl.length > 0
    ? press.thumbnailUrl
    : null;
  const useImageThumbnail = thumbnailUrl !== null && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
    setState({ status: "loading" });
  }, [thumbnailUrl, press.documentUrl]);

  useEffect(() => {
    if (useImageThumbnail) return;
    let cancelled = false;
    fetchThumbnailDocument(press.documentUrl).then((document) => {
      if (cancelled) return;
      setState(document ? { status: "ready", document } : { status: "error" });
    }).catch(() => {
      if (!cancelled) setState({ status: "error" });
    });
    return () => { cancelled = true; };
  }, [press.documentUrl, useImageThumbnail]);

  return (
    <div
      className={GALLERY_THUMB_CLASS}
      aria-hidden="true"
    >
      {useImageThumbnail ? (
        <img
          className={GALLERY_THUMB_IMAGE_CLASS}
          src={thumbnailUrl}
          alt=""
          draggable={false}
          onError={() => setImageFailed(true)}
        />
      ) : state.status === "ready" ? (
        <PageMiniature document={state.document} press={press} />
      ) : (
        <div className={GALLERY_THUMB_PLACEHOLDER_CLASS} data-state={state.status}>
          <Skeleton
            className={cn(GALLERY_THUMB_SKEL_CLASS, "rounded-[3px]", state.status !== "loading" && "animate-none")}
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
  const ratio = w && h ? w / h : 1 / 1.414;
  const wide = ratio >= 16 / 9;
  return {
    aspectRatio: w && h ? `${w} / ${h}` : "1 / 1.414",
    width: wide ? "100%" : undefined,
    height: wide ? undefined : "100%",
  };
}

function PageMiniature({ document, press }: { document: ThumbnailDocument; press: WorkspaceManifestPress }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);
  const { page } = document;
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
    ...previewThemeStyle(document.theme),
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
  | { status: "ready"; document: ThumbnailDocument };

interface ThumbnailDocument {
  page: HtmlPageBlock;
  theme?: Theme;
}

async function fetchThumbnailDocument(url: string): Promise<ThumbnailDocument | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const doc = (await response.json()) as ReaderDocument;
    const firstPage = doc.blocks.find((b): b is HtmlPageBlock => b.kind === "htmlPage");
    return firstPage ? { page: firstPage, theme: doc.theme } : null;
  } catch {
    return null;
  }
}

function previewThemeStyle(theme: Theme | undefined): CSSProperties {
  const style: CSSProperties & Record<`--${string}`, string> = {
    "--openpress-color-document": "#ffffff",
    "--openpress-color-ink": "#161616",
    "--openpress-color-muted": "#6f6f6f",
    "--openpress-color-line": "#e0e0e0",
    "--openpress-color-soft-line": "#f4f4f4",
    "--openpress-font-body": "'Noto Sans TC', 'PingFang TC', ui-sans-serif, system-ui, sans-serif",
    "--openpress-font-serif": "'Noto Serif TC', 'Songti TC', 'Source Han Serif TC', serif",
    "--openpress-font-mono": "'SFMono-Regular', Menlo, Consolas, monospace",
  };
  if (theme?.pageWidth) style["--openpress-page-width"] = theme.pageWidth;
  if (theme?.pageHeight) style["--openpress-page-height"] = theme.pageHeight;
  if (theme?.pageAspectRatio) style["--openpress-page-aspect-ratio"] = theme.pageAspectRatio;
  if (theme?.pageHeightRatio) style["--openpress-page-height-ratio"] = theme.pageHeightRatio;
  return style;
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

function formatPressTypeLabel(type: WorkspaceManifestPress["type"]) {
  if (type === "slides") return "Slides";
  return "Pages";
}

function getInitialWorkspaceColorMode(): WorkspaceColorMode {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem(WORKSPACE_COLOR_MODE_STORAGE_KEY);
    return stored === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}
