import { cn } from "./cn";
import { useContext } from "react";
import { FrameContext } from "./FrameContext";
import type { BaseCalloutProps, BaseFigureProps, MediaFigureProps, ObjectEntityProps, TextProps } from "./types";
import { createScopedObjectEntityId } from "../document-model/objectEntityModel";

export function ObjectEntity({
  as: Element = "span",
  objectId,
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
  ...entityProps
}: ObjectEntityProps) {
  const frame = useContext(FrameContext);
  const resolvedParentId = parentId ?? frame?.objectId;
  const resolvedPageId = pageId ?? frame?.pageId;
  const resolvedFrameKey = frameKey ?? frame?.frameKey;
  const sourceLocator = typeof (entityProps as Record<string, unknown>)["data-op-id"] === "string"
    ? String((entityProps as Record<string, unknown>)["data-op-id"])
    : null;
  const localObjectId = objectId ?? sourceLocator ?? label ?? kind;
  const resolvedObjectLabel = label ?? localObjectId;
  const resolvedObjectId = createScopedObjectEntityId(kind, resolvedParentId, localObjectId);

  return (
    <Element
      {...entityProps}
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
