export interface QDocDeploymentInfo {
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

export interface QDocDocument {
  meta: QDocMeta;
  source?: QDocDocumentSource;
  theme?: QDocTheme;
  blocks: QDocHtmlPageBlock[];
}

export interface QDocDocumentSource {
  type: string;
  contentDir?: string;
  editable?: boolean;
  editMode?: string;
  styles?: QDocDocumentStyle[];
  blockMap?: Record<string, QDocReactSourceBlock>;
  pagination?: QDocReactPagination;
}

export interface QDocDocumentStyle {
  kind: string;
  href?: string;
  path?: string;
}

export interface QDocSourceLocation {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

export interface QDocReactSourceBlock {
  id: string;
  kind?: string;
  name?: string;
  chapterSlug?: string;
  path: string;
  pageIndex?: number;
  pageNumber?: number;
  source?: QDocSourceLocation;
}

export interface QDocReactPagination {
  mode: string;
  pageSafeHeightPx?: number;
  warnings?: QDocReactPaginationWarning[];
}

export interface QDocReactPaginationWarning {
  code: string;
  blockId?: string;
  height?: number;
  pageSafeHeightPx?: number;
  path?: string;
  source?: QDocSourceLocation;
}

export interface QDocMeta {
  title: string;
  subtitle?: string;
  organization?: string;
  version?: string;
  footer?: string;
  workspaceLabel?: string;
}

export interface QDocTheme {
  pageWidth?: string;
  pageHeight?: string;
  pagePadding?: string;
  fontFamily?: string;
  accentColor?: string;
  textColor?: string;
}

export interface QDocBlockSource {
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
export interface QDocHtmlPageBlock {
  id: string;
  kind: "htmlPage";
  title: string;
  pageNumber: number;
  html: string;
  anchors?: string[];
  className?: string;
  source?: QDocBlockSource;
}
