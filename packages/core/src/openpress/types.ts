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

export interface DocumentSource {
  type: string;
  contentDir?: string;
  editable?: boolean;
  editMode?: string;
  styles?: DocumentStyle[];
  blockMap?: Record<string, SourceBlock>;
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
}

export interface DocumentMeta {
  title: string;
  subtitle?: string;
  organization?: string;
  version?: string;
  footer?: string;
  workspaceLabel?: string;
}

export interface Theme {
  pageWidth?: string;
  pageHeight?: string;
  pagePadding?: string;
  fontFamily?: string;
  accentColor?: string;
  textColor?: string;
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
}
