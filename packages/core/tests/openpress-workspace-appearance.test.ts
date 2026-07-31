import { describe, expect, it } from "vitest";
import {
  parseWorkspaceSettingsPayload,
  resolveWorkspaceColorMode,
  updateWorkspaceSettingsAppearance,
} from "../src/openpress/app/workspaceAppearance";

describe("workspace appearance preferences", () => {
  it("reads the full writable local settings response", () => {
    expect(parseWorkspaceSettingsPayload({
      ok: true,
      settings: {
        version: 1,
        appearance: { colorMode: "system", accent: "violet" },
        pdf: { filename: "book.pdf" },
      },
      source: "settings",
      writable: true,
    })).toEqual({
      settings: {
        version: 1,
        appearance: { colorMode: "system", accent: "violet" },
        pdf: { filename: "book.pdf" },
      },
      appearance: {
        colorModePreference: "system",
        accent: "violet",
      },
      source: "settings",
      writable: true,
    });
  });

  it("reads the safe public projection as read-only settings", () => {
    expect(parseWorkspaceSettingsPayload({
      version: 1,
      appearance: { colorMode: "light", accent: "blue" },
    })).toEqual({
      settings: {
        version: 1,
        appearance: { colorMode: "light", accent: "blue" },
      },
      appearance: {
        colorModePreference: "light",
        accent: "blue",
      },
      source: "public",
      writable: false,
    });
  });

  it("rejects invalid settings payloads", () => {
    expect(() => parseWorkspaceSettingsPayload({
      version: 1,
      appearance: { colorMode: "sepia", accent: "orange" },
    })).toThrow(/appearance/);
  });

  it("updates Appearance without dropping operational settings", () => {
    expect(updateWorkspaceSettingsAppearance({
      version: 1,
      appearance: { colorMode: "dark", accent: "amber" },
      pdf: { filename: "book.pdf" },
      deploy: { projectName: "internal" },
    }, {
      colorModePreference: "light",
      accent: "rose",
    })).toEqual({
      version: 1,
      appearance: {
        colorMode: "light",
        accent: "rose",
      },
      pdf: { filename: "book.pdf" },
      deploy: { projectName: "internal" },
    });
  });

  it("resolves system mode without changing explicit modes", () => {
    expect(resolveWorkspaceColorMode("system", true)).toBe("light");
    expect(resolveWorkspaceColorMode("system", false)).toBe("dark");
    expect(resolveWorkspaceColorMode("dark", true)).toBe("dark");
    expect(resolveWorkspaceColorMode("light", false)).toBe("light");
  });
});
