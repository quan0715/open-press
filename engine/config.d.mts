export interface QDocResolvedConfig {
  root: string;
  configPath: string;
  title: string;
  documentDir: string;
  sourceDir: string;
  mediaDir: string;
  themeDir: string;
  designDoc: string;
  componentsDir: string;
  publicDir: string;
  outputDir: string;
  pdf: {
    filename: string;
  };
  deploy: {
    adapter: string;
    source: string;
    projectName: string | null;
    commitDirty: boolean;
    requiresConfirmation: boolean;
  };
  paths: {
    documentRoot: string;
    sourceDir: string;
    mediaDir: string;
    themeDir: string;
    designDoc: string;
    componentsDir: string;
    publicDir: string;
    outputDir: string;
    pdf: string;
    deploySource: string;
    deployMetadata: string;
  };
}

export function loadQDocConfig(root?: string): Promise<QDocResolvedConfig>;
export function normalizeQDocConfig(root: string, userConfig?: Record<string, unknown>, configPath?: string): QDocResolvedConfig;
export function publicPdfHref(config: QDocResolvedConfig): string;
