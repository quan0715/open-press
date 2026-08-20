import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import type { ObjectSelection } from "./inspectorModel";

const COMMENT_LOCATION_MARKER_CLASS = [
  "openpress-comment-location-marker pointer-events-auto fixed z-[132]",
  "grid h-[22px] w-[22px] cursor-pointer place-items-center rounded-[6px]",
  "border border-[var(--op-workspace-accent)] bg-[rgb(29_31_30)] p-0",
  "font-mono text-[10px] font-extrabold leading-none text-[var(--op-workspace-accent)]",
  "shadow-[0_8px_20px_rgb(0_0_0_/_0.22)] ring-2 ring-white/80",
  "transition-[transform,background-color,box-shadow] duration-150",
  "hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--op-workspace-accent)_18%,rgb(29_31_30))]",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--op-workspace-accent)]",
].join(" ");

export interface CommentLocationMarkerProps {
  sourceContainerRef: RefObject<HTMLDivElement | null>;
  target: ObjectSelection | null;
  label: string;
  geometryVersion?: unknown;
}

export interface CommentLocationMarkerRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function calculateCommentLocationMarkerPosition({
  targetRect,
  pageRect,
  placement,
}: {
  targetRect: CommentLocationMarkerRect;
  pageRect: CommentLocationMarkerRect;
  placement: ObjectSelection["placement"];
}) {
  const left = clamp(targetRect.left - 28, pageRect.left + 6, pageRect.right - 28);
  const targetTop = placement === "before" ? targetRect.top - 20 : targetRect.top + 2;
  const top = clamp(targetTop, pageRect.top + 6, pageRect.bottom - 28);
  return { left: Math.round(left), top: Math.round(top) };
}

export function CommentLocationMarker({
  sourceContainerRef,
  target,
  label,
  geometryVersion,
}: CommentLocationMarkerProps) {
  const [style, setStyle] = useState<CSSProperties | null>(null);

  const updatePosition = useCallback(() => {
    const root = sourceContainerRef.current;
    const placement = target?.placement;
    const targetElement = root && target ? findTargetElement(root, target) : null;
    if (!targetElement || !placement) {
      setStyle(null);
      return;
    }

    const targetRect = targetElement.getBoundingClientRect();
    const pageRect = targetElement.closest<HTMLElement>(".openpress-html-page")?.getBoundingClientRect();
    if (!pageRect || !isNearViewport(targetRect)) {
      setStyle(null);
      return;
    }

    const position = calculateCommentLocationMarkerPosition({
      targetRect,
      pageRect,
      placement,
    });
    setStyle((current) => {
      const next = { left: `${position.left}px`, top: `${position.top}px` };
      return current?.left === next.left && current?.top === next.top ? current : next;
    });
  }, [geometryVersion, sourceContainerRef, target?.blockId, target?.objectId, target?.placement]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition]);

  useEffect(() => {
    const root = sourceContainerRef.current;
    const resizeObserver = typeof ResizeObserver === "undefined" || !root
      ? null
      : new ResizeObserver(updatePosition);
    if (root && resizeObserver) resizeObserver.observe(root);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [sourceContainerRef, updatePosition]);

  if (!target || !style) return null;

  const focusEditor = () => {
    const targetElement = sourceContainerRef.current && findTargetElement(sourceContainerRef.current, target);
    targetElement?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>("[data-openpress-comment-review-textarea]")
        ?.focus({ preventScroll: true });
    });
  };

  return (
    <button
      type="button"
      className={COMMENT_LOCATION_MARKER_CLASS}
      style={style}
      title={label === "+" ? "新註解位置" : `註解 ${label} 的位置`}
      aria-label={label === "+" ? "新註解位置" : `註解 ${label} 的位置`}
      data-openpress-comment-location-marker
      data-openpress-comment-location-marker-label={label}
      data-openpress-comment-location-marker-object-id={target.objectId}
      data-openpress-comment-location-marker-block-id={target.blockId}
      onClick={focusEditor}
    >
      {label}
    </button>
  );
}

function findTargetElement(root: HTMLElement, target: ObjectSelection) {
  const selector = target.objectId
    ? `[data-openpress-object-id="${cssEscape(target.objectId)}"]`
    : target.blockId
      ? `[data-openpress-block-id="${cssEscape(target.blockId)}"]`
      : "";
  return selector ? root.querySelector<HTMLElement>(selector) : null;
}

function isNearViewport(rect: DOMRect, margin = 48) {
  return rect.bottom >= -margin
    && rect.top <= window.innerHeight + margin
    && rect.right >= -margin
    && rect.left <= window.innerWidth + margin;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function cssEscape(value: string) {
  return globalThis.CSS?.escape ? globalThis.CSS.escape(value) : value.replace(/["\\]/g, "\\$&");
}
