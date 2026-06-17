import { cn } from "./cn";
import { mergeFixedBoxStyle } from "./box";
import { useContext, type CSSProperties } from "react";
import { FrameContext } from "./FrameContext";
import type {
  BaseCalloutProps,
  BaseFigureProps,
  LineProps,
  MediaCaptionProps,
  MediaFigureProps,
  MediaObjectProps,
  MediaProps,
  ObjectEntityProps,
  TextProps,
} from "./types";
import { createScopedObjectEntityId } from "../document-model/objectEntityModel";

export function ObjectEntity({
  as: Element = "span",
  box,
  kind,
  label,
  parentId,
  pageId,
  blockId,
  frameKey,
  chainId,
  source,
  metadata,
  children,
  style,
  ...entityProps
}: ObjectEntityProps) {
  const frame = useContext(FrameContext);
  const resolvedParentId = parentId ?? frame?.objectId;
  const resolvedPageId = pageId ?? frame?.pageId;
  const resolvedFrameKey = frameKey ?? frame?.frameKey;
  const sourceLocator = typeof (entityProps as Record<string, unknown>)["data-op-id"] === "string"
    ? String((entityProps as Record<string, unknown>)["data-op-id"])
    : null;
  const localObjectId = label ?? sourceLocator ?? kind;
  const resolvedObjectLabel = label ?? localObjectId;
  const resolvedObjectId = createScopedObjectEntityId(kind, resolvedParentId, localObjectId);
  const mergedStyle = mergeFixedBoxStyle(box, style as CSSProperties | undefined);

  return (
    <Element
      {...entityProps}
      style={mergedStyle}
      data-openpress-object-id={resolvedObjectId}
      data-openpress-object-kind={kind}
      data-openpress-object-label={resolvedObjectLabel}
      data-openpress-object-parent-id={resolvedParentId}
      data-openpress-object-page-id={resolvedPageId}
      data-openpress-block-id={blockId}
      data-openpress-object-frame-key={resolvedFrameKey}
      data-openpress-object-chain-id={chainId}
      data-openpress-object-source={source ? JSON.stringify(source) : undefined}
      data-openpress-object-metadata={metadata ? JSON.stringify(metadata) : undefined}
    >
      {children}
    </Element>
  );
}

export function Text(props: TextProps) {
  return <ObjectEntity {...props} kind="text" />;
}

export function Line({ color, className, style, "aria-hidden": ariaHidden = true, ...lineProps }: LineProps) {
  const lineStyle = {
    display: "block",
    background: color,
    ...(style as CSSProperties | undefined),
  } as CSSProperties;

  return (
    <ObjectEntity
      {...lineProps}
      as="span"
      kind="line"
      aria-hidden={ariaHidden}
      className={cn("openpress-line", className)}
      style={lineStyle}
    />
  );
}

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

export function MediaObject({ className, children, ...mediaObjectProps }: MediaObjectProps) {
  return (
    <ObjectEntity
      {...mediaObjectProps}
      as="figure"
      kind="media"
      className={cn("openpress-media-object", className)}
    >
      {children}
    </ObjectEntity>
  );
}

export function Media({
  src,
  alt,
  ratio,
  fit = "cover",
  position = "50% 50%",
  loading = "eager",
  className,
  style,
  ...mediaProps
}: MediaProps) {
  const mediaStyle = {
    "--openpress-media-ratio": ratio,
    "--openpress-media-fit": fit,
    "--openpress-media-position": position,
    ...(style as CSSProperties | undefined),
  } as CSSProperties;

  return (
    <img
      {...mediaProps}
      src={resolveMediaSrc(src)}
      alt={alt}
      loading={loading}
      className={cn("openpress-media", className)}
      style={mediaStyle}
    />
  );
}

export function MediaCaption({ className, children, ...captionProps }: MediaCaptionProps) {
  return (
    <figcaption {...captionProps} className={cn("openpress-media-caption", className)}>
      {children}
    </figcaption>
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
    <MediaObject {...figureProps} label={alt} className={cn("openpress-media-figure", className)}>
      <Media src={src} alt={alt} loading={loading} className={imgClassName} />
      <MediaCaption>{caption}</MediaCaption>
    </MediaObject>
  );
}

export const ImageFigure = MediaFigure;

function resolveMediaSrc(src: string) {
  const trimmed = String(src ?? "").trim();
  if (!trimmed) return "";
  if (/^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(trimmed)) return trimmed;
  return `/openpress/media/${trimmed.replace(/^\.?\/*/, "")}`;
}
