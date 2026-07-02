import { useContext, type CSSProperties } from "react";
import { mergeFixedBoxStyle } from "./box";
import { cn } from "./cn";
import { FrameContext, type FrameContextValue } from "./FrameContext";
import { PressContext } from "./Press";
import type { FrameLayout, FrameLayoutSize, FrameLayoutSpacing, FrameProps } from "./types";
import { createFrameObjectEntityId, createPageObjectEntityId, createScopedObjectEntityId } from "../document-model/objectEntityModel";

// Substring reserved for the overflow extension pipeline.
const RESERVED_EXTENDED = ":extended:";

export const FRAME_MARKER: unique symbol = Symbol.for("@open-press/core:Frame");

export function Frame({
  frameKey,
  role,
  chrome = true,
  box,
  layout,
  className,
  style,
  children,
  ...rest
}: FrameProps) {
  if (!frameKey || !String(frameKey).trim()) {
    throw new Error("Frame requires a non-empty frameKey.");
  }
  if (frameKey && frameKey.includes(RESERVED_EXTENDED)) {
    throw new Error(
      `Frame frameKey="${frameKey}" contains reserved substring ":extended:". ` +
        `This pattern is reserved for the overflow-extension pipeline.`,
    );
  }

  const parentFrame = useContext(FrameContext);
  const press = useContext(PressContext);
  const allocation = press?.allocation ?? null;
  const frameAllocation = frameKey && allocation ? allocation[frameKey] : undefined;
  const pageId = parentFrame?.pageId ?? createPageObjectEntityId(frameKey);
  const objectId = parentFrame
    ? createScopedObjectEntityId("frame", parentFrame.objectId, frameKey)
    : createFrameObjectEntityId(frameKey);

  // Mutable per-render counter. SSR renders a Frame exactly once, so a plain
  // object is fine — no useRef needed.
  const areaCounts: Record<string, number> = {};
  const frameContextValue: FrameContextValue = {
    frameKey: frameKey ?? "",
    objectId,
    pageId,
    consumeArea(chainId: string) {
      const index = areaCounts[chainId] ?? 0;
      areaCounts[chainId] = index + 1;
      if (!frameAllocation) return { indexInFrame: index, blocks: null };
      const chainSlots = frameAllocation[chainId];
      if (!chainSlots) return { indexInFrame: index, blocks: null };
      return { indexInFrame: index, blocks: chainSlots[index] ?? null };
    },
  };

  const pageKind = derivePageKind(role);
  const isNestedFrame = Boolean(parentFrame);
  const layoutStyle = layout ? createFrameLayoutStyle(layout) : undefined;
  const mergedStyle = mergeFixedBoxStyle(
    box,
    layoutStyle ? { ...layoutStyle, ...(style as CSSProperties | undefined) } : style,
  );

  return (
    <FrameContext.Provider value={frameContextValue}>
      <section
        {...(rest as Record<string, unknown>)}
        style={mergedStyle}
        className={cn(isNestedFrame ? undefined : "reader-page", layout ? "openpress-frame-layout" : undefined, className)}
        data-openpress-frame-key={isNestedFrame ? undefined : frameKey}
        data-openpress-region-frame-key={isNestedFrame ? frameKey : undefined}
        data-openpress-object-id={objectId}
        data-openpress-object-kind="frame"
        data-openpress-object-label={role ?? frameKey}
        data-openpress-object-parent-id={parentFrame?.objectId ?? (isNestedFrame ? undefined : pageId)}
        data-openpress-object-page-id={pageId}
        data-frame-role={role}
        data-page-kind={isNestedFrame ? undefined : pageKind}
        data-frame-chrome={isNestedFrame ? undefined : chrome ? "true" : "false"}
        data-page-footer={isNestedFrame ? undefined : chrome ? "true" : "false"}
        data-openpress-layout-mode={layout?.mode}
        data-openpress-layout-direction={layout?.mode === "stack" ? layout.direction ?? "vertical" : undefined}
        data-openpress-layout-clip={layout?.clip ? "true" : undefined}
        data-openpress-layout-width={layout?.width === undefined ? undefined : String(layout.width)}
        data-openpress-layout-height={layout?.height === undefined ? undefined : String(layout.height)}
      >
        {children}
      </section>
    </FrameContext.Provider>
  );
}

(Frame as unknown as { openpressMarker: typeof FRAME_MARKER }).openpressMarker = FRAME_MARKER;

function derivePageKind(role: string | undefined): string | undefined {
  if (!role) return undefined;
  const trimmed = role.trim();
  if (!trimmed) return undefined;
  const lastDot = trimmed.lastIndexOf(".");
  return lastDot === -1 ? trimmed : trimmed.slice(lastDot + 1);
}

function createFrameLayoutStyle(layout: FrameLayout): CSSProperties {
  const style: Record<string, string> = {
    "--openpress-frame-layout-width": normalizeFrameLayoutSize(layout.width),
    "--openpress-frame-layout-height": normalizeFrameLayoutSize(layout.height),
  };

  if (layout.gap !== undefined) {
    style["--openpress-frame-layout-gap"] = normalizeFrameLayoutLength(layout.gap);
  }
  if (layout.padding !== undefined) {
    style["--openpress-frame-layout-padding"] = normalizeFrameLayoutLength(layout.padding);
  }
  if (layout.mode === "stack") {
    style["--openpress-frame-layout-direction"] = layout.direction === "horizontal" ? "row" : "column";
  } else {
    if (layout.columns !== undefined) {
      style["--openpress-frame-layout-columns"] = normalizeGridTrack(layout.columns);
    }
    if (layout.rows !== undefined) {
      style["--openpress-frame-layout-rows"] = normalizeGridTrack(layout.rows);
    }
  }

  return style as CSSProperties;
}

function normalizeFrameLayoutLength(value: FrameLayoutSpacing): string {
  return typeof value === "number" ? `${value}px` : value;
}

function normalizeFrameLayoutSize(value: FrameLayoutSize | undefined): string {
  if (value === undefined) return "auto";
  if (value === "fill") return "100%";
  if (value === "hug") return "fit-content";
  return normalizeFrameLayoutLength(value);
}

function normalizeGridTrack(value: number | (string & {})): string {
  return typeof value === "number" ? `repeat(${value}, minmax(0, 1fr))` : value;
}
