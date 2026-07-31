import { useEffect, useState } from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  MAX_FIXED_PAGE_VIEWPORT_PERCENT,
  MIN_FIXED_PAGE_VIEWPORT_PERCENT,
  PAGE_VIEWPORT_SCALE_OPTIONS,
  currentPageViewportPercent,
  pageViewportScaleModeFromPercent,
  stepPageViewportScale,
  type PageViewportScaleMode,
} from "../../reader/pageViewportScaleModel";
import { usePageZoomKeyboardShortcuts } from "../../reader/usePageZoomKeyboardShortcuts";
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
  "border-t border-[var(--op-workspace-border-muted)] px-3 py-2",
].join(" ");
const FLOATING_ZOOM_DOCK_CLASS = [
  "absolute bottom-[calc(16px+env(safe-area-inset-bottom))] right-4 z-20",
  "grid grid-cols-[32px_minmax(72px,1fr)_32px] items-center gap-1",
  "rounded-[var(--op-workspace-radius-md)] border border-[var(--op-workspace-border)]",
  "bg-[var(--op-workspace-surface-raised)] p-1 shadow-[var(--op-workspace-shadow-floating)]",
  "max-[520px]:left-1/2 max-[520px]:right-auto max-[520px]:-translate-x-1/2",
].join(" ");
const ZOOM_DOCK_ICON_BUTTON_CLASS = [
  "h-8 w-8 rounded-[var(--op-workspace-radius-sm)] p-0",
  "!bg-transparent text-[var(--op-workspace-text-muted)]",
  "hover:!bg-transparent hover:text-[var(--op-workspace-text)] active:!bg-transparent",
  "[&[aria-expanded=true]]:!bg-transparent",
].join(" ");
const ZOOM_DOCK_VALUE_CLASS = [
  "h-8 min-w-0 justify-center gap-1.5 rounded-[var(--op-workspace-radius-sm)] px-2",
  "!bg-transparent text-[13px] font-[650] text-[var(--op-workspace-text-soft)]",
  "[font-family:var(--openpress-font-mono)]",
  "hover:!bg-transparent hover:text-[var(--op-workspace-text)] active:!bg-transparent",
  "[&[aria-expanded=true]]:!bg-transparent [&[aria-expanded=true]]:!text-[var(--op-workspace-accent)]",
].join(" ");

type ZoomValueMotionDirection = "up" | "down" | "still";

interface ZoomValueMotionContext {
  direction: ZoomValueMotionDirection;
  reduceMotion: boolean;
}

function zoomValueMotionDirectionForMode(
  mode: PageViewportScaleMode,
  currentPercent: number,
): ZoomValueMotionDirection {
  if (!mode.startsWith("scale-")) return "still";
  const targetPercent = Number.parseInt(mode.slice("scale-".length), 10);
  if (targetPercent > currentPercent) return "up";
  if (targetPercent < currentPercent) return "down";
  return "still";
}

const ZOOM_VALUE_MOTION_VARIANTS = {
  enter: ({ direction, reduceMotion }: ZoomValueMotionContext) => ({
    opacity: reduceMotion ? 1 : 0,
    y: reduceMotion ? 0 : direction === "up" ? 8 : direction === "down" ? -8 : 0,
  }),
  center: { opacity: 1, y: 0 },
  exit: ({ direction, reduceMotion }: ZoomValueMotionContext) => ({
    opacity: reduceMotion ? 1 : 0,
    y: reduceMotion ? 0 : direction === "up" ? -8 : direction === "down" ? 8 : 0,
  }),
};

function AnimatedZoomValue({
  direction,
  label,
  reduceMotion,
}: {
  direction: ZoomValueMotionDirection;
  label: string;
  reduceMotion: boolean;
}) {
  const [entryDirection] = useState(direction);

  return (
    <motion.span
      className="col-start-1 row-start-1 inline-block"
      custom={{ direction: entryDirection, reduceMotion }}
      variants={ZOOM_VALUE_MOTION_VARIANTS}
      initial="enter"
      animate="center"
      exit="exit"
      transition={reduceMotion
        ? { duration: 0 }
        : { duration: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
      data-openpress-zoom-value-text
      data-openpress-zoom-motion={entryDirection}
    >
      {label}
    </motion.span>
  );
}
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
  const percent = currentPageViewportPercent(scaleMode, scale);
  const [customValue, setCustomValue] = useState(String(percent));
  const [motionDirection, setMotionDirection] = useState<ZoomValueMotionDirection>("still");
  const [motionRevision, setMotionRevision] = useState(0);
  const reduceMotion = useReducedMotion() === true;

  useEffect(() => {
    if (!open) setCustomValue(String(percent));
  }, [open, percent]);

  const beginValueMotion = (direction: ZoomValueMotionDirection) => {
    setMotionDirection(direction);
    setMotionRevision((revision) => revision + 1);
  };

  usePageZoomKeyboardShortcuts({
    onStep: (deltaPercent) => {
      beginValueMotion(deltaPercent > 0 ? "up" : "down");
      onScaleModeChange(stepPageViewportScale(scaleMode, scale, deltaPercent));
    },
  });

  const applyCustom = () => {
    const normalized = customValue.trim();
    if (!/^\d+$/.test(normalized)) {
      setCustomValue(String(percent));
      return;
    }
    const mode = pageViewportScaleModeFromPercent(Number.parseInt(normalized, 10));
    beginValueMotion(zoomValueMotionDirectionForMode(mode, percent));
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
        onClick={() => {
          beginValueMotion("down");
          onScaleModeChange(stepPageViewportScale(scaleMode, scale, -10));
        }}
      >
        <Minus className="size-[18px]" aria-hidden="true" />
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
            <span
              className="relative inline-grid min-w-0 overflow-hidden leading-none"
              aria-hidden="true"
            >
              <AnimatePresence
                initial={false}
                mode="popLayout"
                custom={{ direction: motionDirection, reduceMotion }}
              >
                <AnimatedZoomValue
                  key={`${scaleMode}:${scaleLabel}:${motionRevision}`}
                  direction={motionDirection}
                  label={scaleLabel}
                  reduceMotion={reduceMotion}
                />
              </AnimatePresence>
            </span>
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
                onSelect={() => {
                  beginValueMotion(zoomValueMotionDirectionForMode(option.value, percent));
                  onScaleModeChange(option.value);
                }}
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
        onClick={() => {
          beginValueMotion("up");
          onScaleModeChange(stepPageViewportScale(scaleMode, scale, 10));
        }}
      >
        <Plus className="size-[18px]" aria-hidden="true" />
      </Button>
    </div>
  );
}
