import { useEffect, useLayoutEffect, useMemo, useState, type RefObject } from "react";
import { scheduleBrowserFrame } from "../shared";
import {
  PAGE_VIEWPORT_SCALE_OPTIONS,
  formatPageViewportScaleLabel,
  formatPageViewportScaleValue,
  resolvePageViewportScale,
  type PageLayoutMode,
  type PageViewportScaleMode,
} from "./pageViewportScaleModel";

export function usePageViewportScale({
  stageRef,
  pageContainerRef,
  pageCount,
  layoutMode = "single",
  initialScaleMode = "fit-width",
  maxFitScale = 1,
  scaleModeStorageKey,
  viewportKey,
}: {
  stageRef: RefObject<HTMLElement | null>;
  pageContainerRef: RefObject<HTMLElement | null>;
  pageCount: number;
  layoutMode?: PageLayoutMode;
  initialScaleMode?: PageViewportScaleMode;
  maxFitScale?: number;
  scaleModeStorageKey?: string;
  viewportKey?: string | number | boolean;
}) {
  const [scaleMode, setScaleMode] = useState<PageViewportScaleMode>(() =>
    readStoredScaleMode(scaleModeStorageKey, initialScaleMode),
  );
  const [scale, setScale] = useState(1);

  useEffect(() => {
    writeStoredScaleMode(scaleModeStorageKey, scaleMode);
  }, [scaleMode, scaleModeStorageKey]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return undefined;

    let cancelFrame: (() => void) | null = null;

    const syncScale = () => {
      cancelFrame?.();
      cancelFrame = scheduleBrowserFrame(() => {
        cancelFrame = null;
        const container = pageContainerRef.current;
        if (!container) return;

        const pageSurface = container.querySelector<HTMLElement>(".openpress-html-page__html");
        if (!pageSurface) {
          container.style.setProperty("--openpress-page-viewport-scale", "1");
          container.dataset.openpressPageScaleMode = scaleMode;
          container.dataset.openpressPageScale = "1";
          setScale(1);
          return;
        }

        const stage = stageRef.current ?? container.parentElement;
        const containerStyle = window.getComputedStyle(container);
        const paddingLeft = parseCssPixelValue(containerStyle.paddingLeft);
        const paddingRight = parseCssPixelValue(containerStyle.paddingRight);
        const paddingTop = parseCssPixelValue(containerStyle.paddingTop);
        const paddingBottom = parseCssPixelValue(containerStyle.paddingBottom);
        const columnGap = parseCssPixelValue(containerStyle.columnGap || containerStyle.gap);
        const availableWidth = Math.max(
          1,
          (stage?.clientWidth || container.clientWidth || window.innerWidth) - paddingLeft - paddingRight,
        );
        const availableHeight = Math.max(
          1,
          (stage?.clientHeight || container.clientHeight || window.innerHeight) - paddingTop - paddingBottom,
        );
        const pageWidth = pageSurface.offsetWidth;
        const pageHeight = pageSurface.offsetHeight;
        const canonicalWidth = layoutMode === "spread" ? (pageWidth * 2) + columnGap : pageWidth;
        const canonicalHeight = pageHeight;
        const fitWidthScale = canonicalWidth > 0 ? availableWidth / canonicalWidth : 1;
        const fitPageScale = canonicalWidth > 0 && canonicalHeight > 0
          ? Math.min(availableWidth / canonicalWidth, availableHeight / canonicalHeight)
          : 1;
        const nextScale = resolvePageViewportScale({ mode: scaleMode, fitWidthScale, fitPageScale, maxFitScale });
        const nextScaleValue = formatPageViewportScaleValue(nextScale);
        const viewportAnchor = container.dataset.openpressPageScale
          && container.dataset.openpressPageScale !== nextScaleValue
          && stage
          ? capturePageViewportAnchor(stage, container)
          : null;

        container.style.setProperty("--openpress-page-viewport-scale", nextScaleValue);
        container.dataset.openpressPageScaleMode = scaleMode;
        container.dataset.openpressPageScale = nextScaleValue;
        if (viewportAnchor && stage) restorePageViewportAnchor(stage, container, viewportAnchor);
        setScale((current) => (current === nextScale ? current : nextScale));
      });
    };

    syncScale();

    const ResizeObserverCtor = window.ResizeObserver;
    const observer = ResizeObserverCtor ? new ResizeObserverCtor(syncScale) : null;
    const stage = stageRef.current;
    const container = pageContainerRef.current;
    if (stage) observer?.observe(stage);
    if (container) observer?.observe(container);

    window.addEventListener("resize", syncScale);
    window.visualViewport?.addEventListener("resize", syncScale);
    return () => {
      cancelFrame?.();
      observer?.disconnect();
      window.removeEventListener("resize", syncScale);
      window.visualViewport?.removeEventListener("resize", syncScale);
    };
  }, [layoutMode, maxFitScale, pageContainerRef, pageCount, scaleMode, stageRef, viewportKey]);

  const scaleLabel = useMemo(
    () => {
      const labelScale = scaleMode.startsWith("scale-")
        ? resolvePageViewportScale({ mode: scaleMode, fitWidthScale: scale, fitPageScale: scale, maxFitScale })
        : scale;
      return formatPageViewportScaleLabel(scaleMode, labelScale);
    },
    [maxFitScale, scale, scaleMode],
  );

  return {
    scale,
    scaleMode,
    scaleLabel,
    setScaleMode,
  };
}

function parseCssPixelValue(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

interface PageViewportAnchor {
  pageIndex: string;
  xRatio: number;
  yRatio: number;
}

function capturePageViewportAnchor(stage: HTMLElement, container: HTMLElement): PageViewportAnchor | null {
  const pages = getViewportPages(container);
  if (pages.length === 0) return null;

  const stageRect = stage.getBoundingClientRect();
  const anchorX = stageRect.left + (stage.clientWidth / 2);
  const anchorY = stageRect.top + (stage.clientHeight / 2);
  const target = pages.reduce((closest, candidate) => {
    return distanceToRect(candidate.getBoundingClientRect(), anchorX, anchorY)
      < distanceToRect(closest.getBoundingClientRect(), anchorX, anchorY)
      ? candidate
      : closest;
  });
  const targetRect = target.getBoundingClientRect();
  const pageIndex = target.dataset.openpressPageIndex;
  if (pageIndex === undefined || targetRect.width <= 0 || targetRect.height <= 0) return null;

  return {
    pageIndex,
    xRatio: (anchorX - targetRect.left) / targetRect.width,
    yRatio: (anchorY - targetRect.top) / targetRect.height,
  };
}

function restorePageViewportAnchor(
  stage: HTMLElement,
  container: HTMLElement,
  anchor: PageViewportAnchor,
) {
  const target = getViewportPages(container)
    .find((page) => page.dataset.openpressPageIndex === anchor.pageIndex);
  if (!target) return;

  const stageRect = stage.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const anchorX = stageRect.left + (stage.clientWidth / 2);
  const anchorY = stageRect.top + (stage.clientHeight / 2);
  const deltaX = targetRect.left + (targetRect.width * anchor.xRatio) - anchorX;
  const deltaY = targetRect.top + (targetRect.height * anchor.yRatio) - anchorY;
  stage.scrollLeft += deltaX;
  stage.scrollTop += deltaY;
}

function getViewportPages(container: HTMLElement) {
  return Array.from(container.children).filter(
    (element): element is HTMLElement => element instanceof HTMLElement
      && element.dataset.openpressPageIndex !== undefined,
  );
}

function distanceToRect(rect: DOMRect, x: number, y: number) {
  const deltaX = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
  const deltaY = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
  return Math.hypot(deltaX, deltaY);
}

function readStoredScaleMode(
  storageKey: string | undefined,
  fallback: PageViewportScaleMode,
): PageViewportScaleMode {
  if (!storageKey || typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored && isPageViewportScaleMode(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredScaleMode(storageKey: string | undefined, scaleMode: PageViewportScaleMode) {
  if (!storageKey || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, scaleMode);
  } catch {
    // Storage can be unavailable in private browsing or embedded contexts.
  }
}

function isPageViewportScaleMode(value: string): value is PageViewportScaleMode {
  return PAGE_VIEWPORT_SCALE_OPTIONS.some((option) => option.value === value);
}
