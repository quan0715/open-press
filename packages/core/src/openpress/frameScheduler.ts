type BrowserFrameCallback = (timestamp: number) => void;

export function scheduleBrowserFrame(callback: BrowserFrameCallback) {
  if (canUseAnimationFrame()) {
    const frame = window.requestAnimationFrame(callback);
    return () => window.cancelAnimationFrame(frame);
  }

  const timer = window.setTimeout(() => callback(now()), 0);
  return () => window.clearTimeout(timer);
}

export function waitForBrowserFrame() {
  return new Promise<void>((resolve) => {
    scheduleBrowserFrame(() => resolve());
  });
}

function canUseAnimationFrame() {
  return (
    typeof window !== "undefined" &&
    typeof window.requestAnimationFrame === "function" &&
    typeof document !== "undefined" &&
    document.visibilityState !== "hidden"
  );
}

function now() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}
