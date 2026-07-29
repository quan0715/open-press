export const MIN_LEFT_PANEL_WIDTH = 240;
export const MAX_LEFT_PANEL_WIDTH = 480;
export const WORKBENCH_LEFT_PANEL_WIDTH_STORAGE_KEY = "openpress:workspace:left-panel-width";

interface StorageReader {
  getItem(key: string): string | null;
}

export function clampLeftPanelWidth(value: number) {
  return Math.min(MAX_LEFT_PANEL_WIDTH, Math.max(MIN_LEFT_PANEL_WIDTH, value));
}

export function readLeftPanelWidth(storage: StorageReader | null | undefined): number | null {
  if (!storage) return null;
  try {
    const parsed = Number(storage.getItem(WORKBENCH_LEFT_PANEL_WIDTH_STORAGE_KEY));
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return clampLeftPanelWidth(parsed);
  } catch {
    return null;
  }
}
