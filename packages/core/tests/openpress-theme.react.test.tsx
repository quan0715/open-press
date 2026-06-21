import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  defineDocumentTheme,
  defineSlideTheme,
  defineTheme,
  DOCUMENT_THEME_COLOR_ROLES,
  DOCUMENT_THEME_TYPOGRAPHY_ROLES,
  SLIDE_THEME_COLOR_ROLES,
  SLIDE_THEME_TYPOGRAPHY_ROLES,
  ThemeColorSwatches,
  ThemeTypographyGraph,
  themeToCssText,
} from "../src/openpress/theme";

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
    expect(theme.profile).toBe("slide");
    expect(theme.colors.bg.cssVar).toBe("--op-theme-color-bg");
    expect(theme.cssVars["--op-theme-color-accent"]).toBe("#d42a20");
    expect(theme.typography.title.fontFamily).toBe("Source Serif Pro, serif");
    expect(theme.typography.title.color).toBe("var(--op-theme-color-ink)");
    expect(theme.cssVars["--op-theme-type-title-font-size"]).toBe("72px");
    expect(theme.cssVars["--op-theme-type-body-line-height"]).toBe("1.48");
    expect(themeToCssText(theme, ".deck")).toContain(".deck");
  });

  it("ships standard slide roles while allowing overrides and extension tokens", () => {
    const theme = defineSlideTheme({
      colors: {
        marker: "#ff3300",
      },
      typography: {
        eyebrow: { size: 16, lineHeight: 1, weight: 900, tracking: "0.2em", color: "marker" },
      },
      extend: {
        colors: {
          brandGlow: "#ffee88",
        },
        typography: {
          tinyNote: { size: 10, lineHeight: 1.2, color: "muted" },
        },
      },
    });

    expect(SLIDE_THEME_COLOR_ROLES).toContain("marker");
    expect(SLIDE_THEME_TYPOGRAPHY_ROLES).toContain("eyebrow");
    expect(theme.colors.accent).toBeTruthy();
    expect(theme.colors.marker.value).toBe("#ff3300");
    expect(theme.cssVars["--op-theme-color-brand-glow"]).toBe("#ffee88");
    expect(theme.cssVars["--op-theme-type-eyebrow-font-size"]).toBe("16px");
    expect(theme.typography.eyebrow.color).toBe("var(--op-theme-color-marker)");
    expect(theme.typography.tinyNote.color).toBe("var(--op-theme-color-muted)");
  });

  it("ships a document theme profile with document-specific standard roles", () => {
    const theme = defineDocumentTheme({
      colors: {
        accent: "#004e89",
      },
    });

    expect(theme.profile).toBe("document");
    expect(DOCUMENT_THEME_COLOR_ROLES).toContain("paper");
    expect(DOCUMENT_THEME_TYPOGRAPHY_ROLES).toContain("pageNumber");
    expect(theme.colors.paper.cssVar).toBe("--op-theme-color-paper");
    expect(theme.typography.heading.cssVars.fontSize).toBe("--op-theme-type-heading-font-size");
    expect(theme.cssVars["--op-theme-color-accent"]).toBe("#004e89");
  });

  it("can still act as a bare open token registry when requested", () => {
    const theme = defineTheme({
      profile: "bare",
      colors: {
        custom: "#123456",
      },
      typography: {
        label: { size: 12, lineHeight: 1 },
      },
    });

    expect(theme.profile).toBe("bare");
    expect(Object.keys(theme.colors)).toEqual(["custom"]);
    expect(Object.keys(theme.typography)).toEqual(["label"]);
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
    expect(screen.getAllByText("#ffffff").length).toBeGreaterThan(0);
    expect(screen.getByText("Type graph")).toBeTruthy();
    expect(screen.getByText("Theme sample")).toBeTruthy();
  });
});
