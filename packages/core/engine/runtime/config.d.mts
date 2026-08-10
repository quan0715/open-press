import type { WorkspaceSettings } from "./workspace-settings.mjs";

export interface ResolvedConfig {
  root: string;
  configPath: string;
  settings: WorkspaceSettings;
  settingsSource: "settings" | "package" | "defaults";
  hasLegacySettings: boolean;
  legacyUnknownKeys: string[];
  appearance: WorkspaceSettings["appearance"];
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
    presses: Record<string, {
      source: string;
      projectName: string;
    }>;
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
    settings: string;
  };
}

export function loadConfig(root?: string): Promise<ResolvedConfig>;
export function normalizeConfig(root: string, userConfig?: Record<string, unknown>, configPath?: string): ResolvedConfig;
export function publicPdfHref(config: ResolvedConfig): string;
