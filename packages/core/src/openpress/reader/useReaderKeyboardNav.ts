import { useHotkey } from "../hotkeys";

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
  const canNavigate = (event: KeyboardEvent) => !isEditableTarget(event.target) && !hasActiveTextSelection();

  useHotkey("reader.next", (event) => {
    if (!canNavigate(event)) return false;
    nextPage();
  });
  useHotkey("reader.previous", (event) => {
    if (!canNavigate(event)) return false;
    prevPage();
  });
  useHotkey("reader.first", (event) => {
    if (!canNavigate(event)) return false;
    setPage(0);
  });
  useHotkey("reader.last", (event) => {
    if (!canNavigate(event)) return false;
    setPage(Math.max(0, normalizedPageCount - 1));
  });
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest(
    "input, textarea, select, button, [contenteditable], [role='menu'], [role^='menuitem']",
  ));
}

function hasActiveTextSelection() {
  const selection = window.getSelection?.();
  if (!selection || selection.isCollapsed) return false;
  return Boolean(selection.toString().trim());
}
