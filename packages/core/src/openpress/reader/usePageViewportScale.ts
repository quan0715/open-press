import { useLayoutEffect, useMemo, useState, type RefObject } from "react";
import { scheduleBrowserFrame } from "../shared";
import {
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
}: {
  stageRef: RefObject<HTMLElement | null>;
  pageContainerRef: RefObject<HTMLElement | null>;
  pageCount: number;
  layoutMode?: PageLayoutMode;
}) {
  const [scaleMode, setScaleMode] = useState<PageViewportScaleMode>("fit-width");
  const [scale, setScale] = useState(1);

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
        const nextScale = resolvePageViewportScale({ mode: scaleMode, fitWidthScale, fitPageScale });
        const nextScaleValue = formatPageViewportScaleValue(nextScale);

        container.style.setProperty("--openpress-page-viewport-scale", nextScaleValue);
        container.dataset.openpressPageScaleMode = scaleMode;
        container.dataset.openpressPageScale = nextScaleValue;
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
  }, [layoutMode, pageContainerRef, pageCount, scaleMode, stageRef]);

  const scaleLabel = useMemo(
    () => {
      const labelScale = scaleMode.startsWith("scale-")
        ? resolvePageViewportScale({ mode: scaleMode, fitWidthScale: scale, fitPageScale: scale })
        : scale;
      return formatPageViewportScaleLabel(scaleMode, labelScale);
    },
    [scale, scaleMode],
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
