import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, Columns2, File, ZoomIn } from "lucide-react";
import {
  PAGE_VIEWPORT_SCALE_OPTIONS,
  type PageLayoutMode,
  type PageViewportScaleMode,
} from "../../reader";
import {
  ZOOM_CHEVRON_CLASS,
  ZOOM_CONTROL_CLASS,
  ZOOM_CONTROL_VALUE_CLASS,
  ZOOM_CONTROL_WRAP_CLASS,
  ZOOM_MENU_CHECK_CLASS,
  ZOOM_MENU_CLASS,
  ZOOM_MENU_DIVIDER_CLASS,
  ZOOM_MENU_ITEM_CLASS,
  ZOOM_MENU_SECTION_CLASS,
  ZOOM_MENU_SPACER_CLASS,
} from "../toolbarClasses";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/openpress/ui/dropdown-menu";
import { Button } from "@/openpress/ui/button";

const ZOOM_DROPDOWN_CONTENT_CLASS = [
  "op-ui-menu op-workspace-zoom-menu grid w-[188px] gap-1.5",
  "rounded-[10px] border border-white/15 bg-[var(--op-workspace-surface-raised)] p-2 text-[var(--op-workspace-text-soft)]",
  "shadow-[var(--op-workspace-shadow-popover)] backdrop-blur-[18px]",
].join(" ");

export function PageZoomControl({
  scaleMode,
  scaleLabel,
  pageLayoutMode,
  onScaleModeChange,
  onPageLayoutModeChange,
}: {
  scaleMode: PageViewportScaleMode;
  scaleLabel: string;
  pageLayoutMode: PageLayoutMode;
  onScaleModeChange: (mode: PageViewportScaleMode) => void;
  onPageLayoutModeChange: (mode: PageLayoutMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const fixedOptions = PAGE_VIEWPORT_SCALE_OPTIONS.filter((option) => option.value.startsWith("scale-"));
  const fitOptions = PAGE_VIEWPORT_SCALE_OPTIONS.filter((option) => option.value.startsWith("fit-"));

  const selectScale = (mode: PageViewportScaleMode) => {
    onScaleModeChange(mode);
  };
  const selectLayout = (mode: PageLayoutMode) => {
    onPageLayoutModeChange(mode);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <div className={ZOOM_CONTROL_WRAP_CLASS} data-openpress-page-zoom-control>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className={ZOOM_CONTROL_CLASS}
            data-openpress-page-zoom
            data-openpress-scale-mode={scaleMode}
            data-openpress-toolbar-active={scaleMode === "fit-width" ? "false" : "true"}
            title={`頁面縮放 ${scaleLabel}`}
            aria-label={`頁面縮放 ${scaleLabel}`}
          >
            <ZoomIn aria-hidden="true" />
            <span className={ZOOM_CONTROL_VALUE_CLASS}>{scaleLabel}</span>
            <ChevronDown className={ZOOM_CHEVRON_CLASS} aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className={ZOOM_DROPDOWN_CONTENT_CLASS}
          data-openpress-page-zoom-menu
          aria-label="頁面顯示與縮放"
          align="center"
          sideOffset={8}
        >
          <DropdownMenuGroup className={ZOOM_MENU_SECTION_CLASS} aria-label="頁面模式">
            <PageLayoutOption
              mode="single"
              active={pageLayoutMode === "single"}
              icon={<File aria-hidden="true" />}
              label="一頁"
              onSelect={selectLayout}
            />
            <PageLayoutOption
              mode="spread"
              active={pageLayoutMode === "spread"}
              icon={<Columns2 aria-hidden="true" />}
              label="雙頁"
              onSelect={selectLayout}
            />
          </DropdownMenuGroup>
          <DropdownMenuSeparator className={ZOOM_MENU_DIVIDER_CLASS} />
          <DropdownMenuRadioGroup className={ZOOM_MENU_SECTION_CLASS} value={scaleMode} aria-label="固定縮放">
            {fixedOptions.map((option) => (
              <ZoomOption
                key={option.value}
                mode={option.value}
                active={scaleMode === option.value}
                label={option.label}
                onSelect={selectScale}
              />
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator className={ZOOM_MENU_DIVIDER_CLASS} />
          <DropdownMenuRadioGroup className={ZOOM_MENU_SECTION_CLASS} value={scaleMode} aria-label="符合顯示">
            {fitOptions.map((option) => (
              <ZoomOption
                key={option.value}
                mode={option.value}
                active={scaleMode === option.value}
                label={option.label}
                onSelect={selectScale}
              />
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </div>
    </DropdownMenu>
  );
}

function PageLayoutOption({
  mode,
  active,
  icon,
  label,
  onSelect,
}: {
  mode: PageLayoutMode;
  active: boolean;
  icon: ReactNode;
  label: string;
  onSelect: (mode: PageLayoutMode) => void;
}) {
  return (
    <DropdownMenuCheckboxItem
      className={ZOOM_MENU_ITEM_CLASS}
      data-openpress-page-layout-option={mode}
      checked={active}
      onCheckedChange={() => onSelect(mode)}
    >
      <span className={ZOOM_MENU_CHECK_CLASS} aria-hidden="true" />
      {icon}
      <span>{label}</span>
    </DropdownMenuCheckboxItem>
  );
}

function ZoomOption({
  mode,
  active,
  label,
  onSelect,
}: {
  mode: PageViewportScaleMode;
  active: boolean;
  label: string;
  onSelect: (mode: PageViewportScaleMode) => void;
}) {
  return (
    <DropdownMenuRadioItem
      className={ZOOM_MENU_ITEM_CLASS}
      data-openpress-zoom-option={mode}
      value={mode}
      onSelect={() => onSelect(mode)}
    >
      <span className={ZOOM_MENU_CHECK_CLASS} aria-hidden="true" />
      <span className={ZOOM_MENU_SPACER_CLASS} aria-hidden="true" />
      <span>{label}</span>
    </DropdownMenuRadioItem>
  );
}
