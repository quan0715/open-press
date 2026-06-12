export const PUBLIC_IDENTITY_CLASS = [
  "openpress-public-identity grid gap-2 px-[22px] pb-4 pt-[22px]",
  "[&>span]:text-[9px] [&>span]:font-medium [&>span]:uppercase [&>span]:leading-none [&>span]:tracking-[0.1em]",
  "[&>span]:text-[rgb(160_166_173_/_0.42)]",
].join(" ");

export const PUBLIC_IDENTITY_TITLE_CLASS = [
  "grid max-w-none gap-1 overflow-visible text-balance break-keep text-[rgb(242_242_240_/_0.92)]",
].join(" ");

export const PUBLIC_TITLE_MAIN_CLASS = [
  "openpress-public-title-main text-[28px] font-medium leading-[1.05] text-[rgb(242_242_240_/_0.94)]",
  "[font-family:var(--openpress-font-serif)]",
].join(" ");

export const PUBLIC_TITLE_SUB_CLASS = [
  "openpress-public-title-sub max-w-[min(18rem,100%)] overflow-hidden text-ellipsis whitespace-nowrap",
  "text-[13px] font-medium leading-[1.42] text-[rgb(214_218_222_/_0.78)]",
].join(" ");

export const PUBLIC_READER_STAGE_CLASS = [
  "reader-stage relative flex h-full min-h-0 w-full items-start justify-center overflow-auto bg-transparent outline-none",
  "[grid-area:main] [container-type:inline-size] focus:outline-none",
  "overscroll-contain scroll-smooth [-webkit-overflow-scrolling:touch] [touch-action:pan-y_pinch-zoom]",
  "[scrollbar-width:thin] [scrollbar-color:rgb(255_255_255_/_0.18)_transparent]",
  "[&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent",
  "[&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-[rgb(255_255_255_/_0.15)] [&::-webkit-scrollbar-thumb]:bg-clip-padding",
  "[&::-webkit-scrollbar-thumb:hover]:bg-[rgb(255_255_255_/_0.28)] [&::-webkit-scrollbar-corner]:bg-transparent",
].join(" ");

export const PUBLIC_READER_PAGES_CLASS = [
  "reader-pages openpress-public-page !grid !items-start !justify-center !gap-[var(--openpress-page-gap)] !px-4 !pb-14 !pt-[30px]",
  "[--openpress-page-viewport-scale:1] [--openpress-page-gap:8px]",
  "[grid-template-columns:calc(var(--openpress-page-width)*var(--openpress-page-viewport-scale,1))]",
  "[&[data-openpress-page-layout=spread]]:[grid-template-columns:repeat(2,calc(var(--openpress-page-width)*var(--openpress-page-viewport-scale,1)))]",
  "max-[520px]:!px-3",
].join(" ");

export const PUBLIC_HTML_PAGE_CLASS = [
  "openpress-html-page m-0 max-w-none flex-none snap-start snap-always scroll-mt-[72px]",
  "[width:calc(var(--openpress-page-width)*var(--openpress-page-viewport-scale,1))]",
  "[height:calc(var(--openpress-page-height)*var(--openpress-page-viewport-scale,1))]",
].join(" ");

export const PUBLIC_HTML_PAGE_HTML_CLASS = [
  "openpress-html-page__html block max-w-none origin-top-left",
  "w-[var(--openpress-page-width)] h-[var(--openpress-page-height)] min-h-[var(--openpress-page-height)]",
  "[transform:scale(var(--openpress-page-viewport-scale,1))]",
  "[&_.reader-page]:!block [&_.reader-page]:!m-0 [&_.reader-page]:!max-w-none [&_.reader-page]:!max-h-none [&_.reader-page]:!overflow-hidden",
  "[&_.reader-page]:!w-[var(--openpress-page-width)] [&_.reader-page]:!h-[var(--openpress-page-height)] [&_.reader-page]:!min-h-[var(--openpress-page-height)]",
  "[&_.reader-page]:aspect-[var(--openpress-page-aspect-ratio,210/297)]",
  "[&_.reader-page]:shadow-[0_16px_48px_rgb(0_0_0_/_0.24)] [&_.reader-page]:scroll-mt-8",
  "[&_.reader-page--cover]:!flex [&_.reader-page--back-cover]:!flex",
  "[.openpress-reader-app[data-openpress-inspector-mode=on]_&]:select-none",
  "[.openpress-reader-app[data-openpress-inspector-mode=on]_&]:[-webkit-user-select:none]",
  "[.openpress-reader-app[data-openpress-inspector-mode=on]_&_[data-openpress-block-id]]:cursor-crosshair",
  "[.openpress-reader-app[data-openpress-inspector-mode=on]_&_[data-openpress-block-id]:hover]:cursor-crosshair",
  "[.openpress-reader-app[data-openpress-inspector-mode=on]_&_[data-openpress-inspector-selected=true]]:cursor-crosshair",
  "[.openpress-reader-app[data-openpress-edit-mode=on]_&_[data-openpress-editable-block=true]]:cursor-text",
  "[.openpress-reader-app[data-openpress-edit-mode=on]_&_[data-openpress-editable-block=true]]:[caret-color:var(--openpress-accent,#df4b21)]",
  "[.openpress-reader-app[data-openpress-edit-mode=on]_&_[data-openpress-editable-block=true]]:[overflow-wrap:normal]",
  "[.openpress-reader-app[data-openpress-edit-mode=on]_&_[data-openpress-editable-block=true]]:[word-break:normal]",
  "[.openpress-reader-app[data-openpress-edit-mode=on]_&_[data-openpress-editable-block=true]:hover]:cursor-text",
  "[.openpress-reader-app[data-openpress-edit-mode=on]_&_[data-openpress-editable-block=true][data-openpress-editing=true]]:cursor-text",
  "[.openpress-reader-app[data-openpress-edit-mode=on]_&_[data-openpress-editable-block=true]:focus]:cursor-text",
  "[.openpress-reader-app[data-openpress-edit-mode=on]_&_[data-openpress-editable-block=true][data-openpress-edit-state=saving]]:pointer-events-none",
  "[.openpress-reader-app[data-openpress-edit-mode=on]_&_[data-openpress-editable-block=true][data-openpress-edit-state=saving]]:select-none",
  "[.openpress-reader-app[data-openpress-edit-mode=on]_&_[data-openpress-editable-block=true][data-openpress-edit-state=saved]]:cursor-text",
  "[.openpress-reader-app[data-openpress-edit-mode=on]_&_[data-openpress-editable-block=true][data-openpress-edit-state=failed]]:cursor-text",
  "[.openpress-reader-app[data-openpress-edit-mode=on]_&_[data-openpress-source-editable-block=true]]:cursor-pointer",
  "[.openpress-reader-app[data-openpress-edit-mode=on]_&_[data-openpress-source-editable-block=true]:hover]:cursor-pointer",
  "[.openpress-reader-app[data-openpress-edit-mode=on]_&_[data-openpress-source-editable-block=true]:focus]:cursor-pointer",
].join(" ");
