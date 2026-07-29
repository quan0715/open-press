import { useCallback, useEffect, useMemo, useState } from "react";

export type WorkspaceColorModePreference = "system" | "dark" | "light";
export type WorkspaceColorMode = "dark" | "light";
export type WorkspaceAccent = "amber" | "blue" | "emerald" | "violet" | "rose";

export interface WorkspaceAppearance {
  colorModePreference: WorkspaceColorModePreference;
  accent: WorkspaceAccent;
}

interface StorageReader {
  getItem(key: string): string | null;
}

interface StorageWriter {
  setItem(key: string, value: string): void;
}

export const WORKSPACE_COLOR_MODE_STORAGE_KEY = "openpress:workspace:color-mode";
export const WORKSPACE_ACCENT_STORAGE_KEY = "openpress:workspace:accent";

export const WORKSPACE_COLOR_MODE_OPTIONS = ["system", "dark", "light"] as const;
export const WORKSPACE_ACCENT_OPTIONS = ["amber", "blue", "emerald", "violet", "rose"] as const;

const DEFAULT_WORKSPACE_APPEARANCE: WorkspaceAppearance = {
  colorModePreference: "dark",
  accent: "amber",
};

export function readWorkspaceAppearance(storage: StorageReader | null | undefined): WorkspaceAppearance {
  if (!storage) return DEFAULT_WORKSPACE_APPEARANCE;
  try {
    const storedMode = storage.getItem(WORKSPACE_COLOR_MODE_STORAGE_KEY);
    const storedAccent = storage.getItem(WORKSPACE_ACCENT_STORAGE_KEY);
    return {
      colorModePreference: isWorkspaceColorModePreference(storedMode)
        ? storedMode
        : DEFAULT_WORKSPACE_APPEARANCE.colorModePreference,
      accent: isWorkspaceAccent(storedAccent)
        ? storedAccent
        : DEFAULT_WORKSPACE_APPEARANCE.accent,
    };
  } catch {
    return DEFAULT_WORKSPACE_APPEARANCE;
  }
}

export function resolveWorkspaceColorMode(
  preference: WorkspaceColorModePreference,
  prefersLight: boolean,
): WorkspaceColorMode {
  if (preference === "system") return prefersLight ? "light" : "dark";
  return preference;
}

export function useWorkspaceAppearance() {
  const [appearance, setAppearance] = useState<WorkspaceAppearance>(() => readWorkspaceAppearance(browserStorage()));
  const [prefersLight, setPrefersLight] = useState(() => systemPrefersLight());
  const resolvedColorMode = useMemo(
    () => resolveWorkspaceColorMode(appearance.colorModePreference, prefersLight),
    [appearance.colorModePreference, prefersLight],
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-color-scheme: light)");
    const update = (event: MediaQueryListEvent | MediaQueryList) => setPrefersLight(event.matches);
    update(query);
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.openpressWorkspaceColorMode = resolvedColorMode;
    document.documentElement.dataset.openpressWorkspaceAccent = appearance.accent;
    return () => {
      delete document.documentElement.dataset.openpressWorkspaceColorMode;
      delete document.documentElement.dataset.openpressWorkspaceAccent;
    };
  }, [appearance.accent, resolvedColorMode]);

  const setColorModePreference = useCallback((colorModePreference: WorkspaceColorModePreference) => {
    setAppearance((current) => ({ ...current, colorModePreference }));
    persistPreference(WORKSPACE_COLOR_MODE_STORAGE_KEY, colorModePreference);
  }, []);

  const setAccent = useCallback((accent: WorkspaceAccent) => {
    setAppearance((current) => ({ ...current, accent }));
    persistPreference(WORKSPACE_ACCENT_STORAGE_KEY, accent);
  }, []);

  return {
    colorModePreference: appearance.colorModePreference,
    resolvedColorMode,
    accent: appearance.accent,
    setColorModePreference,
    setAccent,
  };
}

function isWorkspaceColorModePreference(value: string | null): value is WorkspaceColorModePreference {
  return value === "system" || value === "dark" || value === "light";
}

function isWorkspaceAccent(value: string | null): value is WorkspaceAccent {
  return value === "amber" || value === "blue" || value === "emerald" || value === "violet" || value === "rose";
}

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function persistPreference(key: string, value: string) {
  const storage = browserStorage() as StorageWriter | null;
  try {
    storage?.setItem(key, value);
  } catch {
    // Keep the in-memory preference when browser storage is unavailable.
  }
}

function systemPrefersLight() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}
