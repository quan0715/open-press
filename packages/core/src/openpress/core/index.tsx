// @open-press/core — Press tree primitives.
//
// Layout: this entry exports only the kernel. Source descriptors live in
// `@open-press/core/mdx`; manuscript helpers live in
// `@open-press/core/manuscript`. Keeping the surface small is intentional —
// the engine is not allowed to know about higher-level conventions.

export { Press, PressContext, PRESS_MARKER } from "./Press";
export { Frame, FRAME_MARKER } from "./Frame";
export { FrameContext } from "./FrameContext";
export { MdxArea } from "./MdxArea";
export { useSource } from "./useSource";
export { BaseFigure, BaseCallout, MediaFigure, ImageFigure } from "./primitives";

export type {
  FrameProps,
  FrameRole,
  MdxAreaProps,
  MdxAreaOverflow,
  PressProps,
  BaseFigureProps,
  MediaFigureProps,
  BaseCalloutKind,
  BaseCalloutProps,
  Manifest,
  // Source-side types are re-exported here for convenience so authors can
  // import `ResolvedSource` from the same place they import primitives.
  ResolvedSource,
  SourceNode,
  OutlineItem,
  SourceFileRecord,
  SourceBlock,
  TocEntry,
  MdxSourceDescriptor,
  SourceDescriptor,
  FrameAllocation,
} from "./types";

export type { PressContextValue, AllocationHints } from "./Press";
export type { FrameContextValue } from "./FrameContext";
