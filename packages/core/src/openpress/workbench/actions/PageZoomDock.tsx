import { useEffect, useState } from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import {
  MAX_FIXED_PAGE_VIEWPORT_PERCENT,
  MIN_FIXED_PAGE_VIEWPORT_PERCENT,
  PAGE_VIEWPORT_SCALE_OPTIONS,
  pageViewportScaleModeFromPercent,
  stepPageViewportScale,
  type PageViewportScaleMode,
} from "../../reader/pageViewportScaleModel";
import { Button } from "@/openpress/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/openpress/ui/dropdown-menu";

const PANEL_ZOOM_DOCK_CLASS = [
  "grid grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-1",
  "border-t border-[var(--op-workspace-border-muted)] bg-[var(--op-workspace-panel-bg)] px-3 py-2",
].join(" ");
const FLOATING_ZOOM_DOCK_CLASS = [
  "absolute bottom-[calc(16px+env(safe-area-inset-bottom))] right-4 z-20",
  "grid grid-cols-[32px_minmax(72px,1fr)_32px] items-center gap-1",
  "rounded-[var(--op-workspace-radius-md)] border border-[var(--op-workspace-border)]",
  "bg-[var(--op-workspace-surface-raised)] p-1 shadow-[var(--op-workspace-shadow-floating)]",
  "max-[520px]:left-1/2 max-[520px]:right-auto max-[520px]:-translate-x-1/2",
].join(" ");
const ZOOM_DOCK_ICON_BUTTON_CLASS = "h-8 w-8 rounded-[var(--op-workspace-radius-sm)] p-0";
const ZOOM_DOCK_VALUE_CLASS = [
  "h-8 min-w-0 justify-center gap-1.5 rounded-[var(--op-workspace-radius-sm)] px-2",
  "text-[11px] font-[650] [font-family:var(--openpress-font-mono)]",
].join(" ");
const ZOOM_DOCK_MENU_CLASS = [
  "op-ui-menu w-[220px] rounded-[10px] border border-[var(--op-workspace-border)]",
  "bg-[var(--op-workspace-surface-raised)] p-2 shadow-[var(--op-workspace-shadow-popover)]",
].join(" ");
const ZOOM_DOCK_MENU_ITEM_CLASS = "min-h-8 rounded-[var(--op-workspace-radius-sm)] px-2 text-xs";
const ZOOM_DOCK_CUSTOM_CLASS = [
  "grid grid-cols-[minmax(0,1fr)_64px_auto] items-center gap-2 px-2 py-1.5",
  "text-xs text-[var(--op-workspace-text-muted)]",
].join(" ");
const ZOOM_DOCK_CUSTOM_INPUT_CLASS = [
  "h-8 w-full rounded-[var(--op-workspace-radius-sm)] border border-[var(--op-workspace-border)]",
  "bg-[var(--op-workspace-surface)] px-2 text-right text-[var(--op-workspace-text)] outline-none",
  "focus:border-[var(--op-workspace-accent-border)]",
].join(" ");

const DOCK_ZOOM_OPTIONS: Array<{ value: PageViewportScaleMode; label: string }> = [
  { value: "fit-width", label: "符合頁面寬度" },
  { value: "fit-page", label: "符合全開頁面" },
  ...PAGE_VIEWPORT_SCALE_OPTIONS.filter((option) => option.value.startsWith("scale-")),
];

export interface PageZoomDockProps {
  scaleMode: PageViewportScaleMode;
  scale: number;
  scaleLabel: string;
  placement: "panel" | "floating";
  onScaleModeChange: (mode: PageViewportScaleMode) => void;
}

export function PageZoomDock({
  scaleMode,
  scale,
  scaleLabel,
  placement,
  onScaleModeChange,
}: PageZoomDockProps) {
  const [open, setOpen] = useState(false);
  const percent = Math.round(scale * 100);
  const [customValue, setCustomValue] = useState(String(percent));

  useEffect(() => {
    if (!open) setCustomValue(String(percent));
  }, [open, percent]);

  const applyCustom = () => {
    const normalized = customValue.trim();
    if (!/^\d+$/.test(normalized)) {
      setCustomValue(String(percent));
      return;
    }
    const mode = pageViewportScaleModeFromPercent(Number.parseInt(normalized, 10));
    onScaleModeChange(mode);
    setCustomValue(mode.slice("scale-".length));
    setOpen(false);
  };

  return (
    <div
      className={placement === "panel" ? PANEL_ZOOM_DOCK_CLASS : FLOATING_ZOOM_DOCK_CLASS}
      data-openpress-page-zoom-dock={placement}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={ZOOM_DOCK_ICON_BUTTON_CLASS}
        disabled={percent <= MIN_FIXED_PAGE_VIEWPORT_PERCENT}
        aria-label="縮小頁面 10%"
        data-openpress-zoom-decrease
        onClick={() => onScaleModeChange(stepPageViewportScale(scale, -10))}
      >
        <Minus aria-hidden="true" />
      </Button>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className={ZOOM_DOCK_VALUE_CLASS}
            data-openpress-zoom-value
            data-openpress-scale-mode={scaleMode}
            aria-label={`頁面縮放 ${scaleLabel}`}
          >
            <span>{scaleLabel}</span>
            <ChevronDown aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="center"
          sideOffset={8}
          className={ZOOM_DOCK_MENU_CLASS}
          data-openpress-zoom-menu
        >
          <DropdownMenuRadioGroup value={scaleMode}>
            {DOCK_ZOOM_OPTIONS.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className={ZOOM_DOCK_MENU_ITEM_CLASS}
                data-openpress-zoom-option={option.value}
                onSelect={() => onScaleModeChange(option.value)}
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <label className={ZOOM_DOCK_CUSTOM_CLASS} onKeyDown={(event) => event.stopPropagation()}>
            <span>自訂比例</span>
            <input
              type="number"
              min={MIN_FIXED_PAGE_VIEWPORT_PERCENT}
              max={MAX_FIXED_PAGE_VIEWPORT_PERCENT}
              step={1}
              value={customValue}
              className={ZOOM_DOCK_CUSTOM_INPUT_CLASS}
              aria-label="自訂縮放百分比"
              data-openpress-custom-zoom
              onChange={(event) => setCustomValue(event.target.value)}
              onBlur={applyCustom}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyCustom();
                }
              }}
            />
            <span aria-hidden="true">%</span>
          </label>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={ZOOM_DOCK_ICON_BUTTON_CLASS}
        disabled={percent >= MAX_FIXED_PAGE_VIEWPORT_PERCENT}
        aria-label="放大頁面 10%"
        data-openpress-zoom-increase
        onClick={() => onScaleModeChange(stepPageViewportScale(scale, 10))}
      >
        <Plus aria-hidden="true" />
      </Button>
    </div>
  );
}
