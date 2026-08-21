export const SHELL_PANEL_HEADER_CLASS = [
  "flex h-11 min-w-0 shrink-0 items-center justify-between gap-3",
  "border-b border-[var(--op-workspace-border-muted)] px-4",
  "bg-[var(--op-workspace-panel-bg)] text-[var(--op-workspace-text)]",
].join(" ");

export const SHELL_PANEL_TITLE_CLASS = [
  "m-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap",
  "text-[13px] font-semibold leading-none text-[var(--op-workspace-text)]",
].join(" ");

export const SHELL_PANEL_HEADER_TRIGGER_CLASS = [
  "flex h-full min-w-0 flex-1 cursor-pointer items-center justify-between gap-2",
  "border-0 bg-transparent p-0 text-left [font-family:inherit]",
  "hover:text-[var(--op-workspace-text)] focus-visible:outline-none focus-visible:text-[var(--op-workspace-accent)]",
  "[&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
].join(" ");

export const SHELL_PANEL_ICON_ACTION_CLASS = [
  "h-7 w-7 shrink-0 rounded-[var(--op-workspace-radius-sm)] border-0 bg-transparent p-0 shadow-none",
  "text-[var(--op-workspace-text-muted)] hover:bg-[var(--op-workspace-surface-hover)] hover:text-[var(--op-workspace-text)]",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--op-workspace-accent-border)]",
  "[&_svg]:h-4 [&_svg]:w-4",
].join(" ");

export const SHELL_PANEL_BODY_PADDING_X_CLASS = "px-4";
