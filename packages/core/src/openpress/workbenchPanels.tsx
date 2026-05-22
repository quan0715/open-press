import { type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import type { BookmarkItem } from "./indexes";

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
    return <p className="openpress-asset-empty">尚無書籤</p>;
  }

  return (
    <>
      {items.map((item, index) => {
        const groupActive = currentPageIndex >= item.pageIndex && currentPageIndex <= item.endPageIndex;
        const activeSub = item.subs.find((sub) => currentPageIndex >= sub.pageIndex && currentPageIndex <= sub.endPageIndex);
        const h2SelfActive = groupActive && !activeSub;
        const itemLabel = item.label ?? String(index + 1).padStart(2, "0");
        return (
          <div className={`bookmark-group${groupActive ? " is-open" : ""}`} key={item.id}>
            <button
              type="button"
              className={`bookmark-item bookmark-h2${h2SelfActive ? " is-active" : ""}`}
              data-openpress-page-index={item.pageIndex}
              onClick={(event) => goToPage(event, item.pageIndex)}
            >
              <span className="bookmark-index">{itemLabel}</span>
              <span className="bookmark-title">{item.title}</span>
            </button>
            <div className="bookmark-subs">
              {item.subs.map((sub, subIndex) => {
                const subActive = currentPageIndex >= sub.pageIndex && currentPageIndex <= sub.endPageIndex;
                const activeTopic = sub.subs.find((topic) => currentPageIndex >= topic.pageIndex && currentPageIndex <= topic.endPageIndex);
                const subSelfActive = subActive && !activeTopic;
                const subLabel = sub.label ?? `${itemLabel}.${subIndex + 1}`;
                return (
                  <div className="bookmark-subgroup" key={sub.id}>
                    <button
                      type="button"
                      className={`bookmark-item bookmark-h3${subSelfActive ? " is-active" : ""}`}
                      data-openpress-page-index={sub.pageIndex}
                      onClick={(event) => goToPage(event, sub.pageIndex)}
                    >
                      <span className="bookmark-index">{subLabel}</span>
                      <span className="bookmark-title">{sub.title}</span>
                    </button>
                    {sub.subs.map((topic, topicIndex) => {
                      const topicActive = currentPageIndex >= topic.pageIndex && currentPageIndex <= topic.endPageIndex;
                      const topicLabel = topic.label ?? `${subLabel}.${topicIndex + 1}`;
                      return (
                        <button
                          type="button"
                          className={`bookmark-item bookmark-h4${topicActive ? " is-active" : ""}`}
                          data-openpress-page-index={topic.pageIndex}
                          onClick={(event) => goToPage(event, topic.pageIndex)}
                          key={topic.id}
                        >
                          <span className="bookmark-index">{topicLabel}</span>
                          <span className="bookmark-title">{topic.title}</span>
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
    <section className="openpress-panel-section openpress-panel-section--current" aria-label="目前頁面">
      {showHeading ? <div className="openpress-panel-heading">目前頁面</div> : null}
      <div className="openpress-current-page-card">
        <div className="openpress-current-page-card__number" aria-label="目前頁數">
          {pageLabelPrefix ? <span className="openpress-current-page-card__prefix">{pageLabelPrefix}</span> : null}
          <span data-openpress-current-page>{currentPageLabel}</span>
          <span className="sep">/</span>
          <span data-openpress-total-pages>{totalPageLabel}</span>
        </div>
        {showTitle ? <div className="openpress-current-page-card__title">{title}</div> : null}
        <div className="openpress-current-page-card__progress" aria-hidden="true">
          <span style={{ "--progress": `${progressPercent}%` } as CSSProperties} />
        </div>
      </div>
    </section>
  );
}
