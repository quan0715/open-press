import { describe, expect, it } from "vitest";
import {
  readWorkspaceAppearance,
  resolveWorkspaceColorMode,
} from "../src/openpress/app/workspaceAppearance";

function storageWith(values: Record<string, string>) {
  return {
    getItem(key: string) {
      return values[key] ?? null;
    },
  };
}

describe("workspace appearance preferences", () => {
  it("migrates the existing color-mode key and defaults the accent", () => {
    expect(readWorkspaceAppearance(storageWith({
      "openpress:workspace:color-mode": "light",
    }))).toEqual({
      colorModePreference: "light",
      accent: "amber",
    });
  });

  it("reads supported persisted preferences", () => {
    expect(readWorkspaceAppearance(storageWith({
      "openpress:workspace:color-mode": "system",
      "openpress:workspace:accent": "violet",
    }))).toEqual({
      colorModePreference: "system",
      accent: "violet",
    });
  });

  it("rejects invalid persisted values", () => {
    expect(readWorkspaceAppearance(storageWith({
      "openpress:workspace:color-mode": "sepia",
      "openpress:workspace:accent": "orange",
    }))).toEqual({
      colorModePreference: "dark",
      accent: "amber",
    });
  });

  it("falls back when browser storage throws", () => {
    expect(readWorkspaceAppearance({
      getItem() {
        throw new Error("storage denied");
      },
    })).toEqual({
      colorModePreference: "dark",
      accent: "amber",
    });
  });

  it("resolves system mode without changing explicit modes", () => {
    expect(resolveWorkspaceColorMode("system", true)).toBe("light");
    expect(resolveWorkspaceColorMode("system", false)).toBe("dark");
    expect(resolveWorkspaceColorMode("dark", true)).toBe("dark");
    expect(resolveWorkspaceColorMode("light", false)).toBe("light");
  });
});
