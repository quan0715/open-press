export interface BuiltInSkillItem {
  name: string;
  displayName: string;
  description: string;
  isInstalled: boolean;
}

export interface CompanionPluginItem {
  name: string;
  displayName: string;
  category: string;
  description: string;
  source: string;
  ref?: string;
  isInstalled: boolean;
  isLocked: boolean;
  prompts: {
    check?: string;
    update?: string;
  };
}

export interface WorkspaceUpdatesInfo {
  openpress: {
    coreVersion: string | null;
    isLocalDev: boolean;
    prompts: {
      update: string;
    };
  };
  builtInSkills: {
    expected: string[];
    installedCount: number;
    missing: string[];
    items?: BuiltInSkillItem[];
    prompts: {
      sync: string;
    };
  };
  plugins: {
    totalCatalogCount: number;
    installedCount: number;
    items: CompanionPluginItem[];
    prompts: {
      updateAll: string;
    };
  };
  externalSkills?: {
    trackedCount: number;
    untrackedCount: number;
    items: Array<{
      name: string;
      source: string;
      sourceType: string;
      isUntracked?: boolean;
      prompts?: { check: string; update: string };
    }>;
    prompts: { updateAll: string };
  };
}

export function readCoreInfo(root?: string): Promise<{ coreVersion: string | null; isLocalDev: boolean }>;
export function readPluginCatalog(root?: string): Promise<Record<string, { name?: string; category?: string; description?: string; source?: string }>>;
export function inspectWorkspaceUpdates(root?: string): Promise<WorkspaceUpdatesInfo>;
export function buildCoreUpdatePrompt(opts: { coreVersion: string | null; isLocalDev: boolean }): string;
export function buildBuiltInSkillsSyncPrompt(opts?: { missing?: string[] }): string;
export function buildPluginCheckPrompt(opts: { name: string; source: string; ref?: string }): string;
export function buildPluginUpdatePrompt(opts: { name: string; source: string; ref?: string }): string;
export function buildAllPluginsUpdatePrompt(opts?: { plugins?: Array<{ name: string; source: string }> }): string;
