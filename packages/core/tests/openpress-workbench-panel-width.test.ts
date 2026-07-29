import { describe, expect, it } from "vitest";
import {
  MAX_LEFT_PANEL_WIDTH,
  MIN_LEFT_PANEL_WIDTH,
  clampLeftPanelWidth,
  readLeftPanelWidth,
} from "../src/openpress/workbench/shell/workbenchPanelWidth";

describe("workbench left panel width", () => {
  it("clamps widths to the supported range", () => {
    expect(MIN_LEFT_PANEL_WIDTH).toBe(240);
    expect(MAX_LEFT_PANEL_WIDTH).toBe(480);
    expect(clampLeftPanelWidth(120)).toBe(240);
    expect(clampLeftPanelWidth(360)).toBe(360);
    expect(clampLeftPanelWidth(900)).toBe(480);
  });

  it("reads and clamps a persisted numeric width", () => {
    expect(readLeftPanelWidth({ getItem: () => "420" })).toBe(420);
    expect(readLeftPanelWidth({ getItem: () => "999" })).toBe(480);
  });

  it("rejects missing, invalid, and non-positive persisted widths", () => {
    expect(readLeftPanelWidth({ getItem: () => null })).toBeNull();
    expect(readLeftPanelWidth({ getItem: () => "invalid" })).toBeNull();
    expect(readLeftPanelWidth({ getItem: () => "0" })).toBeNull();
    expect(readLeftPanelWidth({
      getItem() {
        throw new Error("storage denied");
      },
    })).toBeNull();
  });
});
