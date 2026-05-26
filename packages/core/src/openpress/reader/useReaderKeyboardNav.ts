import { useEffect } from "react";

export interface UseReaderKeyboardNavOptions {
  nextPage: () => void;
  prevPage: () => void;
  setPage: (pageIndex: number) => void;
  normalizedPageCount: number;
}

export function useReaderKeyboardNav({
  nextPage,
  prevPage,
  setPage,
  normalizedPageCount,
}: UseReaderKeyboardNavOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (hasActiveTextSelection()) return;
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        nextPage();
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        prevPage();
      } else if (event.key === "Home") {
        event.preventDefault();
        setPage(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setPage(Math.max(0, normalizedPageCount - 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPage, prevPage, setPage, normalizedPageCount]);
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, button, [contenteditable]"));
}

function hasActiveTextSelection() {
  const selection = window.getSelection?.();
  if (!selection || selection.isCollapsed) return false;
  return Boolean(selection.toString().trim());
}
