import { type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { cn } from "../core/cn";
import type { BookmarkItem } from "../document-model";
import { Panel } from "../shared";

export const BOOKMARKS_SECTION_CLASS = [
  "openpress-panel-section openpress-panel-section--bookmarks",
  "grid min-h-0 grid-rows-[minmax(0,1fr)] overflow-hidden pt-0",
].join(" ");
export const BOOKMARKS_NAV_CLASS = [
  "reader-bookmarks h-full min-h-0 overflow-auto px-[22px] pb-[22px] pt-0",
  "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
].join(" ");
export const BOOKMARKS_RAIL_CLASS = "reader-bookmarks-rail hidden";
const ASSET_EMPTY_CLASS = "openpress-asset-empty !m-0 !px-[30px] !py-0 !text-xs !leading-normal !text-[#696f75]";
const CURRENT_PAGE_SECTION_CLASS = "openpress-panel-section--current min-w-0 min-h-0 border-b-0 py-[14px] pb-5";
const CURRENT_PAGE_HEADING_CLASS = "openpress-panel-heading m-0 px-[22px] pb-2.5 text-[9px] font-medium uppercase tracking-[0.12em] text-[rgb(160_166_173_/_0.52)]";
const CURRENT_PAGE_CARD_CLASS = "openpress-current-page-card grid gap-1.5 px-[22px] py-0";
const CURRENT_PAGE_NUMBER_CLASS = [
  "openpress-current-page-card__number flex items-baseline gap-[7px] text-lg font-normal leading-none tracking-[0.05em]",
  "text-[rgb(242_242_240_/_0.84)] [font-variant-numeric:tabular-nums]",
].join(" ");
const CURRENT_PAGE_PREFIX_CLASS = "openpress-current-page-card__prefix text-[10px] font-medium tracking-[0.08em] text-[rgb(160_166_173_/_0.58)]";
const CURRENT_PAGE_SEPARATOR_CLASS = "sep text-xs leading-none text-[#5f656c]";
const CURRENT_PAGE_TOTAL_CLASS = "text-xs text-[#8c939a]";
const CURRENT_PAGE_TITLE_CLASS = "openpress-current-page-card__title overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-[1.4] text-[rgb(155_161_168_/_0.74)]";
const CURRENT_PAGE_PROGRESS_CLASS = "openpress-current-page-card__progress h-0.5 w-full overflow-hidden bg-white/[0.07]";
const CURRENT_PAGE_PROGRESS_BAR_CLASS = "block h-full w-[var(--progress,0%)] bg-[rgb(242_242_240_/_0.46)] transition-[width] duration-[260ms] ease-[cubic-bezier(0.22,0.61,0.36,1)]";
const BOOKMARK_GROUP_CLASS = "bookmark-group mb-1";
const BOOKMARK_ITEM_CLASS = [
  "bookmark-item grid w-full min-w-0 cursor-pointer items-baseline border-0 bg-transparent text-left text-[rgb(150_156_163_/_0.72)]",
  "[font-family:inherit] hover:text-[#f2f2f0]",
  "[column-gap:8px]",
].join(" ");
const BOOKMARK_ITEM_ACTIVE_CLASS = "is-active text-[rgb(242_242_240_/_0.92)]";
const BOOKMARK_INDEX_CLASS = [
  "bookmark-index block min-w-0 whitespace-nowrap text-inherit tracking-[0.04em]",
  "[font-variant-numeric:tabular-nums]",
].join(" ");
const BOOKMARK_H2_CLASS = "bookmark-h2 grid-cols-[24px_minmax(0,1fr)] py-2 pb-[7px] text-sm font-medium leading-[1.42] [font-family:var(--openpress-font-serif)]";
const BOOKMARK_H2_INDEX_CLASS = "text-xs font-medium leading-[1.35] text-[#f2f2f0]";
const BOOKMARK_H3_CLASS = "bookmark-h3 grid-cols-[24px_minmax(0,1fr)] py-1 pl-8 text-sm leading-[1.42] [font-family:var(--openpress-font-serif)]";
const BOOKMARK_H4_CLASS = "bookmark-h4 grid-cols-[36px_minmax(0,1fr)] py-[3px] pl-[52px] text-[13px] leading-[1.38] [font-family:var(--openpress-font-serif)]";
const BOOKMARK_SUBGROUP_CLASS = "bookmark-subgroup flex flex-col";
const BOOKMARK_TITLE_CLASS = [
  "bookmark-title block min-w-0 overflow-visible whitespace-normal tracking-normal [font-family:var(--openpress-font-serif)]",
  "[line-break:loose] [overflow-wrap:normal] [word-break:keep-all] [-webkit-line-clamp:unset]",
].join(" ");
const BOOKMARK_TITLE_TWO_LINE_CLASS = "";
const BOOKMARK_TITLE_ONE_LINE_CLASS = "";
const BOOKMARK_SUBS_CLASS = [
  "bookmark-subs block max-h-0 overflow-hidden pb-0 opacity-0 -translate-y-1.5 pointer-events-none",
  "transition-[max-height,opacity,padding-bottom,transform] duration-[340ms,180ms,340ms,340ms]",
  "ease-[cubic-bezier(0.22,0.61,0.36,1),ease,cubic-bezier(0.22,0.61,0.36,1),cubic-bezier(0.22,0.61,0.36,1)] will-change-[max-height,opacity,transform]",
].join(" ");
const BOOKMARK_SUBS_OPEN_CLASS = "max-h-none overflow-visible pb-2 opacity-100 translate-y-0 pointer-events-auto";

type BookmarkSelectOptions = {
  behavior?: ScrollBehavior;
};

export function Bookmarks({
  items,
  currentPageIndex,
  onSelectPage,
}: {
  items: BookmarkItem[];
  currentPageIndex: number;
  onSelectPage: (pageIndex: number, options?: BookmarkSelectOptions) => void;
}) {
  const goToPage = (event: ReactMouseEvent<HTMLButtonElement>, pageIndex: number) => {
    event.preventDefault();
    onSelectPage(pageIndex, { behavior: "smooth" });
  };

  if (items.length === 0) {
    return <Panel.Empty className={ASSET_EMPTY_CLASS} role="status">尚無書籤</Panel.Empty>;
  }

  return (
    <>
      {items.map((item, index) => {
        const groupActive = currentPageIndex >= item.pageIndex && currentPageIndex <= item.endPageIndex;
        const activeSub = item.subs.find((sub) => currentPageIndex >= sub.pageIndex && currentPageIndex <= sub.endPageIndex);
        const h2SelfActive = groupActive && !activeSub;
        const itemLabel = item.label ?? String(index + 1).padStart(2, "0");
        return (
          <div className={cn(BOOKMARK_GROUP_CLASS, groupActive ? "is-open" : undefined)} key={item.id}>
            <button
              type="button"
              className={cn(BOOKMARK_ITEM_CLASS, BOOKMARK_H2_CLASS, h2SelfActive ? BOOKMARK_ITEM_ACTIVE_CLASS : undefined)}
              data-openpress-page-index={item.pageIndex}
              onClick={(event) => goToPage(event, item.pageIndex)}
            >
              <span className={cn(BOOKMARK_INDEX_CLASS, BOOKMARK_H2_INDEX_CLASS)}>{itemLabel}</span>
              <span className={cn(BOOKMARK_TITLE_CLASS, BOOKMARK_TITLE_TWO_LINE_CLASS)}>{item.title}</span>
            </button>
            <div className={cn(BOOKMARK_SUBS_CLASS, groupActive ? BOOKMARK_SUBS_OPEN_CLASS : undefined)}>
              {item.subs.map((sub, subIndex) => {
                const subActive = currentPageIndex >= sub.pageIndex && currentPageIndex <= sub.endPageIndex;
                const activeTopic = sub.subs.find((topic) => currentPageIndex >= topic.pageIndex && currentPageIndex <= topic.endPageIndex);
                const subSelfActive = subActive && !activeTopic;
                const subLabel = sub.label ?? `${itemLabel}.${subIndex + 1}`;
                return (
                  <div className={BOOKMARK_SUBGROUP_CLASS} key={sub.id}>
                    <button
                      type="button"
                      className={cn(BOOKMARK_ITEM_CLASS, BOOKMARK_H3_CLASS, subSelfActive ? BOOKMARK_ITEM_ACTIVE_CLASS : undefined)}
                      data-openpress-page-index={sub.pageIndex}
                      onClick={(event) => goToPage(event, sub.pageIndex)}
                    >
                      <span className={BOOKMARK_INDEX_CLASS}>{subLabel}</span>
                      <span className={cn(BOOKMARK_TITLE_CLASS, BOOKMARK_TITLE_TWO_LINE_CLASS)}>{sub.title}</span>
                    </button>
                    {sub.subs.map((topic, topicIndex) => {
                      const topicActive = currentPageIndex >= topic.pageIndex && currentPageIndex <= topic.endPageIndex;
                      const topicLabel = topic.label ?? `${subLabel}.${topicIndex + 1}`;
                      return (
                        <button
                          type="button"
                          className={cn(BOOKMARK_ITEM_CLASS, BOOKMARK_H4_CLASS, topicActive ? BOOKMARK_ITEM_ACTIVE_CLASS : undefined)}
                          data-openpress-page-index={topic.pageIndex}
                          onClick={(event) => goToPage(event, topic.pageIndex)}
                          key={topic.id}
                        >
                          <span className={BOOKMARK_INDEX_CLASS}>{topicLabel}</span>
                          <span className={cn(BOOKMARK_TITLE_CLASS, BOOKMARK_TITLE_ONE_LINE_CLASS)}>{topic.title}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

export function CurrentPagePanel({
  currentPageLabel,
  totalPageLabel,
  progressPercent,
  title,
  pageLabelPrefix,
  showHeading = true,
  showTitle = true,
}: {
  currentPageLabel: string;
  totalPageLabel: string;
  progressPercent: number;
  title: string;
  pageLabelPrefix?: string;
  showHeading?: boolean;
  showTitle?: boolean;
}) {
  return (
    <Panel.Section className={CURRENT_PAGE_SECTION_CLASS} aria-label="目前頁面">
      {showHeading ? <h3 className={CURRENT_PAGE_HEADING_CLASS}>目前頁面</h3> : null}
      <div className={CURRENT_PAGE_CARD_CLASS}>
        <div className={CURRENT_PAGE_NUMBER_CLASS} aria-label="目前頁數">
          {pageLabelPrefix ? <span className={CURRENT_PAGE_PREFIX_CLASS}>{pageLabelPrefix}</span> : null}
          <span data-openpress-current-page>{currentPageLabel}</span>
          <span className={CURRENT_PAGE_SEPARATOR_CLASS}>/</span>
          <span className={CURRENT_PAGE_TOTAL_CLASS} data-openpress-total-pages>{totalPageLabel}</span>
        </div>
        {showTitle ? <div className={CURRENT_PAGE_TITLE_CLASS}>{title}</div> : null}
        <div className={CURRENT_PAGE_PROGRESS_CLASS} aria-hidden="true">
          <span className={CURRENT_PAGE_PROGRESS_BAR_CLASS} style={{ "--progress": `${progressPercent}%` } as CSSProperties} />
        </div>
      </div>
    </Panel.Section>
  );
}
