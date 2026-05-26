import { describe, expect, it } from "vitest";
import {
  PAGE_VIEWPORT_SCALE_OPTIONS,
  formatPageViewportScaleLabel,
  resolvePageViewportScale,
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
});
