export const WORKBENCH_TOOLBAR_CLASS = [
  "openpress-workbench-toolbar z-30 flex h-[var(--openpress-workbench-toolbar-height,44px)] min-h-0 min-w-0 items-center",
  "justify-between gap-3 border-b border-white/[0.09] bg-[rgb(18_18_18_/_0.96)] px-3",
  "[grid-area:toolbar] backdrop-blur-[var(--openpress-workbench-glass-blur)]",
  "max-[520px]:gap-1.5 max-[520px]:px-1.5",
].join(" ");

export const TOOLBAR_CONTENT_CLASS = "openpress-workbench-toolbar__content flex min-w-0 flex-1 items-center justify-between gap-3 max-[520px]:gap-1";
export const TOOLBAR_GROUP_CLASS = "openpress-workbench-toolbar__group flex min-w-0 items-center gap-2 max-[520px]:gap-1";
export const TOOLBAR_PAGE_GROUP_CLASS = `${TOOLBAR_GROUP_CLASS} openpress-workbench-toolbar__group--page flex-1 justify-center`;
export const TOOLBAR_RIGHT_GROUP_CLASS = `${TOOLBAR_GROUP_CLASS} openpress-workbench-toolbar__group--right justify-end`;

export const TOOLBAR_PANEL_TOGGLE_CLASS = [
  "openpress-workbench-toolbar-panel-toggle inline-flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center",
  "rounded-[var(--openpress-workbench-radius-sm)] border border-transparent bg-transparent p-0 text-[#8e949b]",
  "transition-[color,transform] duration-150 hover:text-[#f2f2f0] active:translate-y-px [&_svg]:h-3.5 [&_svg]:w-3.5",
].join(" ");

export const TOOLBAR_ACTION_CLASS = [
  "openpress-workbench-toolbar-action relative inline-flex h-[30px] w-[30px] min-w-[30px] max-w-[30px] cursor-pointer",
  "items-center justify-center gap-0 overflow-hidden rounded-[var(--openpress-workbench-radius-sm)] border border-transparent",
  "bg-transparent p-0 text-[11px] font-medium leading-none text-[#aeb3b8] no-underline [font:inherit]",
  "whitespace-nowrap transition-[border-color,background,color,transform] duration-150",
  "[&:hover:not(:disabled)]:text-[#f2f2f0] [&:active:not(:disabled)]:translate-y-px",
  "disabled:cursor-progress disabled:text-[#a7adb2] disabled:opacity-[0.62]",
  "[&_svg]:h-[13px] [&_svg]:w-[13px] [&_svg]:shrink-0 [&_svg]:text-current",
  "[&_.openpress-dev-pdf-status]:hidden [&_.openpress-dev-pdf-status]:min-w-0 [&_.openpress-dev-pdf-status]:max-w-[150px] [&_.openpress-dev-pdf-status]:overflow-hidden [&_.openpress-dev-pdf-status]:text-ellipsis [&_.openpress-dev-pdf-status]:whitespace-nowrap [&_.openpress-dev-pdf-status]:text-[10px]",
  "[&_.openpress-dev-deploy-status]:hidden [&_.openpress-dev-deploy-status]:min-w-0 [&_.openpress-dev-deploy-status]:max-w-[150px] [&_.openpress-dev-deploy-status]:overflow-hidden [&_.openpress-dev-deploy-status]:text-ellipsis [&_.openpress-dev-deploy-status]:whitespace-nowrap [&_.openpress-dev-deploy-status]:text-[10px]",
  "[&_.openpress-dev-edit-status]:hidden [&_.openpress-dev-edit-status]:min-w-0 [&_.openpress-dev-edit-status]:max-w-[150px] [&_.openpress-dev-edit-status]:overflow-hidden [&_.openpress-dev-edit-status]:text-ellipsis [&_.openpress-dev-edit-status]:whitespace-nowrap [&_.openpress-dev-edit-status]:text-[10px]",
  "[&_.openpress-dev-inspector-status]:hidden [&_.openpress-dev-inspector-status]:min-w-0 [&_.openpress-dev-inspector-status]:max-w-[150px] [&_.openpress-dev-inspector-status]:overflow-hidden [&_.openpress-dev-inspector-status]:text-ellipsis [&_.openpress-dev-inspector-status]:whitespace-nowrap [&_.openpress-dev-inspector-status]:text-[10px]",
  "[&[data-openpress-toolbar-expanded=true]]:w-auto [&[data-openpress-toolbar-expanded=true]]:max-w-[min(34vw,300px)] [&[data-openpress-toolbar-expanded=true]]:gap-[7px] [&[data-openpress-toolbar-expanded=true]]:px-2.5",
  "max-[520px]:[&[data-openpress-toolbar-expanded=true]]:max-w-[min(34vw,132px)] max-[520px]:[&[data-openpress-toolbar-expanded=true]]:px-2",
  "[&[data-openpress-toolbar-expanded=true]_.openpress-workbench-toolbar-action__label]:inline-flex",
  "[&[data-openpress-toolbar-expanded=true]_.openpress-dev-pdf-status]:inline-flex [&[data-openpress-toolbar-expanded=true]_.openpress-dev-deploy-status]:inline-flex [&[data-openpress-toolbar-expanded=true]_.openpress-dev-edit-status]:inline-flex [&[data-openpress-toolbar-expanded=true]_.openpress-dev-inspector-status]:inline-flex",
  "[&[data-openpress-toolbar-active=true]]:border-[rgb(240_182_76_/_0.34)] [&[data-openpress-toolbar-active=true]]:bg-[rgb(240_182_76_/_0.08)] [&[data-openpress-toolbar-active=true]]:text-[var(--openpress-workbench-accent)]",
  "[&[data-openpress-deploy-status=online]]:text-[rgb(110_231_160_/_0.88)] [&[data-openpress-deploy-status=dirty]]:text-[var(--openpress-workbench-accent)] [&[data-openpress-deploy-status=deploying]]:text-[var(--openpress-workbench-accent)] [&[data-openpress-deploy-status=failed]]:text-[var(--openpress-workbench-danger)]",
  "[&[data-openpress-deploy-state=deploying]]:after:absolute [&[data-openpress-deploy-state=deploying]]:after:inset-[3px] [&[data-openpress-deploy-state=deploying]]:after:rounded-full [&[data-openpress-deploy-state=deploying]]:after:border [&[data-openpress-deploy-state=deploying]]:after:border-[rgb(240_182_76_/_0.36)] [&[data-openpress-deploy-state=deploying]]:after:border-t-[rgb(240_182_76_/_0.96)] [&[data-openpress-deploy-state=deploying]]:after:content-[''] [&[data-openpress-deploy-state=deploying]]:after:animate-spin",
  "[&[data-openpress-deploy-state=deploying]_svg]:animate-pulse",
].join(" ");

export const TOOLBAR_ACTION_PRIMARY_CLASS = [
  TOOLBAR_ACTION_CLASS,
  "openpress-workbench-toolbar-action--primary w-auto max-w-[min(34vw,300px)] gap-[7px] bg-[var(--openpress-accent,#df4b21)] px-3 text-white",
  "[&_.openpress-workbench-toolbar-action__label]:inline-flex [&:hover:not(:disabled)]:bg-[color-mix(in_srgb,var(--openpress-accent,#df4b21)_82%,#fff)] [&:hover:not(:disabled)]:text-white",
].join(" ");

export const TOOLBAR_ACTION_LABEL_CLASS = "openpress-workbench-toolbar-action__label hidden min-w-0 overflow-hidden text-ellipsis whitespace-nowrap";
export const TOOLBAR_SEPARATOR_CLASS = "openpress-workbench-toolbar__sep block h-4 w-px shrink-0 rounded-[1px] bg-white/10";

export const PAGE_VIEWPORT_PILL_CLASS = [
  "openpress-workbench-page-viewport-pill inline-flex h-[30px] min-w-0 items-center overflow-visible",
  "text-[#aeb3b8]",
].join(" ");
export const PAGE_VIEWPORT_DIVIDER_CLASS = [
  "openpress-workbench-page-viewport-pill__divider px-0.5 text-[11px] font-medium leading-none text-white/20",
].join(" ");

export const PAGE_GEOMETRY_CLASS = [
  "openpress-workbench-page-geometry inline-flex h-[28px] max-w-[min(28vw,160px)] cursor-pointer items-center",
  "justify-center gap-[7px] overflow-hidden rounded-[calc(var(--openpress-workbench-radius-sm)-1px)] border border-transparent",
  "bg-transparent px-2 pl-2.5 text-[#aeb3b8] [font:inherit] leading-none whitespace-nowrap",
  "transition-[border-color,background,color,transform] duration-150 hover:text-[#f2f2f0] active:translate-y-px",
  "[&_svg]:h-[13px] [&_svg]:w-[13px] [&_svg]:shrink-0 [&_svg]:text-current",
  "max-[520px]:max-w-[min(34vw,96px)] max-[520px]:gap-[5px] max-[520px]:px-1.5",
].join(" ");
export const PAGE_GEOMETRY_LABEL_CLASS = "openpress-workbench-page-geometry__label min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-[560] text-[#d8dadd]";
export const PAGE_GEOMETRY_DIMENSIONS_CLASS = "openpress-workbench-page-geometry__dimensions min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-medium text-[#7f858c] [font-family:var(--openpress-font-mono)] max-[520px]:hidden";

export const ZOOM_CONTROL_WRAP_CLASS = "openpress-workbench-zoom-control-wrap relative inline-flex";
export const ZOOM_CONTROL_CLASS = [
  "openpress-workbench-zoom-control inline-flex h-[28px] max-w-[min(20vw,82px)] cursor-pointer items-center justify-center",
  "gap-[6px] overflow-hidden rounded-[calc(var(--openpress-workbench-radius-sm)-1px)] border border-transparent bg-transparent px-2 pr-2.5",
  "text-[10px] font-[650] leading-none text-[#9fa5ab] [font:inherit] [font-family:var(--openpress-font-mono)] whitespace-nowrap",
  "transition-[border-color,background,color,transform] duration-150 hover:text-[#f2f2f0] active:translate-y-px",
  "[&_svg]:h-[13px] [&_svg]:w-[13px] [&_svg]:shrink-0 [&_svg]:text-current",
  "[&[aria-expanded=true]]:border-[rgb(242_242_240_/_0.16)] [&[aria-expanded=true]]:bg-[rgb(242_242_240_/_0.07)] [&[aria-expanded=true]]:text-[#f2f2f0]",
  "[&[data-openpress-toolbar-active=true]]:border-[rgb(242_242_240_/_0.16)] [&[data-openpress-toolbar-active=true]]:bg-[rgb(242_242_240_/_0.07)] [&[data-openpress-toolbar-active=true]]:text-[#f2f2f0]",
].join(" ");
export const ZOOM_CONTROL_VALUE_CLASS = "openpress-workbench-zoom-control__value text-[9px]";
export const ZOOM_CHEVRON_CLASS = "openpress-workbench-zoom-control__chevron !h-3 !w-3 opacity-70";
export const ZOOM_MENU_CLASS = [
  "openpress-workbench-zoom-menu absolute left-1/2 top-[calc(100%+8px)] z-[80] grid w-[188px] -translate-x-1/2 gap-1.5",
  "rounded-[10px] border border-white/15 bg-[rgb(46_47_46_/_0.96)] p-2 text-[rgb(245_245_242_/_0.88)]",
  "shadow-[0_18px_42px_rgb(0_0_0_/_0.34)] backdrop-blur-[var(--openpress-workbench-glass-blur)]",
].join(" ");
export const ZOOM_MENU_SECTION_CLASS = "openpress-workbench-zoom-menu__section grid gap-0.5";
export const ZOOM_MENU_DIVIDER_CLASS = "openpress-workbench-zoom-menu__divider mx-1.5 my-1 h-px bg-white/15";
export const ZOOM_MENU_ITEM_CLASS = [
  "openpress-workbench-zoom-menu__item grid min-h-[30px] cursor-pointer grid-cols-[18px_18px_minmax(0,1fr)] items-center",
  "gap-[9px] rounded-[var(--openpress-workbench-radius-md)] border-0 bg-transparent px-2 text-left text-xs font-[650]",
  "leading-none text-inherit [font:inherit] hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-0",
  "[&[aria-checked=true]]:text-white [&_svg]:h-[15px] [&_svg]:w-[15px]",
].join(" ");
export const ZOOM_MENU_CHECK_CLASS = "openpress-workbench-zoom-menu__check grid h-[18px] w-[18px] place-items-center";
export const ZOOM_MENU_SPACER_CLASS = "openpress-workbench-zoom-menu__spacer h-px w-[18px]";

export const EDIT_STATUS_TOOLBAR_CLASS = [
  "openpress-dev-edit-status openpress-dev-edit-status--toolbar inline-flex min-h-6 max-w-[132px] items-center gap-1.5",
  "overflow-hidden text-ellipsis whitespace-nowrap rounded-[var(--openpress-workbench-radius-sm)] border border-[rgb(240_182_76_/_0.18)]",
  "bg-[rgb(240_182_76_/_0.07)] px-2 text-[10px] leading-none text-[rgb(240_182_76_/_0.88)]",
  "[&[data-openpress-edit-status=failed]]:text-[rgb(248_113_113_/_0.92)]",
].join(" ");
export const EDIT_STATUS_SPINNER_CLASS = "openpress-dev-edit-status__spinner h-[9px] w-[9px] shrink-0 animate-spin rounded-full border border-[rgb(240_182_76_/_0.32)] border-t-[rgb(240_182_76_/_0.96)]";
export const INSPECTOR_STATUS_TOOLBAR_CLASS = [
  "openpress-dev-inspector-status block max-w-[180px] shrink overflow-hidden text-ellipsis whitespace-nowrap text-[10px]",
  "text-[rgb(198_204_210_/_0.7)] opacity-75",
  "[&[data-openpress-inspector-comment-status=failed]]:text-[rgb(248_113_113_/_0.92)]",
  "[&[data-openpress-inspector-comment-status=saved]]:text-[rgb(134_239_172_/_0.88)]",
].join(" ");
export const DEPLOY_STATUS_TOOLBAR_CLASS = [
  "openpress-dev-deploy-status openpress-dev-deploy-status--toolbar inline-flex max-w-[86px] items-center gap-1.5 overflow-hidden",
  "text-ellipsis whitespace-nowrap text-[10px] font-medium leading-[1.3] tracking-[0.08em] text-[rgb(150_156_163_/_0.68)]",
  "[&[data-openpress-deploy-status=online]]:text-[rgb(110_231_160_/_0.86)]",
  "[&[data-openpress-deploy-status=deploying]]:text-[rgb(240_182_76_/_0.88)]",
  "[&[data-openpress-deploy-status=dirty]]:text-[rgb(240_182_76_/_0.9)]",
  "[&[data-openpress-deploy-status=failed]]:text-[rgb(248_113_113_/_0.88)]",
].join(" ");
export const TOOLBAR_DEPLOY_STATUS_DOT_CLASS = [
  "openpress-dev-deploy-status__dot inline-block h-[7px] w-[7px] shrink-0 rounded-full bg-[rgb(150_156_163_/_0.62)]",
  "shadow-[0_0_0_1px_rgb(255_255_255_/_0.12)]",
  "[.openpress-dev-deploy-status[data-openpress-deploy-status=online]_&]:bg-[#6ee7a0]",
  "[.openpress-dev-deploy-status[data-openpress-deploy-status=online]_&]:shadow-[0_0_0_1px_rgb(110_231_160_/_0.28),0_0_14px_rgb(110_231_160_/_0.18)]",
  "[.openpress-dev-deploy-status[data-openpress-deploy-status=deploying]_&]:bg-[#f0b64c]",
  "[.openpress-dev-deploy-status[data-openpress-deploy-status=deploying]_&]:shadow-[0_0_0_1px_rgb(240_182_76_/_0.24),0_0_14px_rgb(240_182_76_/_0.16)]",
  "[.openpress-dev-deploy-status[data-openpress-deploy-status=dirty]_&]:bg-[#f0b64c]",
  "[.openpress-dev-deploy-status[data-openpress-deploy-status=dirty]_&]:shadow-[0_0_0_1px_rgb(240_182_76_/_0.24),0_0_14px_rgb(240_182_76_/_0.16)]",
  "[.openpress-dev-deploy-status[data-openpress-deploy-status=failed]_&]:bg-[#f87171]",
  "[.openpress-dev-deploy-status[data-openpress-deploy-status=failed]_&]:shadow-[0_0_0_1px_rgb(248_113_113_/_0.24),0_0_14px_rgb(248_113_113_/_0.16)]",
].join(" ");
