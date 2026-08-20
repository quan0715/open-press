import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { workspaceLayoutStyle } from "../src/openpress/shared/themeStyleBoundary";

describe("document theme style boundary", () => {
  it("exposes only page geometry to workspace chrome", () => {
    const documentStyle = {
      "--openpress-page-width": "210mm",
      "--openpress-page-height": "297mm",
      "--openpress-page-aspect-ratio": "210 / 297",
      "--openpress-page-height-ratio": "1.414",
      "--openpress-page-padding": "18mm",
      "--openpress-page-margin": "12mm",
      "--openpress-font-family": "Theme Sans",
      "--openpress-accent": "hotpink",
      "--op-theme-type-body-font-family": "Theme Serif",
      "--op-theme-color-ink": "#123456",
      color: "red",
    };

    expect(workspaceLayoutStyle(documentStyle)).toEqual({
      "--openpress-page-width": "210mm",
      "--openpress-page-height": "297mm",
      "--openpress-page-aspect-ratio": "210 / 297",
      "--openpress-page-height-ratio": "1.414",
      "--openpress-page-padding": "18mm",
      "--openpress-page-margin": "12mm",
    });
    expect(documentStyle["--openpress-font-family"]).toBe("Theme Sans");
  });

  it("keeps framework chrome on workspace-owned font tokens", async () => {
    const chromeFiles = [
      "../src/styles/openpress/workspace.css",
      "../src/openpress/shared/Panel.tsx",
      "../src/openpress/reader/ReaderNavigationPanel.tsx",
      "../src/openpress/reader/PageThumbnailsPanel.tsx",
      "../src/openpress/reader/SlidePublicPage.tsx",
      "../src/openpress/reader/SlidePresentationPage.tsx",
      "../src/openpress/reader/publicViewerClasses.ts",
      "../src/openpress/workbench/toolbarClasses.ts",
      "../src/openpress/workbench/actions/PageZoomDock.tsx",
      "../src/openpress/workbench/document/components/InlineSourceEditorLayer.tsx",
      "../src/openpress/workbench/inspector/CommentReviewDock.tsx",
    ];

    for (const relativePath of chromeFiles) {
      const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
      expect(source, relativePath).not.toContain("var(--openpress-font");
    }

    const inspectorSource = await readFile(
      new URL("../src/openpress/workbench/inspector/CommentReviewDock.tsx", import.meta.url),
      "utf8",
    );
    expect(inspectorSource).not.toContain("var(--openpress-accent");
  });
});
