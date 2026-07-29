import { useEffect } from "react";

type PageZoomShortcutStep = -10 | 10;

export function usePageZoomKeyboardShortcuts({
  onStep,
}: {
  onStep: (deltaPercent: PageZoomShortcutStep) => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) return;
      if (event.altKey || event.isComposing || event.keyCode === 229) return;
      if (isEditableTarget(event.target)) return;

      const deltaPercent = zoomShortcutStep(event);
      if (deltaPercent === null) return;

      event.preventDefault();
      onStep(deltaPercent);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onStep]);
}

function zoomShortcutStep(event: KeyboardEvent): PageZoomShortcutStep | null {
  if (event.key === "+" || event.key === "=") return 10;
  if (event.key === "-") return -10;
  return null;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return target.closest(
    "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox']",
  ) !== null;
}
