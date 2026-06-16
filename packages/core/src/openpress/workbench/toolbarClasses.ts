export const WORKBENCH_TOOLBAR_CLASS = [
  "op-workspace-topbar op-workspace-toolbar z-30 flex h-[var(--op-workspace-toolbar-height,44px)] min-h-0 min-w-0 items-center",
  "justify-between gap-3 border-b border-white/[0.09] bg-[var(--op-workspace-surface)] px-3",
  "[grid-area:toolbar] backdrop-blur-[18px]",
  "max-[520px]:gap-1.5 max-[520px]:px-1.5",
].join(" ");

export const TOOLBAR_CONTENT_CLASS = "op-workspace-toolbar-content flex min-w-0 flex-1 items-center justify-between gap-3 max-[520px]:gap-1";
export const TOOLBAR_GROUP_CLASS = "op-workspace-toolbar-group flex min-w-0 items-center gap-2 max-[520px]:gap-1";
export const TOOLBAR_PAGE_GROUP_CLASS = `${TOOLBAR_GROUP_CLASS} op-workspace-toolbar-group-page flex-1 justify-center`;
export const TOOLBAR_RIGHT_GROUP_CLASS = `${TOOLBAR_GROUP_CLASS} op-workspace-toolbar-group-right justify-end`;

export const TOOLBAR_PANEL_TOGGLE_CLASS = [
  "op-ui-icon-button op-workspace-toolbar-panel-toggle inline-flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center",
  "rounded-[var(--op-workspace-radius-sm)] border border-transparent bg-transparent p-0 text-[var(--op-workspace-text-muted)]",
  "transition-[color,transform] duration-150 hover:text-[var(--op-workspace-text)] active:translate-y-px [&_svg]:h-3.5 [&_svg]:w-3.5",
].join(" ");

export const TOOLBAR_ACTION_CLASS = [
  "op-ui-button op-ui-icon-button op-workspace-toolbar-action relative inline-flex h-[30px] w-[30px] min-w-[30px] max-w-[30px] cursor-pointer",
  "items-center justify-center gap-0 overflow-hidden rounded-[var(--op-workspace-radius-sm)] border border-transparent",
  "bg-transparent p-0 text-[11px] font-medium leading-none text-[var(--op-workspace-text-muted)] no-underline [font-family:inherit]",
  "whitespace-nowrap transition-[border-color,background,color,transform] duration-150",
  "[&:hover:not(:disabled)]:text-[var(--op-workspace-text)] [&:active:not(:disabled)]:translate-y-px",
  "disabled:cursor-progress disabled:text-[var(--op-workspace-text-muted)] disabled:opacity-[0.62]",
  "[&_svg]:h-[13px] [&_svg]:w-[13px] [&_svg]:shrink-0 [&_svg]:text-current",
  "[&_.openpress-dev-pdf-status]:hidden [&_.openpress-dev-pdf-status]:min-w-0 [&_.openpress-dev-pdf-status]:max-w-[150px] [&_.openpress-dev-pdf-status]:overflow-hidden [&_.openpress-dev-pdf-status]:text-ellipsis [&_.openpress-dev-pdf-status]:whitespace-nowrap [&_.openpress-dev-pdf-status]:text-[10px]",
  "[&_.openpress-dev-deploy-status]:hidden [&_.openpress-dev-deploy-status]:min-w-0 [&_.openpress-dev-deploy-status]:max-w-[150px] [&_.openpress-dev-deploy-status]:overflow-hidden [&_.openpress-dev-deploy-status]:text-ellipsis [&_.openpress-dev-deploy-status]:whitespace-nowrap [&_.openpress-dev-deploy-status]:text-[10px]",
  "[&_.openpress-dev-edit-status]:hidden [&_.openpress-dev-edit-status]:min-w-0 [&_.openpress-dev-edit-status]:max-w-[150px] [&_.openpress-dev-edit-status]:overflow-hidden [&_.openpress-dev-edit-status]:text-ellipsis [&_.openpress-dev-edit-status]:whitespace-nowrap [&_.openpress-dev-edit-status]:text-[10px]",
  "[&_.openpress-dev-inspector-status]:hidden [&_.openpress-dev-inspector-status]:min-w-0 [&_.openpress-dev-inspector-status]:max-w-[150px] [&_.openpress-dev-inspector-status]:overflow-hidden [&_.openpress-dev-inspector-status]:text-ellipsis [&_.openpress-dev-inspector-status]:whitespace-nowrap [&_.openpress-dev-inspector-status]:text-[10px]",
  "[&[data-openpress-toolbar-expanded=true]]:w-auto [&[data-openpress-toolbar-expanded=true]]:max-w-[min(34vw,300px)] [&[data-openpress-toolbar-expanded=true]]:gap-[7px] [&[data-openpress-toolbar-expanded=true]]:px-2.5",
  "max-[520px]:[&[data-openpress-toolbar-expanded=true]]:max-w-[min(34vw,132px)] max-[520px]:[&[data-openpress-toolbar-expanded=true]]:px-2",
  "[&[data-openpress-toolbar-expanded=true]_.op-workspace-toolbar-action-label]:inline-flex",
  "[&[data-openpress-toolbar-expanded=true]_.openpress-dev-pdf-status]:inline-flex [&[data-openpress-toolbar-expanded=true]_.openpress-dev-deploy-status]:inline-flex [&[data-openpress-toolbar-expanded=true]_.openpress-dev-edit-status]:inline-flex [&[data-openpress-toolbar-expanded=true]_.openpress-dev-inspector-status]:inline-flex",
  "[&[data-openpress-toolbar-active=true]]:border-[var(--op-workspace-accent-border)] [&[data-openpress-toolbar-active=true]]:bg-[var(--op-workspace-accent-surface)] [&[data-openpress-toolbar-active=true]]:text-[var(--op-workspace-accent)]",
  "[&[data-openpress-deploy-status=online]]:text-[var(--op-workspace-success)] [&[data-openpress-deploy-status=dirty]]:text-[var(--op-workspace-accent)] [&[data-openpress-deploy-status=deploying]]:text-[var(--op-workspace-accent)] [&[data-openpress-deploy-status=failed]]:text-[var(--op-workspace-danger)]",
  "[&[data-openpress-deploy-state=deploying]]:after:absolute [&[data-openpress-deploy-state=deploying]]:after:inset-[3px] [&[data-openpress-deploy-state=deploying]]:after:rounded-full [&[data-openpress-deploy-state=deploying]]:after:border [&[data-openpress-deploy-state=deploying]]:after:border-[color-mix(in_srgb,var(--op-workspace-warning)_36%,transparent)] [&[data-openpress-deploy-state=deploying]]:after:border-t-[var(--op-workspace-warning)] [&[data-openpress-deploy-state=deploying]]:after:content-[''] [&[data-openpress-deploy-state=deploying]]:after:animate-spin",
  "[&[data-openpress-deploy-state=deploying]_svg]:animate-pulse",
].join(" ");

export const TOOLBAR_ACTION_PRIMARY_CLASS = [
  TOOLBAR_ACTION_CLASS,
  "op-ui-button-primary op-workspace-toolbar-action-primary !w-auto !max-w-[min(34vw,300px)] !gap-[7px] !border-[var(--op-workspace-accent-border)] !bg-[var(--op-workspace-accent)] !px-3 !text-white",
  "shadow-[var(--op-workspace-shadow-floating)]",
  "[&_.op-workspace-toolbar-action-label]:inline-flex [&:hover:not(:disabled)]:!bg-[color-mix(in_srgb,var(--op-workspace-accent)_82%,white)] [&:hover:not(:disabled)]:!text-white",
].join(" ");

export const TOOLBAR_ACTION_LABEL_CLASS = "op-workspace-toolbar-action-label hidden min-w-0 overflow-hidden text-ellipsis whitespace-nowrap";
export const TOOLBAR_SEPARATOR_CLASS = "op-ui-divider op-workspace-toolbar-separator block h-4 w-px shrink-0 rounded-[1px] bg-white/10";

export const PAGE_VIEWPORT_PILL_CLASS = [
  "op-workspace-page-viewport-pill inline-flex h-[30px] min-w-0 items-center overflow-visible",
  "text-[var(--op-workspace-text-muted)]",
].join(" ");
export const PAGE_VIEWPORT_DIVIDER_CLASS = [
  "op-workspace-page-viewport-divider px-0.5 text-[11px] font-medium leading-none text-white/20",
].join(" ");

export const PAGE_GEOMETRY_CLASS = [
  "op-ui-button op-workspace-page-geometry inline-flex h-[28px] max-w-[min(28vw,160px)] cursor-pointer items-center",
  "justify-center gap-[7px] overflow-hidden rounded-[calc(var(--op-workspace-radius-sm)-1px)] border border-transparent",
  "bg-transparent px-2 pl-2.5 text-[var(--op-workspace-text-muted)] [font-family:inherit] leading-none whitespace-nowrap",
  "transition-[border-color,background,color,transform] duration-150 hover:text-[var(--op-workspace-text)] active:translate-y-px",
  "[&_svg]:h-[13px] [&_svg]:w-[13px] [&_svg]:shrink-0 [&_svg]:text-current",
  "max-[520px]:max-w-[min(34vw,96px)] max-[520px]:gap-[5px] max-[520px]:px-1.5",
].join(" ");
export const PAGE_GEOMETRY_LABEL_CLASS = "op-workspace-page-geometry-label min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-[560] text-[var(--op-workspace-text-soft)]";
export const PAGE_GEOMETRY_DIMENSIONS_CLASS = "op-workspace-page-geometry-dimensions min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-medium text-[var(--op-workspace-text-muted)] [font-family:var(--openpress-font-mono)] max-[520px]:hidden";

export const ZOOM_CONTROL_WRAP_CLASS = "op-workspace-zoom-control-wrap relative inline-flex";
export const ZOOM_CONTROL_CLASS = [
  "op-ui-button op-workspace-zoom-control inline-flex h-[28px] max-w-[min(20vw,82px)] cursor-pointer items-center justify-center",
  "gap-[6px] overflow-hidden rounded-[calc(var(--op-workspace-radius-sm)-1px)] border border-transparent bg-transparent px-2 pr-2.5",
  "text-[10px] font-[650] leading-none text-[var(--op-workspace-text-muted)] [font-family:var(--openpress-font-mono)] whitespace-nowrap",
  "transition-[border-color,background,color,transform] duration-150 hover:text-[var(--op-workspace-text)] active:translate-y-px",
  "[&_svg]:h-[13px] [&_svg]:w-[13px] [&_svg]:shrink-0 [&_svg]:text-current",
  "[&[aria-expanded=true]]:border-[var(--op-workspace-border-strong)] [&[aria-expanded=true]]:bg-[var(--op-workspace-surface-muted)] [&[aria-expanded=true]]:text-[var(--op-workspace-text)]",
  "[&[data-openpress-toolbar-active=true]]:border-[var(--op-workspace-border-strong)] [&[data-openpress-toolbar-active=true]]:bg-[var(--op-workspace-surface-muted)] [&[data-openpress-toolbar-active=true]]:text-[var(--op-workspace-text)]",
].join(" ");
export const ZOOM_CONTROL_VALUE_CLASS = "op-workspace-zoom-control-value text-[9px]";
export const ZOOM_CHEVRON_CLASS = "op-workspace-zoom-control-chevron !h-3 !w-3 opacity-70";
export const ZOOM_MENU_CLASS = [
  "op-ui-menu op-workspace-zoom-menu absolute left-1/2 top-[calc(100%+8px)] z-[80] grid w-[188px] -translate-x-1/2 gap-1.5",
  "rounded-[10px] border border-white/15 bg-[var(--op-workspace-surface-raised)] p-2 text-[var(--op-workspace-text-soft)]",
  "shadow-[var(--op-workspace-shadow-popover)] backdrop-blur-[18px]",
].join(" ");
export const ZOOM_MENU_SECTION_CLASS = "op-workspace-zoom-menu-section grid gap-0.5";
export const ZOOM_MENU_DIVIDER_CLASS = "op-ui-divider op-workspace-zoom-menu-divider mx-1.5 my-1 h-px bg-white/15";
export const ZOOM_MENU_ITEM_CLASS = [
  "op-ui-menu-item op-workspace-zoom-menu-item grid min-h-[30px] cursor-pointer grid-cols-[18px_18px_minmax(0,1fr)] items-center",
  "gap-[9px] rounded-[var(--op-workspace-radius-md)] border-0 bg-transparent px-2 text-left text-xs font-[650]",
  "leading-none text-inherit [font-family:inherit] hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-0",
  "[&[aria-checked=true]]:text-white [&_svg]:h-[15px] [&_svg]:w-[15px]",
].join(" ");
export const ZOOM_MENU_CHECK_CLASS = "op-workspace-zoom-menu-check grid h-[18px] w-[18px] place-items-center";
export const ZOOM_MENU_SPACER_CLASS = "op-workspace-zoom-menu-spacer h-px w-[18px]";

export const EDIT_STATUS_TOOLBAR_CLASS = [
  "openpress-dev-edit-status openpress-dev-edit-status--toolbar inline-flex min-h-6 max-w-[132px] items-center gap-1.5",
  "overflow-hidden text-ellipsis whitespace-nowrap rounded-[var(--op-workspace-radius-sm)] border border-[color-mix(in_srgb,var(--op-workspace-accent)_18%,transparent)]",
  "bg-[var(--op-workspace-accent-surface)] px-2 text-[10px] leading-none text-[var(--op-workspace-accent)]",
  "[&[data-openpress-edit-status=failed]]:text-[var(--op-workspace-danger)]",
].join(" ");
export const EDIT_STATUS_SPINNER_CLASS = "openpress-dev-edit-status__spinner h-[9px] w-[9px] shrink-0 animate-spin rounded-full border border-[color-mix(in_srgb,var(--op-workspace-warning)_32%,transparent)] border-t-[var(--op-workspace-warning)]";
export const INSPECTOR_STATUS_TOOLBAR_CLASS = [
  "openpress-dev-inspector-status block max-w-[180px] shrink overflow-hidden text-ellipsis whitespace-nowrap text-[10px]",
  "text-[var(--op-workspace-text-muted)] opacity-75",
  "[&[data-openpress-inspector-comment-status=failed]]:text-[var(--op-workspace-danger)]",
  "[&[data-openpress-inspector-comment-status=saved]]:text-[var(--op-workspace-success)]",
].join(" ");
export const DEPLOY_STATUS_TOOLBAR_CLASS = [
  "openpress-dev-deploy-status openpress-dev-deploy-status--toolbar inline-flex max-w-[86px] items-center gap-1.5 overflow-hidden",
  "text-ellipsis whitespace-nowrap text-[10px] font-medium leading-[1.3] tracking-[0.08em] text-[var(--op-workspace-text-muted)]",
  "[&[data-openpress-deploy-status=online]]:text-[var(--op-workspace-success)]",
  "[&[data-openpress-deploy-status=deploying]]:text-[var(--op-workspace-accent)]",
  "[&[data-openpress-deploy-status=dirty]]:text-[var(--op-workspace-accent)]",
  "[&[data-openpress-deploy-status=failed]]:text-[var(--op-workspace-danger)]",
].join(" ");
export const TOOLBAR_DEPLOY_STATUS_DOT_CLASS = [
  "openpress-dev-deploy-status__dot inline-block h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--op-workspace-text-muted)]",
  "shadow-[0_0_0_1px_rgb(255_255_255_/_12%)]",
  "[.openpress-dev-deploy-status[data-openpress-deploy-status=online]_&]:bg-[var(--op-workspace-success)]",
  "[.openpress-dev-deploy-status[data-openpress-deploy-status=online]_&]:shadow-[0_0_0_1px_color-mix(in_srgb,var(--op-workspace-success)_28%,transparent),0_0_14px_color-mix(in_srgb,var(--op-workspace-success)_18%,transparent)]",
  "[.openpress-dev-deploy-status[data-openpress-deploy-status=deploying]_&]:bg-[var(--op-workspace-warning)]",
  "[.openpress-dev-deploy-status[data-openpress-deploy-status=deploying]_&]:shadow-[0_0_0_1px_color-mix(in_srgb,var(--op-workspace-warning)_24%,transparent),0_0_14px_color-mix(in_srgb,var(--op-workspace-warning)_16%,transparent)]",
  "[.openpress-dev-deploy-status[data-openpress-deploy-status=dirty]_&]:bg-[var(--op-workspace-warning)]",
  "[.openpress-dev-deploy-status[data-openpress-deploy-status=dirty]_&]:shadow-[0_0_0_1px_color-mix(in_srgb,var(--op-workspace-warning)_24%,transparent),0_0_14px_color-mix(in_srgb,var(--op-workspace-warning)_16%,transparent)]",
  "[.openpress-dev-deploy-status[data-openpress-deploy-status=failed]_&]:bg-[var(--op-workspace-danger)]",
  "[.openpress-dev-deploy-status[data-openpress-deploy-status=failed]_&]:shadow-[0_0_0_1px_color-mix(in_srgb,var(--op-workspace-danger)_24%,transparent),0_0_14px_color-mix(in_srgb,var(--op-workspace-danger)_16%,transparent)]",
].join(" ");
