import { useHotkey } from "../hotkeys";

type PageZoomShortcutStep = -10 | 10;

export function usePageZoomKeyboardShortcuts({
  onStep,
}: {
  onStep: (deltaPercent: PageZoomShortcutStep) => void;
}) {
  useHotkey("view.zoom-in", () => {
    onStep(10);
  });
  useHotkey("view.zoom-out", () => {
    onStep(-10);
  });
}
