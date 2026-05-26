export type PageLayoutMode = "single" | "spread";

export type PageViewportScaleMode =
  | "fit-width"
  | "fit-page"
  | "scale-25"
  | "scale-50"
  | "scale-75"
  | "scale-100"
  | "scale-125"
  | "scale-150"
  | "scale-200";

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

export function resolvePageViewportScale({
  mode,
  fitWidthScale,
  fitPageScale,
}: {
  mode: PageViewportScaleMode;
  fitWidthScale: number;
  fitPageScale: number;
}) {
  if (mode === "fit-width") return clampPageViewportScale(fitWidthScale, MAX_FIT_PAGE_VIEWPORT_SCALE);
  if (mode === "fit-page") return clampPageViewportScale(fitPageScale, MAX_FIT_PAGE_VIEWPORT_SCALE);
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
  const safeMaxScale = Number.isFinite(maxScale) && maxScale > 0 ? maxScale : MAX_FIXED_PAGE_VIEWPORT_SCALE;
  return Math.min(Math.max(value, MIN_PAGE_VIEWPORT_SCALE), safeMaxScale);
}
