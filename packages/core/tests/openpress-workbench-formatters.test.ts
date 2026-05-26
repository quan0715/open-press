import { describe, expect, it } from "vitest";
import { formatPageGeometrySpec } from "../src/openpress/workbench/workbenchFormatters";

describe("workbenchFormatters", () => {
  it("formats the default A4 page geometry for the toolbar", () => {
    expect(formatPageGeometrySpec()).toEqual({
      label: "A4 Page",
      dimensions: "210 × 297 mm",
      title: "A4 Page · 210 × 297 mm",
    });
  });

  it("formats explicit custom page geometry without losing units", () => {
    expect(formatPageGeometrySpec({ pageWidth: "297mm", pageHeight: "167mm" })).toEqual({
      label: "16:9 Page",
      dimensions: "297 × 167 mm",
      title: "16:9 Page · 297 × 167 mm",
    });
  });

  it("uses document-provided page labels for named non-A4 formats", () => {
    expect(formatPageGeometrySpec({
      pageLabel: "Social Square",
      pageWidth: "1080px",
      pageHeight: "1080px",
    })).toEqual({
      label: "Social Square",
      dimensions: "1080 × 1080 px",
      title: "Social Square · 1080 × 1080 px",
    });
  });
});
