export interface ResolvedConfig {
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
  page: null | {
    id: string;
    label: string;
    width: string;
    height: string;
    aspectRatio?: string;
    heightRatio?: string;
  };
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

export function loadConfig(root?: string): Promise<ResolvedConfig>;
export function normalizeConfig(root: string, userConfig?: Record<string, unknown>, configPath?: string): ResolvedConfig;
export function publicPdfHref(config: ResolvedConfig): string;
