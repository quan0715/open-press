export interface QDocDeploymentInfo {
  online: boolean;
  deployedAt?: string;
  pdf?: string;
  publicUrl?: string;
  dirty?: boolean;
}

export interface QDocDesignSystemInfo {
  sourceDir: string;
  status: "ready" | "missing";
  files: Array<{
    name: string;
    title: string;
    path: string;
    exists: boolean;
    body: string;
  }>;
  previewDocument?: QDocDocument;
}

export interface QDocDocument {
  meta: QDocMeta;
  source?: {
    type: string;
    contentDir?: string;
    editable?: boolean;
    editMode?: string;
  };
  theme?: QDocTheme;
  blocks: QDocHtmlPageBlock[];
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
