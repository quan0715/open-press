import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { LayoutTemplate, Plus } from "lucide-react";
import type { SlideTemplateSourceEntry } from "../../document-model";
import { cn } from "../../core/cn";
import {
  PUBLIC_HTML_PAGE_CLASS,
  PUBLIC_HTML_PAGE_HTML_CLASS,
} from "../../reader";
import { Button } from "@/openpress/ui/button";

type SlideTemplateBrowserProps = {
  templates: SlideTemplateSourceEntry[];
  selectedTemplateName: string | null;
  onSelectTemplate: (name: string) => void;
  onAddTemplate?: (name: string) => void;
  documentStyle?: CSSProperties;
  pageWidth?: string;
  pageHeight?: string;
  pageAspectRatio?: string;
};

type CssVariableStyle = CSSProperties & Record<`--${string}`, string | number | undefined>;

const TEMPLATE_BROWSER_CLASS = [
  "openpress-template-browser grid min-h-0 content-start gap-2 overflow-auto pr-1",
  "[scrollbar-width:thin] [scrollbar-color:rgb(255_255_255_/_0.16)_transparent]",
].join(" ");

const TEMPLATE_ITEM_CLASS = [
  "openpress-template-browser__item grid gap-[7px] border border-white/[0.1] bg-white/[0.035] p-2",
  "text-left transition hover:border-white/[0.18] hover:bg-white/[0.055]",
].join(" ");

const TEMPLATE_ITEM_ACTIVE_CLASS = "border-[rgb(96_165_250_/_0.72)] bg-[rgb(96_165_250_/_0.08)]";

const TEMPLATE_PREVIEW_CLASS = [
  "openpress-template-browser__preview relative block w-full aspect-video min-w-0 overflow-hidden whitespace-normal bg-white",
  "shadow-[0_10px_28px_rgb(0_0_0_/_0.2)]",
].join(" ");

const TEMPLATE_PREVIEW_FALLBACK_SCALE = 0.16;

export function SlideTemplateBrowser({
  templates,
  selectedTemplateName,
  onSelectTemplate,
  onAddTemplate,
  documentStyle,
  pageWidth,
  pageHeight,
  pageAspectRatio,
}: SlideTemplateBrowserProps) {
  if (templates.length === 0) {
    return (
      <div className="grid min-h-0 content-start p-3">
        <p className="m-0 border border-dashed border-white/[0.12] p-3 text-xs leading-[1.4] text-[rgb(160_166_173_/_0.68)]">
          No slide templates registered.
        </p>
      </div>
    );
  }

  return (
    <div className={TEMPLATE_BROWSER_CLASS} role="list" aria-label="Slide templates">
      {templates.map((template) => {
        const isActive = template.name === selectedTemplateName;
        const label = formatTemplateLabel(template.name);
        return (
          <article
            key={template.name}
            className={cn(TEMPLATE_ITEM_CLASS, isActive ? TEMPLATE_ITEM_ACTIVE_CLASS : undefined)}
            role="listitem"
          >
            <div className="group/template-preview relative min-w-0">
              <Button
                type="button"
                variant="ghost"
                className="h-auto w-full min-w-0 p-0 text-left text-inherit hover:bg-transparent"
                aria-pressed={isActive}
                aria-label={`Preview ${template.name} template`}
                onClick={() => onSelectTemplate(template.name)}
              >
                <TemplatePreview
                  template={template}
                  documentStyle={documentStyle}
                  pageWidth={pageWidth}
                  pageHeight={pageHeight}
                  pageAspectRatio={pageAspectRatio}
                />
              </Button>
              {onAddTemplate ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="absolute right-2 top-2 translate-y-1 border border-black/[0.18] bg-[rgb(22_22_22_/_0.86)] text-[10px] font-bold text-white opacity-0 shadow-[0_8px_18px_rgb(0_0_0_/_0.28)] backdrop-blur transition hover:bg-[rgb(40_40_40_/_0.9)] hover:text-white group-hover/template-preview:translate-y-0 group-hover/template-preview:opacity-100 group-focus-within/template-preview:translate-y-0 group-focus-within/template-preview:opacity-100"
                  aria-label={`Add ${template.name} template`}
                  onClick={() => onAddTemplate(template.name)}
                >
                  <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                  <span>Add</span>
                </Button>
              ) : null}
            </div>
            <div className="grid min-w-0 gap-[2px]">
              <span className="flex min-w-0 items-center gap-2 text-[12px] font-bold leading-tight text-[rgb(242_242_240_/_0.92)]">
                <LayoutTemplate aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[rgb(160_166_173_/_0.66)]" />
                <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
              </span>
              {template.description ? (
                <span className="line-clamp-2 text-[10px] leading-[1.35] text-[rgb(160_166_173_/_0.64)]">
                  {template.description}
                </span>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TemplatePreview({
  template,
  documentStyle,
  pageWidth,
  pageHeight,
  pageAspectRatio,
}: {
  template: SlideTemplateSourceEntry;
  documentStyle?: CSSProperties;
  pageWidth?: string;
  pageHeight?: string;
  pageAspectRatio?: string;
}) {
  const previewRef = useRef<HTMLSpanElement | null>(null);
  const [scale, setScale] = useState(TEMPLATE_PREVIEW_FALLBACK_SCALE);
  const pageWidthPx = parseCssPixels(pageWidth ?? "") ?? 1920;
  const pageHeightPx = parseCssPixels(pageHeight ?? "") ?? 1080;
  const pageVariableStyle = useMemo(() => ({
    "--openpress-page-width": `${pageWidthPx}px`,
    "--openpress-page-height": `${pageHeightPx}px`,
    "--openpress-page-aspect-ratio": pageAspectRatio ?? `${pageWidthPx} / ${pageHeightPx}`,
  }) satisfies CssVariableStyle, [pageAspectRatio, pageHeightPx, pageWidthPx]);
  const previewStyle = useMemo(() => ({
    ...pageVariableStyle,
    aspectRatio: pageAspectRatio ?? `${pageWidthPx} / ${pageHeightPx}`,
  }) satisfies CssVariableStyle, [pageAspectRatio, pageHeightPx, pageVariableStyle, pageWidthPx]);
  const scaledPageStyle = useMemo(() => ({
    ...documentStyle,
    ...pageVariableStyle,
    "--openpress-page-viewport-scale": String(scale),
    width: `${pageWidthPx * scale}px`,
    height: `${pageHeightPx * scale}px`,
  }) satisfies CssVariableStyle, [documentStyle, pageHeightPx, pageVariableStyle, pageWidthPx, scale]);

  useLayoutEffect(() => {
    if (!template.preview?.html || typeof window === "undefined") return undefined;
    const preview = previewRef.current;
    if (!preview) return undefined;

    const syncScale = () => {
      if (!preview.clientWidth || !preview.clientHeight) return;
      const nextScale = Number(Math.min(preview.clientWidth / pageWidthPx, preview.clientHeight / pageHeightPx).toFixed(4));
      setScale((current) => (Math.abs(current - nextScale) < 0.001 ? current : nextScale));
    };

    syncScale();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(syncScale) : null;
    observer?.observe(preview);
    window.addEventListener("resize", syncScale);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", syncScale);
    };
  }, [pageHeightPx, pageWidthPx, template.preview?.html]);

  if (!template.preview?.html) {
    return (
      <span
        className={cn(TEMPLATE_PREVIEW_CLASS, "grid place-items-center text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-500")}
        style={pageVariableStyle}
      >
        No preview
      </span>
    );
  }

  return (
    <span
      ref={previewRef}
      className={TEMPLATE_PREVIEW_CLASS}
      aria-hidden="true"
      style={previewStyle}
    >
      <span
        className={`${PUBLIC_HTML_PAGE_CLASS} absolute left-0 top-0`}
        style={scaledPageStyle}
      >
        <span
          className={`${PUBLIC_HTML_PAGE_HTML_CLASS} pointer-events-none select-none [&_.reader-page]:!shadow-none`}
          dangerouslySetInnerHTML={{ __html: template.preview.html }}
        />
      </span>
    </span>
  );
}

function parseCssPixels(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatTemplateLabel(name: string) {
  return name
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ") || name;
}
