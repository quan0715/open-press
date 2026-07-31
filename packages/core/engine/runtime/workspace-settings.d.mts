export type WorkspaceColorModePreference = "system" | "dark" | "light";
export type WorkspaceAccent = "amber" | "blue" | "emerald" | "violet" | "rose";

export interface WorkspaceSettings {
  version: 1;
  appearance: {
    colorMode: WorkspaceColorModePreference;
    accent: WorkspaceAccent;
  };
  page: string | false | null | {
    preset?: string;
    id?: string;
    label?: string;
    width?: string;
    height?: string;
  };
  captionNumbering: {
    figure: string;
    table: string;
    separator: string;
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
}

export interface LoadedWorkspaceSettings {
  settings: WorkspaceSettings;
  source: "settings" | "package" | "defaults";
  settingsPath: string;
  hasSettingsFile: boolean;
  sourceSettings: Record<string, unknown> | null;
  hasLegacy: boolean;
  legacyOpenpress: Record<string, unknown> | null;
  legacyUnknownKeys: string[];
  legacyConflicts: string[];
}

export const WORKSPACE_SETTINGS_VERSION: 1;
export const WORKSPACE_COLOR_MODES: readonly WorkspaceColorModePreference[];
export const WORKSPACE_ACCENTS: readonly WorkspaceAccent[];
export const LEGACY_OPENPRESS_KEYS: readonly string[];
export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings;

export function workspaceSettingsPath(root: string): string;
export function loadWorkspaceSettings(root?: string): Promise<LoadedWorkspaceSettings>;
export function findWorkspaceSettingsConflicts(
  legacy: Record<string, unknown>,
  settings: Record<string, unknown>,
): string[];
export function normalizeWorkspaceSettings(input?: Record<string, unknown>): WorkspaceSettings;
export function publicWorkspaceSettings(settings: WorkspaceSettings | Record<string, unknown>): Pick<WorkspaceSettings, "version" | "appearance">;
export function writeWorkspaceSettings(root: string, input: Record<string, unknown>): Promise<WorkspaceSettings>;
