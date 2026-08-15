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
