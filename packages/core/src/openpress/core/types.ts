import type { HTMLAttributes, ReactNode } from "react";
import type { EditableSourceRef, ObjectEntityKind } from "../document-model/documentTypes";

// ---------------------------------------------------------------------------
// Frame / MdxArea / Press primitives
// ---------------------------------------------------------------------------

// `role` is opaque to core. Helpers and themes interpret it; the engine
// never branches on its value. Format convention is dotted, e.g.
// "manuscript.cover", "manuscript.content", "folio.page".
export type FrameRole = string;

export type FrameProps = Omit<HTMLAttributes<HTMLElement>, "role" | "children"> & {
  frameKey: string;
  role?: FrameRole;
  chrome?: boolean;
  className?: string;
  children?: ReactNode;
};

export type MdxAreaOverflow = "extend" | "truncate" | "error";

export type MdxAreaProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  chainId: string;
  overflow?: MdxAreaOverflow;
  className?: string;
};

// PageGeometry — a custom fixed-size geometry passed to <Press page>.
// Same shape as the engine's normalized geometry (CSS lengths,
// matching units between width / height).
export interface PageGeometry {
  id?: string;
  label?: string;
  preset?: string;
  width: string;
  height: string;
}

// Source descriptor passed inside <Press sources>. The actual type is
// the return value of mdxSource() from @open-press/core/mdx; we accept
// "unknown" at the core boundary to avoid a circular type dependency.
// The engine validates the shape at render time.
export type PressSource = unknown;

export interface PressProps {
  // Document tree — Frames, manuscript helpers, etc.
  children: ReactNode;
  // -------------------------------------------------------------------------
  // 1.0 metadata props — optional during v0.x deprecation, required in v1.0.
  // -------------------------------------------------------------------------
  // Document title. Required in 1.0. Used for PDF metadata, HTML <title>,
  // OG tags, and the Workspace gallery / tab-bar label.
  title?: string;
  // Page geometry preset name or a custom geometry object. Optional;
  // workspace default applies if not set.
  page?: "a4" | "social-square" | "slide-16-9" | PageGeometry;
  // Array of source registrations from mdxSource(). Replaces the v0.x
  // `export const sources` named export.
  sources?: ReadonlyArray<PressSource>;
  // URL / output slug for this Press inside a Workspace. Defaults to
  // "/" when only one Press exists in the Workspace; required when the
  // Workspace has multiple Press children.
  slug?: string;
  // Optional per-Press theme directory. Defaults to "./theme" relative
  // to the document file; inherits from <Workspace theme> if not set.
  theme?: string;
  // Optional per-Press components directory. Default "./components".
  componentsDir?: string;
}

// ---------------------------------------------------------------------------
// Workspace — root component holding one or more Press children
// ---------------------------------------------------------------------------

export interface WorkspaceProps {
  // One or more <Press> children. 1 child = single-doc workspace; N
  // children = multi-doc workspace (proposal + pitch + social, etc).
  children: ReactNode;
  // Project label surfaced in the gallery header, tab bar, and PDF
  // metadata. Optional.
  name?: string;
  // Workspace-level shared theme directory. Press children that don't
  // set their own `theme` prop inherit from this. Default "./theme".
  theme?: string;
  // Workspace-level shared media directory. Default "./media".
  media?: string;
}

// ---------------------------------------------------------------------------
// Content primitives (figure, callout)
// ---------------------------------------------------------------------------

export type BaseFigureProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  caption?: ReactNode;
  children: ReactNode;
};

export type MediaFigureProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  src: string;
  alt: string;
  caption: ReactNode;
  imgClassName?: string;
  loading?: "eager" | "lazy";
};

export type BaseCalloutKind = "info" | "warn" | "success" | "error" | (string & {});

export type BaseCalloutProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  kind?: BaseCalloutKind;
  children: ReactNode;
};

export type ObjectEntityElement = "span" | "div" | "section" | "article" | "figure" | "p";

export type ObjectEntityProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  as?: ObjectEntityElement;
  objectId: string;
  kind: ObjectEntityKind;
  label: string;
  parentId?: string;
  pageId?: string;
  blockId?: string;
  frameKey?: string;
  chainId?: string;
  source?: EditableSourceRef;
  metadata?: Record<string, string | number | boolean | null>;
  children?: ReactNode;
};

export type TextProps = Omit<ObjectEntityProps, "kind"> & {
  as?: "span" | "div" | "p";
};

// ---------------------------------------------------------------------------
// Source descriptors and resolved sources
// ---------------------------------------------------------------------------

export interface MdxSourceDescriptorSectionFolders {
  type: "mdx";
  preset: "section-folders";
  root?: string;
}

export interface MdxSourceDescriptorSectionFiles {
  type: "mdx";
  preset: "section-files";
  root?: string;
}

export interface MdxSourceDescriptorFileList {
  type: "mdx";
  preset: "file-list";
  files: string[];
}

export type MdxSourceDescriptor =
  | MdxSourceDescriptorSectionFolders
  | MdxSourceDescriptorSectionFiles
  | MdxSourceDescriptorFileList;

export type SourceDescriptor = MdxSourceDescriptor;

export interface SourceNode {
  id: string;
  slug: string;
  title: string;
  meta?: Record<string, unknown>;
  children?: SourceNode[];
}

export interface OutlineItem {
  id: string;
  depth: number;
  title: string;
  sectionSlug: string;
  pageNumber?: number;
}

export interface TocEntry {
  id: string;
  blockId: string;
  sourceId: string;
  sectionSlug: string;
  title: string;
  href: string;
  level: 2 | 3;
  label: string;
  pageNumber?: number;
}

export interface SourceFileRecord {
  path: string;
  absolutePath: string;
  sectionSlug: string;
}

export interface SourceBlock {
  id: string;
  kind: string;
  name?: string;
  chainId: string;
  sectionSlug: string;
  path: string;
  source: {
    file: string;
    line?: number;
    column?: number;
    offset?: number;
  };
}

export interface ResolvedSource {
  id: string;
  type: "mdx";
  tree: SourceNode[];
  outline: OutlineItem[];
  chains: Record<string, SourceBlock[]>;
  files: SourceFileRecord[];
}

// ---------------------------------------------------------------------------
// Allocation context shape (engine -> Frame -> MdxArea)
// ---------------------------------------------------------------------------

// Per-frame, per-chain, ordered list of React nodes assigned to each
// MdxArea by area index.
export type FrameAllocation = Record<string, Record<string, ReactNode[]>>;

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

export interface Manifest {
  title: string;
  subtitle?: string;
  organization?: string;
  workspaceLabel?: string;
  documentDir?: string;
  sourceDir?: string;
  componentsDir?: string;
  mediaDir?: string;
  themeDir?: string;
  designDoc?: string;
  publicDir?: string;
  outputDir?: string;
  captionNumbering?: {
    figure?: string;
    table?: string;
    separator?: string;
  };
  page?: "a4" | "social-square" | "slide-16-9" | {
    preset?: "a4" | "social-square" | "slide-16-9";
    id?: string;
    label?: string;
    width?: string;
    height?: string;
  };
  pdf?: {
    filename?: string;
  };
  deploy?: {
    adapter?: string;
    source?: string;
    projectName?: string | null;
    commitDirty?: boolean;
    requiresConfirmation?: boolean;
  };
  paths?: {
    chaptersDir?: string;
    sourceDir?: string;
    componentsDir?: string;
    mediaDir?: string;
    themeDir?: string;
    designDoc?: string;
  };
}
