import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ImageFigure, MediaFigure, PageFolio, PressContext, Slide } from "../src/openpress/core";
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

describe("PageFolio", () => {
  it("renders slash placeholders with stable styling hooks", () => {
    render(<PageFolio variant="slash" currentFormat="2-digit" totalFormat="plain" className="slide-folio" />);

    const folio = screen.getByLabelText("Page number and total pages");
    expect(folio.className).toContain("openpress-page-folio");
    expect(folio.className).toContain("openpress-page-folio--slash");
    expect(folio.className).toContain("slide-folio");
    expect(folio.getAttribute("data-openpress-page-folio")).toBe("true");
    expect(folio.getAttribute("data-openpress-page-folio-current-format")).toBe("2-digit");
    expect(folio.querySelector("[data-openpress-page-folio-current='true']")?.textContent).toBe("00");
    expect(folio.querySelector("[data-openpress-page-folio-separator-text='true']")?.textContent).toBe("/");
    expect(folio.querySelector("[data-openpress-page-folio-total='true']")?.textContent).toBe("0");
  });

  it("renders prefixed placeholders for slide footer variants", () => {
    render(<PageFolio variant="prefix" prefix="p " currentFormat="plain" />);

    const folio = screen.getByLabelText("Page number");
    expect(folio.className).toContain("openpress-page-folio--prefix");
    expect(folio.querySelector("[data-openpress-page-folio-prefix-text='true']")?.textContent).toBe("p ");
    expect(folio.querySelector("[data-openpress-page-folio-current='true']")?.textContent).toBe("0");
  });
});

describe("Slide", () => {
  it("maps author-facing id to a chrome-free canvas Frame", () => {
    render(
      <Slide id="agenda" className="deck-slide">
        Agenda body
      </Slide>,
    );

    const slide = screen.getByText("Agenda body").closest("section");
    expect(slide?.dataset.openpressFrameKey).toBe("agenda");
    expect(slide?.dataset.frameRole).toBe("canvas.slide");
    expect(slide?.dataset.frameChrome).toBe("false");
    expect(slide?.hasAttribute("data-page-title")).toBe(false);
    expect(slide?.className).toContain("reader-page");
    expect(slide?.className).toContain("deck-slide");
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
