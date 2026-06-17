import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { defineTheme, ThemeColorSwatches, ThemeTypographyGraph, themeToCssText } from "../src/openpress/theme";

afterEach(() => cleanup());

describe("OpenPress theme authoring API", () => {
  it("normalizes color and typography tokens into CSS variables", () => {
    const theme = defineTheme({
      name: "Source Deck",
      colors: {
        bg: "#fcf7e9",
        ink: { value: "#16161d", label: "Ink" },
        accent: "#d42a20",
      },
      fonts: {
        body: "Source Sans Pro, sans-serif",
        serif: "Source Serif Pro, serif",
      },
      typography: {
        title: { font: "serif", size: 72, lineHeight: 1.12, weight: 400, color: "ink" },
        body: { size: "36px", lineHeight: 1.48, color: "ink" },
      },
    });

    expect(theme.name).toBe("Source Deck");
    expect(theme.colors.bg.cssVar).toBe("--op-theme-color-bg");
    expect(theme.cssVars["--op-theme-color-accent"]).toBe("#d42a20");
    expect(theme.typography.title.fontFamily).toBe("Source Serif Pro, serif");
    expect(theme.typography.title.color).toBe("var(--op-theme-color-ink)");
    expect(theme.cssVars["--op-theme-type-title-font-size"]).toBe("72px");
    expect(theme.cssVars["--op-theme-type-body-line-height"]).toBe("1.48");
    expect(themeToCssText(theme, ".deck")).toContain(".deck");
  });

  it("renders color swatches and typography graph from the same theme object", () => {
    const theme = defineTheme({
      colors: {
        bg: "#ffffff",
        ink: "#111111",
      },
      typography: {
        title: { label: "Title", size: 48, lineHeight: 1.1, sample: "Theme sample" },
      },
    });

    render(
      <>
        <ThemeColorSwatches theme={theme} />
        <ThemeTypographyGraph theme={theme} />
      </>,
    );

    expect(screen.getByText("Theme color tokens")).toBeTruthy();
    expect(screen.getByText("Bg")).toBeTruthy();
    expect(screen.getByText("#ffffff")).toBeTruthy();
    expect(screen.getByText("Type graph")).toBeTruthy();
    expect(screen.getByText("Theme sample")).toBeTruthy();
  });
});
