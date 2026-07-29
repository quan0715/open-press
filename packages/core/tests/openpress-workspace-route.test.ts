import { describe, expect, it } from "vitest";
import {
  buildWorkspaceDestination,
  parseWorkspaceDestination,
} from "../src/openpress/app/workspaceRoute";

describe("workspace route model", () => {
  it("parses Workspace documents and settings destinations", () => {
    expect(parseWorkspaceDestination("/workspace")).toEqual({ kind: "documents" });
    expect(parseWorkspaceDestination("/workspace/settings")).toEqual({ kind: "settings" });
  });

  it("parses Press preview and presentation destinations", () => {
    expect(parseWorkspaceDestination("/reader/preview")).toEqual({
      kind: "press",
      slug: "reader",
      mode: "preview",
    });
    expect(parseWorkspaceDestination("/slides/present")).toEqual({
      kind: "press",
      slug: "slides",
      mode: "present",
    });
  });

  it("falls back unknown and root paths to Documents", () => {
    expect(parseWorkspaceDestination("/")).toEqual({ kind: "documents" });
    expect(parseWorkspaceDestination("/unknown/path/value")).toEqual({ kind: "documents" });
  });

  it("builds stable destination pathnames", () => {
    expect(buildWorkspaceDestination({ kind: "documents" })).toBe("/workspace");
    expect(buildWorkspaceDestination({ kind: "settings" })).toBe("/workspace/settings");
    expect(buildWorkspaceDestination({ kind: "press", slug: "/reader/", mode: "preview" })).toBe("/reader/preview");
    expect(buildWorkspaceDestination({ kind: "press", slug: "slides", mode: "present" })).toBe("/slides/present");
  });
});
