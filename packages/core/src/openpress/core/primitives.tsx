import { cn } from "./cn";
import type { BaseCalloutProps, BaseFigureProps, MediaFigureProps } from "./types";

export function BaseFigure({ caption, className, children, ...figureProps }: BaseFigureProps) {
  return (
    <figure {...figureProps} className={cn("openpress-figure", className)}>
      <div data-figure-body>{children}</div>
      {caption === undefined ? null : <figcaption>{caption}</figcaption>}
    </figure>
  );
}

export function BaseCallout({ kind = "info", className, children, ...calloutProps }: BaseCalloutProps) {
  return (
    <aside {...calloutProps} className={cn("openpress-callout", className)} data-callout-kind={kind}>
      {children}
    </aside>
  );
}

export function MediaFigure({
  src,
  alt,
  caption,
  className,
  imgClassName,
  loading = "eager",
  ...figureProps
}: MediaFigureProps) {
  return (
    <BaseFigure {...figureProps} className={cn("openpress-media-figure", className)} caption={caption}>
      <img src={resolveMediaSrc(src)} alt={alt} loading={loading} className={imgClassName} />
    </BaseFigure>
  );
}

export const ImageFigure = MediaFigure;

function resolveMediaSrc(src: string) {
  const trimmed = String(src ?? "").trim();
  if (!trimmed) return "";
  if (/^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(trimmed)) return trimmed;
  return `/openpress/media/${trimmed.replace(/^\.?\/*/, "")}`;
}
