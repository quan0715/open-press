import type { ThemeProfile } from "../theme";

export interface DeploymentInfo {
  online: boolean;
  deployedAt?: string;
  pdf?: string;
  publicUrl?: string;
  dirty?: boolean;
  configured?: boolean;
  adapter?: string;
  source?: string;
  projectName?: string;
  setupMessage?: string;
}

export interface ReaderDocument {
  meta: DocumentMeta;
  source?: DocumentSource;
  theme?: Theme;
  blocks: HtmlPageBlock[];
}

export type PressType = "pages" | "slides";

export interface DocumentSource {
  type: string;
  contentDir?: string;
  editable?: boolean;
  editMode?: string;
  styles?: DocumentStyle[];
  blockMap?: Record<string, SourceBlock>;
  objectEntities?: Record<string, ObjectEntity>;
  slides?: SlideSourceEntry[];
  slideTemplates?: SlideTemplateSourceEntry[];
}

export interface SlideSourceEntry {
  id: string;
  skip?: boolean;
  notes?: string;
}

export interface SlideTemplateSourceEntry {
  name: string;
  description?: string;
  default?: boolean;
  preview?: HtmlPageBlock;
}

export interface DocumentStyle {
  kind: string;
  href?: string;
  path?: string;
}

export interface SourceLocation {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

export interface SourceBlock {
  id: string;
  kind?: string;
  name?: string;
  chapterSlug?: string;
  path: string;
  pageIndex?: number;
  pageNumber?: number;
  source?: SourceLocation;
  frameKey?: string;
  chainId?: string;
  sectionSlug?: string;
}

export interface DocumentMeta {
  title: string;
  type?: PressType;
  subtitle?: string;
  organization?: string;
  version?: string;
  footer?: string;
  workspaceLabel?: string;
}

export interface Theme {
  name?: string;
  description?: string;
  profile?: ThemeProfile;
  pagePreset?: string;
  pageLabel?: string;
  pageWidth?: string;
  pageHeight?: string;
  pageAspectRatio?: string;
  pageHeightRatio?: string;
  pagePadding?: string;
  fontFamily?: string;
  accentColor?: string;
  textColor?: string;
  colors?: Record<string, ThemeColorToken>;
  fonts?: Record<string, string>;
  typography?: Record<string, ThemeTypographyToken>;
  cssVars?: Record<`--${string}`, string>;
}

export interface ThemeColorToken {
  key?: string;
  label?: string;
  value: string;
  cssVar?: string;
  description?: string;
  foreground?: string;
}

export interface ThemeTypographyToken {
  key?: string;
  label?: string;
  font?: string;
  fontFamily?: string;
  size: string | number;
  lineHeight?: string | number;
  weight?: string | number;
  tracking?: string | number;
  color?: string;
  transform?: string;
  sample?: string;
  cssVars?: {
    fontFamily?: string;
    fontSize?: string;
    lineHeight?: string;
    fontWeight?: string;
    letterSpacing?: string;
    color?: string;
  };
}

export interface BlockSource {
  file: string;
  path: string;
  kind?: string;
  chapter?: number;
  slug?: string;
  sectionIndex?: number;
}

// The engine currently emits one block kind only: a fully-rendered HTML page.
// All historical structured-block variants (cover / section / paragraph /
// list / figure / table / callout) were aspirational and never instantiated;
// they were removed along with the unused client-side block model. If the
// engine ever emits structured blocks again, reintroduce a discriminated
// union here.
export interface HtmlPageBlock {
  id: string;
  kind: "htmlPage";
  title: string;
  pageNumber: number;
  html: string;
  anchors?: string[];
  className?: string;
  source?: BlockSource;
  frameKey?: string;
  role?: string | null;
  chrome?: boolean;
  blockIds?: string[];
}

export type ObjectEntityKind =
  | "page"
  | "frame"
  | "mdx-area"
  | "mdx-block"
  | "text"
  | "line"
  | "component"
  | "media";

export interface EditableSourceRef {
  path: string;
  file?: string;
  kind?: string;
  objectId?: string;
  scope?: string;
  component?: string;
  source?: SourceLocation;
  line?: number;
  column?: number;
}

export interface ObjectEntityRef {
  id: string;
  kind: ObjectEntityKind;
}

export interface ObjectEntity {
  id: string;
  kind: ObjectEntityKind;
  label: string;
  parentId?: string;
  pageId?: string;
  blockId?: string;
  frameKey?: string;
  chainId?: string;
  source?: EditableSourceRef;
  metadata?: Record<string, string | number | boolean | null>;
}
