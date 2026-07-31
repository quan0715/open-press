import { describe, expect, it } from "vitest";
import {
  PAGE_VIEWPORT_SCALE_OPTIONS,
  currentPageViewportPercent,
  formatPageViewportScaleLabel,
  pageViewportScaleModeFromPercent,
  parsePageViewportScaleMode,
  resolvePageViewportScale,
  stepPageViewportScale,
  type PageViewportScaleMode,
} from "../src/openpress/reader";

describe("page viewport scale model", () => {
  it("fits the page width without mutating canonical page geometry", () => {
    expect(resolvePageViewportScale({ mode: "fit-width", fitWidthScale: 0.466, fitPageScale: 0.33 })).toBe(0.466);
    expect(resolvePageViewportScale({ mode: "fit-width", fitWidthScale: 1.84, fitPageScale: 0.72 })).toBe(1);
  });

  it("fits the full page independently from width-only fit", () => {
    expect(resolvePageViewportScale({ mode: "fit-page", fitWidthScale: 0.86, fitPageScale: 0.52 })).toBe(0.52);
    expect(resolvePageViewportScale({ mode: "fit-page", fitWidthScale: 1.4, fitPageScale: 1.2 })).toBe(1);
  });

  it("supports fixed zoom menu levels independent of available viewport width", () => {
    expect(resolvePageViewportScale({ mode: "scale-25", fitWidthScale: 0.466, fitPageScale: 0.33 })).toBe(0.25);
    expect(resolvePageViewportScale({ mode: "scale-100", fitWidthScale: 0.466, fitPageScale: 0.33 })).toBe(1);
    expect(resolvePageViewportScale({ mode: "scale-150", fitWidthScale: 0.466, fitPageScale: 0.33 })).toBe(1.5);
    expect(resolvePageViewportScale({ mode: "scale-200", fitWidthScale: 0.466, fitPageScale: 0.33 })).toBe(2);
  });

  it("exposes the dropdown zoom options in display order", () => {
    expect(PAGE_VIEWPORT_SCALE_OPTIONS.map((option) => option.value)).toEqual([
      "scale-25",
      "scale-50",
      "scale-75",
      "scale-100",
      "scale-125",
      "scale-150",
      "scale-200",
      "fit-width",
      "fit-page",
    ] satisfies PageViewportScaleMode[]);
  });

  it("formats compact toolbar labels", () => {
    expect(formatPageViewportScaleLabel("fit-width", 0.466)).toBe("47%");
    expect(formatPageViewportScaleLabel("fit-page", 0.466)).toBe("47%");
    expect(formatPageViewportScaleLabel("scale-100", 1)).toBe("100%");
    expect(formatPageViewportScaleLabel("scale-125", 1.25)).toBe("125%");
  });

  it("creates and resolves arbitrary integer fixed zoom modes", () => {
    expect(pageViewportScaleModeFromPercent(137)).toBe("scale-137");
    expect(resolvePageViewportScale({ mode: "scale-137", fitWidthScale: 0.4, fitPageScale: 0.3 })).toBe(1.37);
    expect(formatPageViewportScaleLabel("scale-137", 1.37)).toBe("137%");
  });

  it("clamps custom fixed zoom modes to the supported range", () => {
    expect(pageViewportScaleModeFromPercent(10)).toBe("scale-25");
    expect(pageViewportScaleModeFromPercent(245)).toBe("scale-200");
  });

  it("parses persisted custom modes and rejects malformed values", () => {
    expect(parsePageViewportScaleMode("scale-137")).toBe("scale-137");
    expect(parsePageViewportScaleMode("fit-width")).toBe("fit-width");
    expect(parsePageViewportScaleMode("scale-20")).toBeNull();
    expect(parsePageViewportScaleMode("scale-137.5")).toBeNull();
    expect(parsePageViewportScaleMode("other")).toBeNull();
  });

  it("steps from the resolved displayed percentage", () => {
    expect(stepPageViewportScale("fit-width", 1.25, -10)).toBe("scale-115");
    expect(stepPageViewportScale("fit-page", 1.25, 10)).toBe("scale-135");
    expect(stepPageViewportScale("fit-width", 0.466, 10)).toBe("scale-57");
  });

  it("steps from a fixed mode before its measured scale catches up", () => {
    expect(stepPageViewportScale("scale-110", 1, -10)).toBe("scale-100");
    expect(stepPageViewportScale("scale-90", 1, 10)).toBe("scale-100");
  });

  it("uses fixed mode state for control boundaries before measurement catches up", () => {
    expect(currentPageViewportPercent("scale-190", 2)).toBe(190);
    expect(currentPageViewportPercent("scale-35", 0.25)).toBe(35);
    expect(currentPageViewportPercent("fit-width", 0.466)).toBe(47);
  });
});
