import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ImageFigure, MediaFigure, PressContext } from "../src/openpress/core";
import { DefaultSectionPage, Sections } from "../src/openpress/manuscript";

afterEach(() => cleanup());

describe("MediaFigure", () => {
  it("prefixes document media filenames and keeps absolute URLs unchanged", () => {
    render(
      <div>
        <MediaFigure src="math-code-visualization.png" alt="Math and code" caption="Math code layout" />
        <ImageFigure src="/custom/image.png" alt="Custom" caption="Custom image" />
      </div>,
    );

    expect(screen.getByAltText("Math and code").getAttribute("src")).toBe("/openpress/media/math-code-visualization.png");
    expect(screen.getByAltText("Math and code").getAttribute("loading")).toBe("eager");
    expect(screen.getByText("Math code layout").tagName.toLowerCase()).toBe("figcaption");
    expect(screen.getByAltText("Custom").getAttribute("src")).toBe("/custom/image.png");
  });
});

describe("Sections default page", () => {
  it("renders Frame and MdxArea through the default page", () => {
    render(
      <PressContext.Provider
        value={{
          sources: {
            story: {
              id: "story",
              type: "mdx",
              tree: [{ id: "intro", slug: "intro", title: "Intro" }],
              outline: [],
              chains: { "story:intro": [] },
              files: [],
            },
          },
          allocation: {
            "story:intro:content:0": {
              "story:intro": [<p key="body">Intro body</p>],
            },
          },
          hints: { totalPagesPerChain: { "story:intro": 1 } },
          toc: null,
        }}
      >
        <Sections source="story" />
      </PressContext.Provider>,
    );

    expect(typeof DefaultSectionPage).toBe("function");
    expect(screen.getByText("Intro body")).toBeTruthy();
    const page = screen.getByText("Intro body").closest("section");
    expect(page?.dataset.openpressFrameKey).toBe("story:intro:content:0");
    expect(page?.dataset.frameRole).toBe("manuscript.content");
  });
});
