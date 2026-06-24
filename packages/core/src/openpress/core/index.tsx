// @open-press/core — Press tree primitives.
//
// Layout: this entry exports only the kernel. Source descriptors live in
// `@open-press/core/mdx`; manuscript helpers live in
// `@open-press/core/manuscript`. Keeping the surface small is intentional —
// the engine is not allowed to know about higher-level conventions.

export { Press, PressContext, PRESS_MARKER } from "./Press";
export { Workspace, WorkspaceContext, WORKSPACE_MARKER } from "./Workspace";
export { Frame, FRAME_MARKER } from "./Frame";
export { Slide, SLIDE_MARKER } from "./Slide";
export { FrameContext } from "./FrameContext";
export { PageFolio } from "./PageFolio";
export { MdxArea } from "./MdxArea";
export { useSource } from "./useSource";
export { ObjectEntity, Text, Line, BaseFigure, MediaObject, Media, MediaCaption, MediaFigure, ImageFigure } from "./primitives";

export type {
  FrameProps,
  FrameLayout,
  FrameStackLayout,
  FrameGridLayout,
  FrameLayoutAxis,
  FrameLayoutSize,
  FrameLayoutSpacing,
  SlideProps,
  SlideMeta,
  SlideIndexProps,
  FrameRole,
  MdxAreaProps,
  MdxAreaElement,
  MdxAreaOverflow,
  PressProps,
  PressTheme,
  PressThemePath,
  SlidePressTheme,
  DocumentPressTheme,
  PageGeometry,
  PressSource,
  WorkspaceProps,
  BaseFigureProps,
  MediaFigureProps,
  MediaObjectProps,
  MediaProps,
  MediaCaptionProps,
  MediaFit,
  ObjectEntityElement,
  ObjectEntityProps,
  TextProps,
  LineProps,
  FixedBox,
  FixedBoxLength,
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

export type { PressContextValue, AllocationHints, PressMetadata } from "./Press";
export type { WorkspaceContextValue } from "./Workspace";
export type { FrameContextValue } from "./FrameContext";
export type { PageFolioNumberFormat, PageFolioProps, PageFolioVariant } from "./PageFolio";
