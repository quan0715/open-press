// Single place that touches scrollIntoView and IntersectionObserver. Keeping
// these together makes it obvious which DOM APIs the reader depends on and
// keeps the React runtime free of imperative scroll bookkeeping.

const DEBOUNCE_MS = 100;

const OBSERVER_THRESHOLDS = [0, 0.25, 0.5, 0.75, 1];

export function scrollToPage(
  refs: Array<HTMLElement | null>,
  pageIndex: number,
  behavior: ScrollBehavior = "smooth",
  root?: HTMLElement | null,
) {
  const target = refs[pageIndex];
  if (!target) return false;

  if (root && root.contains(target) && typeof root.scrollTo === "function") {
    const rootRect = root.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const scrollMarginTop = readScrollMarginTop(target);
    root.scrollTo({
      top: Math.max(0, root.scrollTop + targetRect.top - rootRect.top - scrollMarginTop),
      behavior,
    });
    return true;
  }

  target.scrollIntoView({ behavior, block: "start" });
  return true;
}

function readScrollMarginTop(target: HTMLElement) {
  if (typeof window === "undefined") return 0;
  const value = Number.parseFloat(window.getComputedStyle(target).scrollMarginTop);
  return Number.isFinite(value) ? value : 0;
}

export interface PageVisibilityObserver {
  observe: (element: Element) => void;
  disconnect: () => void;
}

export function createPageVisibilityObserver(
  root: Element,
  onVisiblePageChange: (pageIndex: number) => void,
): PageVisibilityObserver | null {
  if (typeof IntersectionObserver === "undefined") return null;

  const ratios = new Map<Element, number>();
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    debounceTimer = null;
    let bestEl: Element | null = null;
    let bestRatio = -1;
    for (const [el, ratio] of ratios) {
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestEl = el;
      }
    }
    if (!bestEl || bestRatio <= 0) return;
    const raw = bestEl.getAttribute("data-openpress-page-index");
    if (raw === null) return;
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed)) onVisiblePageChange(parsed);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
      }
      if (debounceTimer !== null) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(flush, DEBOUNCE_MS);
    },
    { root, threshold: OBSERVER_THRESHOLDS },
  );

  return {
    observe: (element) => observer.observe(element),
    disconnect: () => {
      observer.disconnect();
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      ratios.clear();
    },
  };
}
