import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { ChevronDown } from "lucide-react";
import { Tooltip } from "radix-ui";
import { cn } from "../core/cn";
import type { BookmarkItem, CaptionDirectoryItem } from "../document-model";
import { Panel } from "../shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/openpress/ui/dropdown-menu";

export const BOOKMARKS_SECTION_CLASS = [
  "openpress-panel-section openpress-panel-section--bookmarks",
  "grid min-h-0 grid-rows-[minmax(0,1fr)] overflow-hidden pt-0",
].join(" ");
export const BOOKMARKS_NAV_CLASS = [
  "reader-bookmarks h-full min-h-0 overflow-auto px-[22px] pb-[22px] pt-3",
  "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
].join(" ");
export const BOOKMARKS_RAIL_CLASS = "reader-bookmarks-rail hidden";
const ASSET_EMPTY_CLASS = "openpress-asset-empty !m-0 !px-[30px] !py-0 !text-xs !leading-normal !text-[var(--op-workspace-text-muted)]";
const CURRENT_PAGE_SECTION_CLASS = "openpress-panel-section--current min-w-0 min-h-0 border-b-0 py-[14px] pb-5";
const CURRENT_PAGE_HEADING_CLASS = "openpress-panel-heading m-0 px-[22px] pb-2.5 text-[9px] font-medium uppercase tracking-[0.12em] text-[var(--op-workspace-text-muted)]";
const CURRENT_PAGE_CARD_CLASS = "openpress-current-page-card grid gap-1.5 px-[22px] py-0";
const CURRENT_PAGE_NUMBER_CLASS = [
  "openpress-current-page-card__number flex items-baseline gap-[7px] text-lg font-normal leading-none tracking-[0.05em]",
  "text-[var(--op-workspace-text-soft)] [font-variant-numeric:tabular-nums]",
].join(" ");
const CURRENT_PAGE_PREFIX_CLASS = "openpress-current-page-card__prefix text-[10px] font-medium tracking-[0.08em] text-[var(--op-workspace-text-muted)]";
const CURRENT_PAGE_SEPARATOR_CLASS = "sep text-xs leading-none text-[var(--op-workspace-text-muted)]";
const CURRENT_PAGE_TOTAL_CLASS = "text-xs text-[var(--op-workspace-text-muted)]";
const CURRENT_PAGE_TITLE_CLASS = "openpress-current-page-card__title overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-[1.4] text-[var(--op-workspace-text-muted)]";
const CURRENT_PAGE_PROGRESS_CLASS = "openpress-current-page-card__progress h-0.5 w-full overflow-hidden bg-[var(--op-workspace-progress-track)]";
const CURRENT_PAGE_PROGRESS_BAR_CLASS = "block h-full w-[var(--progress,0%)] bg-[var(--op-workspace-progress-bar)] transition-[width] duration-[260ms] ease-[cubic-bezier(0.22,0.61,0.36,1)]";
const BOOKMARK_GROUP_CLASS = "bookmark-group";
const BOOKMARK_ITEM_CLASS = [
  "bookmark-item grid w-full min-w-0 cursor-pointer items-baseline border-0 text-left text-[var(--op-workspace-text-muted)]",
  "[font-family:inherit] hover:text-[var(--op-workspace-text)]",
  "[column-gap:8px]",
].join(" ");
const BOOKMARK_ITEM_ACTIVE_CLASS = "is-active text-[var(--op-workspace-text)]";
const BOOKMARK_ITEM_CURRENT_CLASS = "is-active text-[var(--op-workspace-accent)]";
const BOOKMARK_INDEX_CLASS = [
  "bookmark-index block min-w-0 whitespace-nowrap text-inherit tracking-[0.04em]",
  "[font-variant-numeric:tabular-nums]",
].join(" ");
const BOOKMARK_H2_CLASS = "bookmark-h2 grid-cols-[24px_minmax(0,1fr)] py-2 pb-[7px] text-sm font-medium leading-[1.42] [font-family:var(--openpress-font-serif)]";
const BOOKMARK_H2_INDEX_CLASS = "text-xs font-medium leading-[1.35] text-[var(--op-workspace-text-soft)]";
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
  "bookmark-subs block",
  "transition-[max-height,opacity,padding-bottom,transform] duration-[340ms,180ms,340ms,340ms]",
  "ease-[cubic-bezier(0.22,0.61,0.36,1),ease,cubic-bezier(0.22,0.61,0.36,1),cubic-bezier(0.22,0.61,0.36,1)] will-change-[max-height,opacity,transform]",
].join(" ");
const BOOKMARK_SUBS_OPEN_CLASS = "is-open";
const DIRECTORY_CONTROL_CLASS = [
  "sticky top-0 z-[1] flex min-h-10 items-center border-b border-[var(--op-workspace-border-muted)]",
  "bg-[var(--op-workspace-surface)] py-1",
].join(" ");
const DIRECTORY_TRIGGER_CLASS = [
  "flex w-full cursor-pointer items-center justify-between gap-2 border-0 bg-transparent py-2 text-left",
  "text-[11px] font-[650] text-[var(--op-workspace-text-soft)] [font-family:inherit]",
  "hover:text-[var(--op-workspace-text)] focus-visible:outline-none focus-visible:text-[var(--op-workspace-accent)]",
  "[&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0",
].join(" ");
const DIRECTORY_MENU_CLASS = [
  "grid w-[168px] gap-0.5 rounded-[var(--op-workspace-radius-md)] border border-[var(--op-workspace-border)]",
  "bg-[var(--op-workspace-surface-raised)] p-1.5 text-[var(--op-workspace-text-soft)] shadow-[var(--op-workspace-shadow-popover)]",
].join(" ");
const DIRECTORY_OPTION_CLASS = [
  "min-h-8 cursor-pointer rounded-[var(--op-workspace-radius-sm)] px-2.5 text-xs [font-family:inherit]",
  "hover:bg-[var(--op-workspace-surface-hover)] focus:bg-[var(--op-workspace-surface-hover)] focus:outline-none",
  "[&_[data-slot=dropdown-menu-radio-item-indicator]]:hidden",
].join(" ");
const DIRECTORY_OPTION_ACTIVE_CLASS = "text-[var(--op-workspace-accent)]";
const CAPTION_DIRECTORY_LIST_CLASS = "flex flex-col pt-2";
const CAPTION_DIRECTORY_ITEM_CLASS = [
  BOOKMARK_ITEM_CLASS,
  "grid-cols-[40px_minmax(0,1fr)] py-2 text-[13px] leading-[1.4] [font-family:var(--openpress-font-serif)]",
].join(" ");
const CAPTION_DIRECTORY_LABEL_CLASS = "text-[11px] font-medium leading-[1.4] text-[var(--op-workspace-text-soft)]";
const CAPTION_DIRECTORY_TITLE_CLASS = [
  "bookmark-title min-w-0 overflow-hidden tracking-normal [font-family:var(--openpress-font-serif)]",
  "[line-break:loose] [overflow-wrap:anywhere] [word-break:normal]",
].join(" ");
const CAPTION_DIRECTORY_TOOLTIP_CLASS = [
  "op-workspace op-workspace-overlay z-[100] max-w-[min(300px,calc(100vw-24px))]",
  "rounded-[var(--op-workspace-radius-md)] border border-[var(--op-workspace-border)]",
  "bg-[var(--op-workspace-surface-raised)] px-3 py-2 text-xs leading-[1.45]",
  "text-[var(--op-workspace-text-soft)] shadow-[var(--op-workspace-shadow-popover)]",
].join(" ");

type DirectoryMode = "contents" | "figure" | "table";

const DIRECTORY_LABELS: Record<DirectoryMode, string> = {
  contents: "主目錄",
  figure: "圖目錄",
  table: "表目錄",
};
const DIRECTORY_OPTIONS = ["contents", "figure", "table"] as const;

type BookmarkSelectOptions = {
  behavior?: ScrollBehavior;
};

export function DocumentNavigation({
  bookmarks,
  figures,
  tables,
  currentPageIndex,
  onSelectPage,
}: {
  bookmarks: BookmarkItem[];
  figures: CaptionDirectoryItem[];
  tables: CaptionDirectoryItem[];
  currentPageIndex: number;
  onSelectPage: (pageIndex: number, options?: BookmarkSelectOptions) => void;
}) {
  const [mode, setMode] = useState<DirectoryMode>("contents");

  return (
    <>
      <div className={DIRECTORY_CONTROL_CLASS}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={DIRECTORY_TRIGGER_CLASS}
              data-openpress-directory-trigger
              aria-label={`切換文件目錄，目前為${DIRECTORY_LABELS[mode]}`}
            >
              <span>{DIRECTORY_LABELS[mode]}</span>
              <ChevronDown aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={2} className={DIRECTORY_MENU_CLASS}>
            <DropdownMenuRadioGroup value={mode} onValueChange={(value) => setMode(value as DirectoryMode)}>
              {DIRECTORY_OPTIONS.map((value) => (
                <DropdownMenuRadioItem
                  key={value}
                  className={cn(DIRECTORY_OPTION_CLASS, mode === value ? DIRECTORY_OPTION_ACTIVE_CLASS : undefined)}
                  data-openpress-directory-option={value}
                  value={value}
                >
                  {DIRECTORY_LABELS[value]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div data-openpress-directory-list={mode}>
        {mode === "contents" ? (
          <Bookmarks items={bookmarks} currentPageIndex={currentPageIndex} onSelectPage={onSelectPage} />
        ) : (
          <CaptionDirectory
            kind={mode}
            items={mode === "figure" ? figures : tables}
            currentPageIndex={currentPageIndex}
            onSelectPage={onSelectPage}
          />
        )}
      </div>
    </>
  );
}

function CaptionDirectory({
  kind,
  items,
  currentPageIndex,
  onSelectPage,
}: {
  kind: "figure" | "table";
  items: CaptionDirectoryItem[];
  currentPageIndex: number;
  onSelectPage: (pageIndex: number, options?: BookmarkSelectOptions) => void;
}) {
  if (items.length === 0) {
    return (
      <Panel.Empty className={ASSET_EMPTY_CLASS} role="status">
        {kind === "figure" ? "尚無圖目錄" : "尚無表目錄"}
      </Panel.Empty>
    );
  }

  return (
    <Tooltip.Provider delayDuration={320} skipDelayDuration={120}>
      <div className={CAPTION_DIRECTORY_LIST_CLASS}>
      {items.map((item) => {
        return (
          <CaptionDirectoryEntry
            key={item.id}
            item={item}
            active={item.pageIndex === currentPageIndex}
            onSelectPage={onSelectPage}
          />
        );
      })}
      </div>
    </Tooltip.Provider>
  );
}

function CaptionDirectoryEntry({
  item,
  active,
  onSelectPage,
}: {
  item: CaptionDirectoryItem;
  active: boolean;
  onSelectPage: (pageIndex: number, options?: BookmarkSelectOptions) => void;
}) {
  const titleRef = useRef<HTMLSpanElement | null>(null);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const title = titleRef.current;
    if (!title) return;
    let cancelled = false;
    const measure = () => {
      if (!cancelled) {
        setOverflowing(isClampedTextOverflowing({
          clientHeight: title.clientHeight,
          scrollHeight: title.scrollHeight,
          clientWidth: title.clientWidth,
          scrollWidth: title.scrollWidth,
          unclampedHeight: measureUnclampedTextHeight(title),
        }));
      }
    };
    measure();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    observer?.observe(title);
    window.addEventListener("resize", measure);
    void document.fonts?.ready.then(measure);
    return () => {
      cancelled = true;
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [item.title]);

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          className={cn(CAPTION_DIRECTORY_ITEM_CLASS, active ? BOOKMARK_ITEM_CURRENT_CLASS : undefined)}
          aria-label={`${item.label} ${item.title}`}
          aria-current={active ? "location" : undefined}
          data-openpress-caption-directory-item
          data-openpress-page-index={item.pageIndex}
          onClick={(event) => {
            event.preventDefault();
            onSelectPage(item.pageIndex, { behavior: "smooth" });
          }}
        >
          <span className={CAPTION_DIRECTORY_LABEL_CLASS} aria-hidden="true">{item.label}</span>
          <span
            ref={titleRef}
            className={CAPTION_DIRECTORY_TITLE_CLASS}
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
            }}
            data-openpress-caption-directory-title
            data-openpress-text-overflow={overflowing ? "true" : "false"}
            aria-hidden="true"
          >
            {item.title}
          </span>
        </button>
      </Tooltip.Trigger>
      {overflowing ? (
        <Tooltip.Portal>
          <Tooltip.Content
            className={CAPTION_DIRECTORY_TOOLTIP_CLASS}
            side="right"
            sideOffset={8}
            collisionPadding={12}
          >
            {item.title}
          </Tooltip.Content>
        </Tooltip.Portal>
      ) : null}
    </Tooltip.Root>
  );
}

export function isClampedTextOverflowing(
  element: Pick<HTMLElement, "clientHeight" | "scrollHeight" | "clientWidth" | "scrollWidth"> & {
    unclampedHeight?: number;
  },
) {
  return element.scrollHeight > element.clientHeight + 1
    || element.scrollWidth > element.clientWidth + 1
    || (element.unclampedHeight ?? 0) > element.clientHeight + 1;
}

function measureUnclampedTextHeight(element: HTMLElement) {
  if (element.clientWidth <= 0) return 0;
  const clone = element.cloneNode(true) as HTMLElement;
  Object.assign(clone.style, {
    position: "fixed",
    inset: "0 auto auto 0",
    width: `${element.clientWidth}px`,
    height: "auto",
    maxHeight: "none",
    overflow: "visible",
    visibility: "hidden",
    pointerEvents: "none",
    display: "block",
    webkitLineClamp: "unset",
  });
  element.ownerDocument.body.append(clone);
  const height = clone.getBoundingClientRect().height;
  clone.remove();
  return height;
}

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
        const groupState = currentPageIndex < item.pageIndex ? "future" : groupActive ? "active" : "read";
        const activeSub = item.subs.find((sub) => currentPageIndex >= sub.pageIndex && currentPageIndex <= sub.endPageIndex);
        const h2SelfActive = groupActive && !activeSub;
        const itemLabel = item.label ?? String(index + 1).padStart(2, "0");
        return (
          <div className={cn(BOOKMARK_GROUP_CLASS, groupActive ? "is-open" : undefined)} data-openpress-bookmark-state={groupState} key={item.id}>
            <button
              type="button"
              className={cn(BOOKMARK_ITEM_CLASS, BOOKMARK_H2_CLASS, h2SelfActive ? BOOKMARK_ITEM_CURRENT_CLASS : groupActive ? BOOKMARK_ITEM_ACTIVE_CLASS : undefined)}
              aria-current={h2SelfActive ? "location" : undefined}
              data-openpress-page-index={item.pageIndex}
              data-openpress-bookmark-active={groupActive ? "true" : undefined}
              data-openpress-bookmark-current={h2SelfActive ? "true" : undefined}
              data-openpress-bookmark-state={groupState}
              onClick={(event) => goToPage(event, item.pageIndex)}
            >
              <span className={cn(BOOKMARK_INDEX_CLASS, BOOKMARK_H2_INDEX_CLASS)}>{itemLabel}</span>
              <span className={cn(BOOKMARK_TITLE_CLASS, BOOKMARK_TITLE_TWO_LINE_CLASS)}>{item.title}</span>
            </button>
            <div className={cn(BOOKMARK_SUBS_CLASS, groupActive ? BOOKMARK_SUBS_OPEN_CLASS : undefined)}>
              {item.subs.map((sub, subIndex) => {
                const subActive = currentPageIndex >= sub.pageIndex && currentPageIndex <= sub.endPageIndex;
                const subState = currentPageIndex < sub.pageIndex ? "future" : subActive ? "active" : "read";
                const activeTopic = sub.subs.find((topic) => currentPageIndex >= topic.pageIndex && currentPageIndex <= topic.endPageIndex);
                const subSelfActive = subActive && !activeTopic;
                const subLabel = sub.label ?? `${itemLabel}.${subIndex + 1}`;
                return (
                  <div className={BOOKMARK_SUBGROUP_CLASS} key={sub.id}>
                    <button
                      type="button"
                      className={cn(BOOKMARK_ITEM_CLASS, BOOKMARK_H3_CLASS, subSelfActive ? BOOKMARK_ITEM_CURRENT_CLASS : subActive ? BOOKMARK_ITEM_ACTIVE_CLASS : undefined)}
                      aria-current={subSelfActive ? "location" : undefined}
                      data-openpress-page-index={sub.pageIndex}
                      data-openpress-bookmark-active={subActive ? "true" : undefined}
                      data-openpress-bookmark-current={subSelfActive ? "true" : undefined}
                      data-openpress-bookmark-state={subState}
                      onClick={(event) => goToPage(event, sub.pageIndex)}
                    >
                      <span className={BOOKMARK_INDEX_CLASS}>{subLabel}</span>
                      <span className={cn(BOOKMARK_TITLE_CLASS, BOOKMARK_TITLE_TWO_LINE_CLASS)}>{sub.title}</span>
                    </button>
                    {sub.subs.map((topic, topicIndex) => {
                      const topicActive = currentPageIndex >= topic.pageIndex && currentPageIndex <= topic.endPageIndex;
                      const topicState = currentPageIndex < topic.pageIndex ? "future" : topicActive ? "active" : "read";
                      const topicLabel = topic.label ?? `${subLabel}.${topicIndex + 1}`;
                      return (
                        <button
                          type="button"
                          className={cn(BOOKMARK_ITEM_CLASS, BOOKMARK_H4_CLASS, topicActive ? BOOKMARK_ITEM_CURRENT_CLASS : undefined)}
                          aria-current={topicActive ? "location" : undefined}
                          data-openpress-page-index={topic.pageIndex}
                          data-openpress-bookmark-active={topicActive ? "true" : undefined}
                          data-openpress-bookmark-current={topicActive ? "true" : undefined}
                          data-openpress-bookmark-state={topicState}
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
