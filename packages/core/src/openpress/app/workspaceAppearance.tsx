import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { isLocalWorkspaceHost } from "../shared";

export type WorkspaceColorModePreference = "system" | "dark" | "light";
export type WorkspaceColorMode = "dark" | "light";
export type WorkspaceAccent = "amber" | "blue" | "emerald" | "violet" | "rose";

export interface WorkspaceAppearance {
  colorModePreference: WorkspaceColorModePreference;
  accent: WorkspaceAccent;
}

export interface WorkspaceSettingsDocument {
  version: 1;
  appearance: {
    colorMode: WorkspaceColorModePreference;
    accent: WorkspaceAccent;
  };
  [key: string]: unknown;
}

import type { WorkspaceUpdatesInfo } from "./workspaceUpdatesModel";

export interface WorkspaceSettingsSnapshot {
  settings: WorkspaceSettingsDocument;
  appearance: WorkspaceAppearance;
  source: string;
  writable: boolean;
  updates?: WorkspaceUpdatesInfo | null;
}

interface WorkspaceAppearanceContextValue extends WorkspaceAppearance {
  resolvedColorMode: WorkspaceColorMode;
  writable: boolean;
  saving: boolean;
  error: string | null;
  updates: WorkspaceUpdatesInfo | null;
  setColorModePreference: (mode: WorkspaceColorModePreference) => void;
  setAccent: (accent: WorkspaceAccent) => void;
}

export const WORKSPACE_COLOR_MODE_OPTIONS = ["system", "dark", "light"] as const;
export const WORKSPACE_ACCENT_OPTIONS = ["amber", "blue", "emerald", "violet", "rose"] as const;

const DEFAULT_WORKSPACE_APPEARANCE: WorkspaceAppearance = {
  colorModePreference: "dark",
  accent: "amber",
};

const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettingsDocument = {
  version: 1,
  appearance: {
    colorMode: DEFAULT_WORKSPACE_APPEARANCE.colorModePreference,
    accent: DEFAULT_WORKSPACE_APPEARANCE.accent,
  },
};

const WorkspaceAppearanceContext = createContext<WorkspaceAppearanceContextValue | null>(null);

export function parseWorkspaceSettingsPayload(payload: unknown): WorkspaceSettingsSnapshot {
  const record = objectRecord(payload, "Workspace settings response");
  const wrapped = objectRecordOrNull(record.settings);
  const settings = wrapped ?? record;
  if (settings.version !== 1) {
    throw new Error("Workspace settings response must use version 1.");
  }
  const appearance = objectRecord(settings.appearance, "Workspace settings appearance");
  const colorMode = appearance.colorMode;
  const accent = appearance.accent;
  if (!isWorkspaceColorModePreference(colorMode) || !isWorkspaceAccent(accent)) {
    throw new Error("Workspace settings appearance contains an unsupported color mode or accent.");
  }
  return {
    settings: settings as WorkspaceSettingsDocument,
    appearance: {
      colorModePreference: colorMode,
      accent,
    },
    source: wrapped && typeof record.source === "string" ? record.source : "public",
    writable: Boolean(wrapped && record.writable === true),
    ...(record.updates && typeof record.updates === "object" ? { updates: record.updates as WorkspaceUpdatesInfo } : {}),
  };
}

export function updateWorkspaceSettingsAppearance(
  settings: WorkspaceSettingsDocument,
  appearance: WorkspaceAppearance,
): WorkspaceSettingsDocument {
  return {
    ...settings,
    appearance: {
      colorMode: appearance.colorModePreference,
      accent: appearance.accent,
    },
  };
}

export function resolveWorkspaceColorMode(
  preference: WorkspaceColorModePreference,
  prefersLight: boolean,
): WorkspaceColorMode {
  if (preference === "system") return prefersLight ? "light" : "dark";
  return preference;
}

export function WorkspaceAppearanceProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<WorkspaceSettingsSnapshot>({
    settings: DEFAULT_WORKSPACE_SETTINGS,
    appearance: DEFAULT_WORKSPACE_APPEARANCE,
    source: "defaults",
    writable: false,
  });
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [prefersLight, setPrefersLight] = useState(() => systemPrefersLight());
  const snapshotRef = useRef(snapshot);
  const savingRef = useRef(false);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    let cancelled = false;
    void loadWorkspaceSettingsSnapshot().then(
      (loaded) => {
        if (cancelled) return;
        setSnapshot(loaded);
        setStatus("ready");
        setError(null);
      },
      (loadError) => {
        if (cancelled) return;
        setStatus("error");
        setError(errorMessage(loadError));
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-color-scheme: light)");
    const update = (event: MediaQueryListEvent | MediaQueryList) => setPrefersLight(event.matches);
    update(query);
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  const resolvedColorMode = useMemo(
    () => resolveWorkspaceColorMode(snapshot.appearance.colorModePreference, prefersLight),
    [prefersLight, snapshot.appearance.colorModePreference],
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.openpressWorkspaceColorMode = resolvedColorMode;
    document.documentElement.dataset.openpressWorkspaceAccent = snapshot.appearance.accent;
    return () => {
      delete document.documentElement.dataset.openpressWorkspaceColorMode;
      delete document.documentElement.dataset.openpressWorkspaceAccent;
    };
  }, [resolvedColorMode, snapshot.appearance.accent]);

  const persistAppearance = useCallback(async (appearance: WorkspaceAppearance) => {
    const previous = snapshotRef.current;
    if (!previous.writable || savingRef.current) return;
    const settings = updateWorkspaceSettingsAppearance(previous.settings, appearance);
    const optimistic = { ...previous, settings, appearance };
    savingRef.current = true;
    snapshotRef.current = optimistic;
    setSnapshot(optimistic);
    setStatus("saving");
    setError(null);
    try {
      const response = await fetch("/__openpress/workspace-settings", {
        method: "PUT",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "x-openpress-local-request": "1",
        },
        body: JSON.stringify({
          appearance: {
            colorMode: appearance.colorModePreference,
            accent: appearance.accent,
          },
        }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const saved = parseWorkspaceSettingsPayload(await response.json());
      snapshotRef.current = saved;
      setSnapshot(saved);
      setStatus("ready");
    } catch (saveError) {
      snapshotRef.current = previous;
      setSnapshot(previous);
      setStatus("error");
      setError(errorMessage(saveError));
    } finally {
      savingRef.current = false;
    }
  }, []);

  const setColorModePreference = useCallback((colorModePreference: WorkspaceColorModePreference) => {
    void persistAppearance({
      ...snapshotRef.current.appearance,
      colorModePreference,
    });
  }, [persistAppearance]);

  const setAccent = useCallback((accent: WorkspaceAccent) => {
    void persistAppearance({
      ...snapshotRef.current.appearance,
      accent,
    });
  }, [persistAppearance]);

  const value = useMemo<WorkspaceAppearanceContextValue>(() => ({
    colorModePreference: snapshot.appearance.colorModePreference,
    resolvedColorMode,
    accent: snapshot.appearance.accent,
    writable: snapshot.writable,
    saving: status === "saving",
    error,
    updates: snapshot.updates ?? null,
    setColorModePreference,
    setAccent,
  }), [
    error,
    resolvedColorMode,
    setAccent,
    setColorModePreference,
    snapshot.appearance,
    snapshot.updates,
    snapshot.writable,
    status,
  ]);

  return (
    <WorkspaceAppearanceContext.Provider value={value}>
      {children}
    </WorkspaceAppearanceContext.Provider>
  );
}

export function WorkspaceAppearanceBoundary({ children }: { children: ReactNode }) {
  const appearance = useContext(WorkspaceAppearanceContext);
  if (appearance) return children;
  return <WorkspaceAppearanceProvider>{children}</WorkspaceAppearanceProvider>;
}

export function useWorkspaceAppearance() {
  const value = useContext(WorkspaceAppearanceContext);
  if (!value) {
    throw new Error("useWorkspaceAppearance must be used inside WorkspaceAppearanceProvider.");
  }
  return value;
}

async function loadWorkspaceSettingsSnapshot(): Promise<WorkspaceSettingsSnapshot> {
  const local = typeof window !== "undefined" && isLocalWorkspaceHost(window.location.hostname);
  const endpoints = local
    ? ["/__openpress/workspace-settings", "/openpress/settings.json"]
    : ["/openpress/settings.json"];
  let lastError = "Workspace settings are unavailable.";
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) {
        lastError = await responseError(response);
        continue;
      }
      return parseWorkspaceSettingsPayload(await response.json());
    } catch (loadError) {
      lastError = errorMessage(loadError);
    }
  }
  throw new Error(lastError);
}

async function responseError(response: Response) {
  try {
    const body = await response.json() as { message?: unknown };
    if (typeof body.message === "string" && body.message.trim()) return body.message;
  } catch {
    // Fall back to the HTTP status below.
  }
  return `Workspace settings request failed (${response.status}).`;
}

function objectRecord(value: unknown, label: string): Record<string, unknown> {
  const record = objectRecordOrNull(value);
  if (!record) throw new Error(`${label} must be an object.`);
  return record;
}

function objectRecordOrNull(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function isWorkspaceColorModePreference(value: unknown): value is WorkspaceColorModePreference {
  return value === "system" || value === "dark" || value === "light";
}

function isWorkspaceAccent(value: unknown): value is WorkspaceAccent {
  return value === "amber" || value === "blue" || value === "emerald" || value === "violet" || value === "rose";
}

function systemPrefersLight() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
