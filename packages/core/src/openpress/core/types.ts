import type { HTMLAttributes, ReactNode } from "react";
import type { EditableSourceRef, ObjectEntityKind, PressType } from "../document-model/documentTypes";

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

export type SlideProps = Omit<FrameProps, "frameKey" | "role" | "chrome" | "title"> & {
  id: string;
  role?: FrameRole;
  chrome?: boolean;
};

export interface SlideMeta {
  layout?: string;
  description?: string;
  keypoints?: string[];
  visuals?: string[];
}

export type SlideIndexProps = Omit<SlideProps, "children" | "role" | "chrome"> & {
  skip?: boolean;
  transition?: string;
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
  // Press metadata props.
  // -------------------------------------------------------------------------
  // Document title. Used for PDF metadata, HTML <title>,
  // OG tags, and the Workspace gallery / tab-bar label.
  title?: string;
  // Creation mode. Pages are source-driven with MDX allocation; slides are
  // explicit one-frame-per-page documents. Defaults to "pages".
  type?: PressType;
  // Page geometry preset name or a custom geometry object. Optional;
  // workspace default applies if not set.
  page?: "a4" | "social-square" | "slide-16-9" | PageGeometry;
  // Array of source registrations from mdxSource(). Replaces the v0.x
  // `export const sources` named export.
  sources?: ReadonlyArray<PressSource>;
  // URL / output slug for this Press. Must match the Press folder name.
  slug?: string;
  // Optional per-Press theme directory. Defaults include the folder-local
  // "./theme"; shared theme is a legacy compatibility path.
  theme?: string;
  // Optional per-Press components directories. Prefer folder-local
  // "./components"; shared components are an explicit multi-Press choice.
  componentsDir?: string | string[];
  // Optional per-Press media directories. Prefer folder-local "./media";
  // shared media is an explicit multi-Press choice.
  mediaDir?: string | string[];
  // Optional caption numbering overrides. Engine defaults to
  // { figure: "Figure", table: "Table", separator: " " }.
  captionNumbering?: {
    figure?: string;
    table?: string;
    separator?: string;
  };
}

// ---------------------------------------------------------------------------
// Workspace — engine-owned grouping component holding one or more Press
// children from discovered press/*/press.tsx entries.
// ---------------------------------------------------------------------------

export interface WorkspaceProps {
  // One or more <Press> children. 1 child = single-doc workspace; N
  // children = multi-doc workspace (proposal + pitch + social, etc).
  children: ReactNode;
  // Project label surfaced in the gallery header, tab bar, and PDF
  // metadata. Optional.
  name?: string;
  // Reserved; new work should prefer per-Press theme ownership.
  theme?: string;
  // Reserved; new work should prefer per-Press media ownership.
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

export type ObjectEntityElement = keyof HTMLElementTagNameMap;

export type ObjectEntityProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  as?: ObjectEntityElement;
  objectId?: string;
  kind: ObjectEntityKind;
  label?: string;
  parentId?: string;
  pageId?: string;
  blockId?: string;
  frameKey?: string;
  chainId?: string;
  source?: EditableSourceRef;
  metadata?: Record<string, string | number | boolean | null>;
  children?: ReactNode;
};

export type TextProps = Omit<ObjectEntityProps, "kind">;

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
