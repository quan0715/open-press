export type PageLayoutMode = "single" | "spread";

export type PageViewportScaleMode = "fit-width" | "fit-page" | `scale-${number}`;

export const MIN_FIXED_PAGE_VIEWPORT_PERCENT = 25;
export const MAX_FIXED_PAGE_VIEWPORT_PERCENT = 200;

export const PAGE_VIEWPORT_SCALE_OPTIONS: Array<{
  value: PageViewportScaleMode;
  label: string;
}> = [
  { value: "scale-25", label: "25%" },
  { value: "scale-50", label: "50%" },
  { value: "scale-75", label: "75%" },
  { value: "scale-100", label: "100%" },
  { value: "scale-125", label: "125%" },
  { value: "scale-150", label: "150%" },
  { value: "scale-200", label: "200%" },
  { value: "fit-width", label: "符合頁面寬度" },
  { value: "fit-page", label: "符合全開頁面" },
];

const MIN_PAGE_VIEWPORT_SCALE = 0.12;
const MAX_FIT_PAGE_VIEWPORT_SCALE = 1;
const MAX_FIXED_PAGE_VIEWPORT_SCALE = 2;

export function pageViewportScaleModeFromPercent(percent: number): PageViewportScaleMode {
  const rounded = Number.isFinite(percent) ? Math.round(percent) : 100;
  const clamped = Math.min(
    Math.max(rounded, MIN_FIXED_PAGE_VIEWPORT_PERCENT),
    MAX_FIXED_PAGE_VIEWPORT_PERCENT,
  );
  return `scale-${clamped}`;
}

export function parsePageViewportScaleMode(value: string): PageViewportScaleMode | null {
  if (value === "fit-width" || value === "fit-page") return value;
  const match = /^scale-(\d+)$/.exec(value);
  if (!match) return null;
  const percent = Number.parseInt(match[1] ?? "", 10);
  if (percent < MIN_FIXED_PAGE_VIEWPORT_PERCENT || percent > MAX_FIXED_PAGE_VIEWPORT_PERCENT) return null;
  return `scale-${percent}`;
}

export function stepPageViewportScale(
  scale: number,
  deltaPercent: -10 | 10,
): PageViewportScaleMode {
  return pageViewportScaleModeFromPercent(Math.round(scale * 100) + deltaPercent);
}

export function resolvePageViewportScale({
  mode,
  fitWidthScale,
  fitPageScale,
  maxFitScale = MAX_FIT_PAGE_VIEWPORT_SCALE,
}: {
  mode: PageViewportScaleMode;
  fitWidthScale: number;
  fitPageScale: number;
  maxFitScale?: number;
}) {
  if (mode === "fit-width") return clampPageViewportScale(fitWidthScale, maxFitScale);
  if (mode === "fit-page") return clampPageViewportScale(fitPageScale, maxFitScale);
  return scaleModeToFixedValue(mode);
}

export function formatPageViewportScaleLabel(mode: PageViewportScaleMode, scale: number) {
  void mode;
  return formatPageViewportScalePercent(scale);
}

export function formatPageViewportScalePercent(scale: number) {
  return `${Math.round(clampPageViewportScale(scale, MAX_FIXED_PAGE_VIEWPORT_SCALE) * 100)}%`;
}

export function formatPageViewportScaleValue(scale: number) {
  return clampPageViewportScale(scale, MAX_FIXED_PAGE_VIEWPORT_SCALE)
    .toFixed(4)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}

function scaleModeToFixedValue(mode: PageViewportScaleMode) {
  const match = /^scale-(\d+)$/.exec(mode);
  if (!match) return 1;
  return clampPageViewportScale(Number.parseInt(match[1] ?? "100", 10) / 100, MAX_FIXED_PAGE_VIEWPORT_SCALE);
}

function clampPageViewportScale(value: number, maxScale: number) {
  if (!Number.isFinite(value)) return 1;
  const safeMaxScale = maxScale > 0 ? maxScale : MAX_FIXED_PAGE_VIEWPORT_SCALE;
  return Math.min(Math.max(value, MIN_PAGE_VIEWPORT_SCALE), safeMaxScale);
}
