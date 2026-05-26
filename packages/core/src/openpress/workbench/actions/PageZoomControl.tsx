import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Check, ChevronDown, Columns2, File, ZoomIn } from "lucide-react";
import {
  PAGE_VIEWPORT_SCALE_OPTIONS,
  type PageLayoutMode,
  type PageViewportScaleMode,
} from "../../reader";

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
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const fixedOptions = PAGE_VIEWPORT_SCALE_OPTIONS.filter((option) => option.value.startsWith("scale-"));
  const fitOptions = PAGE_VIEWPORT_SCALE_OPTIONS.filter((option) => option.value.startsWith("fit-"));

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectScale = (mode: PageViewportScaleMode) => {
    onScaleModeChange(mode);
    setOpen(false);
  };
  const selectLayout = (mode: PageLayoutMode) => {
    onPageLayoutModeChange(mode);
    setOpen(false);
  };

  return (
    <div className="openpress-workbench-zoom-control-wrap" ref={rootRef} data-openpress-page-zoom-control>
      <button
        type="button"
        className="openpress-workbench-zoom-control"
        data-openpress-page-zoom
        data-openpress-scale-mode={scaleMode}
        data-openpress-toolbar-active={scaleMode === "fit-width" ? "false" : "true"}
        title={`頁面縮放 ${scaleLabel}`}
        aria-label={`頁面縮放 ${scaleLabel}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <ZoomIn aria-hidden="true" />
        <span>{scaleLabel}</span>
        <ChevronDown className="openpress-workbench-zoom-control__chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div
          id={menuId}
          className="openpress-workbench-zoom-menu"
          data-openpress-page-zoom-menu
          role="menu"
          aria-label="頁面顯示與縮放"
        >
          <div className="openpress-workbench-zoom-menu__section" role="group" aria-label="頁面模式">
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
          </div>
          <div className="openpress-workbench-zoom-menu__divider" role="presentation" />
          <div className="openpress-workbench-zoom-menu__section" role="group" aria-label="固定縮放">
            {fixedOptions.map((option) => (
              <ZoomOption
                key={option.value}
                mode={option.value}
                active={scaleMode === option.value}
                label={option.label}
                onSelect={selectScale}
              />
            ))}
          </div>
          <div className="openpress-workbench-zoom-menu__divider" role="presentation" />
          <div className="openpress-workbench-zoom-menu__section" role="group" aria-label="符合顯示">
            {fitOptions.map((option) => (
              <ZoomOption
                key={option.value}
                mode={option.value}
                active={scaleMode === option.value}
                label={option.label}
                onSelect={selectScale}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
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
    <button
      type="button"
      className="openpress-workbench-zoom-menu__item"
      data-openpress-page-layout-option={mode}
      role="menuitemcheckbox"
      aria-checked={active}
      onClick={() => onSelect(mode)}
    >
      <span className="openpress-workbench-zoom-menu__check">{active ? <Check aria-hidden="true" /> : null}</span>
      {icon}
      <span>{label}</span>
    </button>
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
    <button
      type="button"
      className="openpress-workbench-zoom-menu__item"
      data-openpress-zoom-option={mode}
      role="menuitemradio"
      aria-checked={active}
      onClick={() => onSelect(mode)}
    >
      <span className="openpress-workbench-zoom-menu__check">{active ? <Check aria-hidden="true" /> : null}</span>
      <span className="openpress-workbench-zoom-menu__spacer" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
