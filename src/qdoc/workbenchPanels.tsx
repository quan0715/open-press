import { type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import type { QDocBookmarkItem } from "./indexes";

type QDocBookmarkSelectOptions = {
  behavior?: ScrollBehavior;
  source?: "bookmark";
};

export function QDocBookmarks({
  items,
  currentPageIndex,
  onSelectPage,
}: {
  items: QDocBookmarkItem[];
  currentPageIndex: number;
  onSelectPage: (pageIndex: number, options?: QDocBookmarkSelectOptions) => void;
}) {
  const goToPage = (event: ReactMouseEvent<HTMLButtonElement>, pageIndex: number) => {
    event.preventDefault();
    onSelectPage(pageIndex, { behavior: "smooth", source: "bookmark" });
  };

  if (items.length === 0) {
    return <p className="qdoc-asset-empty">尚無書籤</p>;
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
              data-qdoc-page-index={item.pageIndex}
              onClick={(event) => goToPage(event, item.pageIndex)}
            >
              <span className="bookmark-index">{itemLabel}</span>
              <span className="bookmark-title">{item.title}</span>
            </button>
            <div className="bookmark-subs">
              {item.subs.map((sub, subIndex) => {
                const subActive = currentPageIndex >= sub.pageIndex && currentPageIndex <= sub.endPageIndex;
                const subLabel = sub.label ?? `${itemLabel}.${subIndex + 1}`;
                return (
                  <button
                    type="button"
                    className={`bookmark-item bookmark-h3${subActive ? " is-active" : ""}`}
                    data-qdoc-page-index={sub.pageIndex}
                    onClick={(event) => goToPage(event, sub.pageIndex)}
                    key={sub.id}
                  >
                    <span className="bookmark-index">{subLabel}</span>
                    <span className="bookmark-title">{sub.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

export function QDocCurrentPagePanel({
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
    <section className="qdoc-panel-section qdoc-panel-section--current" aria-label="目前頁面">
      {showHeading ? <div className="qdoc-panel-heading">目前頁面</div> : null}
      <div className="qdoc-current-page-card">
        <div className="qdoc-current-page-card__number" aria-label="目前頁數">
          {pageLabelPrefix ? <span className="qdoc-current-page-card__prefix">{pageLabelPrefix}</span> : null}
          <span data-qdoc-current-page>{currentPageLabel}</span>
          <span className="sep">/</span>
          <span data-qdoc-total-pages>{totalPageLabel}</span>
        </div>
        {showTitle ? <div className="qdoc-current-page-card__title">{title}</div> : null}
        <div className="qdoc-current-page-card__progress" aria-hidden="true">
          <span style={{ "--progress": `${progressPercent}%` } as CSSProperties} />
        </div>
      </div>
    </section>
  );
}
