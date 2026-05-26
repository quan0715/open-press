import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MediaAssetItem } from "../src/openpress/document-model";
import type { ProjectComponentUsage } from "../src/openpress/workbench/project";

afterEach(() => cleanup());

describe("ProjectEntryPanel", () => {
  it("renders project assets without upload or style controls", async () => {
    vi.stubGlobal("__OPENPRESS_CONTENT_PATH__", "content");
    vi.stubGlobal("__OPENPRESS_MEDIA_PATH__", "media");
    vi.stubGlobal("__OPENPRESS_COMPONENTS_PATH__", "components");
    const { ProjectEntryPanel } = await import("../src/openpress/workbench/project");

    render(
      <ProjectEntryPanel
        mediaAssets={[mediaAsset("cover.png")]}
        componentUsages={componentUsages("HeroFigure")}
        mentionItems={[]}
        currentSource={undefined}
      />,
    );

    expect(screen.queryByLabelText("上傳圖片")).toBeNull();
    expect(screen.queryByLabelText("Style tokens")).toBeNull();
    expect(screen.getByLabelText("媒體素材")).toBeTruthy();
    expect(screen.getByLabelText("Components")).toBeTruthy();
    expect(screen.getByRole("button", { name: "cover.png" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "HeroFigure" })).toBeTruthy();
  });
});

function mediaAsset(fileName: string): MediaAssetItem {
  return {
    id: `asset-${fileName}`,
    kind: "image",
    fileName,
    src: `/media/${fileName}`,
    pageIndex: 0,
    sourceTitle: "Cover",
    usageCount: 1,
    references: [{ pageIndex: 0, sourceTitle: "Cover" }],
  };
}

function componentUsages(name: string) {
  return new Map<string, ProjectComponentUsage>([
    [
      name,
      {
        count: 1,
        pageIndexes: [0],
        html: `<figure data-openpress-component="${name}"></figure>`,
        previews: [
          {
            name,
            html: `<figure data-openpress-component="${name}"></figure>`,
            pageIndex: 0,
          },
        ],
      },
    ],
  ]);
}
