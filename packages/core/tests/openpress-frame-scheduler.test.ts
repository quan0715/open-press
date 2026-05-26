import { afterEach, describe, expect, it, vi } from "vitest";
import { scheduleBrowserFrame, waitForBrowserFrame } from "../src/openpress/shared";

const originalVisibilityState = Object.getOwnPropertyDescriptor(Document.prototype, "visibilityState");

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (originalVisibilityState) {
    Object.defineProperty(Document.prototype, "visibilityState", originalVisibilityState);
  }
});

describe("frameScheduler", () => {
  it("falls back to a timer when the document is hidden", async () => {
    vi.useFakeTimers();
    Object.defineProperty(Document.prototype, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    const callback = vi.fn();

    scheduleBrowserFrame(callback);
    await vi.runOnlyPendingTimersAsync();

    expect(raf).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("uses requestAnimationFrame when the document is visible", () => {
    Object.defineProperty(Document.prototype, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(123);
      return 1;
    });
    const callback = vi.fn();

    scheduleBrowserFrame(callback);

    expect(raf).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(123);
  });

  it("allows promise-based frame waits to resolve in hidden documents", async () => {
    vi.useFakeTimers();
    Object.defineProperty(Document.prototype, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });

    const promise = waitForBrowserFrame();
    await vi.runOnlyPendingTimersAsync();

    await expect(promise).resolves.toBeUndefined();
  });
});
