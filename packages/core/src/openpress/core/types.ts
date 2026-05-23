import type { HTMLAttributes, ReactNode } from "react";

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

export interface PressProps {
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// Content primitives (figure, callout)
// ---------------------------------------------------------------------------

export type BaseFigureProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  caption?: ReactNode;
  children: ReactNode;
};

export type BaseCalloutKind = "info" | "warn" | "success" | "error" | (string & {});

export type BaseCalloutProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  kind?: BaseCalloutKind;
  children: ReactNode;
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
