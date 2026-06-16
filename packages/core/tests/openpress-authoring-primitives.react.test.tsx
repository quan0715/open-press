import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  Frame,
  ImageFigure,
  Media,
  MediaCaption,
  MediaFigure,
  MediaObject,
  PageFolio,
  PressContext,
  Slide,
} from "../src/openpress/core";
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

describe("Frame auto layout", () => {
  it("keeps default Frame output unchanged when layout is omitted", () => {
    render(<Frame frameKey="plain">Plain frame</Frame>);

    const frame = screen.getByText("Plain frame").closest("section");
    expect(frame?.classList.contains("reader-page")).toBe(true);
    expect(frame?.classList.contains("openpress-frame-layout")).toBe(false);
    expect(frame?.dataset.openpressLayoutMode).toBe(undefined);
  });

  it("emits stack layout hooks and Figma-like sizing variables", () => {
    render(
      <Frame
        frameKey="stack"
        layout={{
          mode: "stack",
          direction: "horizontal",
          gap: 24,
          padding: 32,
          clip: true,
          width: "fill",
          height: "hug",
        }}
      >
        Stack frame
      </Frame>,
    );

    const frame = screen.getByText("Stack frame").closest("section") as HTMLElement;
    expect(frame.className).toContain("openpress-frame-layout");
    expect(frame.dataset.openpressLayoutMode).toBe("stack");
    expect(frame.dataset.openpressLayoutDirection).toBe("horizontal");
    expect(frame.dataset.openpressLayoutClip).toBe("true");
    expect(frame.dataset.openpressLayoutWidth).toBe("fill");
    expect(frame.dataset.openpressLayoutHeight).toBe("hug");
    expect(frame.style.getPropertyValue("--openpress-frame-layout-gap")).toBe("24px");
    expect(frame.style.getPropertyValue("--openpress-frame-layout-padding")).toBe("32px");
    expect(frame.style.getPropertyValue("--openpress-frame-layout-width")).toBe("100%");
    expect(frame.style.getPropertyValue("--openpress-frame-layout-height")).toBe("fit-content");
  });

  it("emits grid layout hooks for numeric columns and nested region Frames", () => {
    render(
      <Frame frameKey="page">
        <Frame
          frameKey="cards"
          layout={{
            mode: "grid",
            columns: 4,
            rows: "auto",
            gap: "1rem",
            width: "min(100%, 960px)",
            height: 480,
          }}
        >
          Grid frame
        </Frame>
      </Frame>,
    );

    const grid = screen.getByText("Grid frame").closest("section") as HTMLElement;
    expect(grid.classList.contains("reader-page")).toBe(false);
    expect(grid.className).toContain("openpress-frame-layout");
    expect(grid.dataset.openpressLayoutMode).toBe("grid");
    expect(grid.style.getPropertyValue("--openpress-frame-layout-columns")).toBe("repeat(4, minmax(0, 1fr))");
    expect(grid.style.getPropertyValue("--openpress-frame-layout-rows")).toBe("auto");
    expect(grid.style.getPropertyValue("--openpress-frame-layout-gap")).toBe("1rem");
    expect(grid.style.getPropertyValue("--openpress-frame-layout-width")).toBe("min(100%, 960px)");
    expect(grid.style.getPropertyValue("--openpress-frame-layout-height")).toBe("480px");
  });
});

describe("Media compound primitives", () => {
  it("renders semantic media object, image, caption, and object metadata", () => {
    render(
      <MediaObject objectId="hero" label="Hero media" className="hero-media">
        <Media src="./hero.png" alt="Hero" ratio="16 / 9" fit="cover" position="50% 20%" />
        <MediaCaption>Generated preview</MediaCaption>
      </MediaObject>,
    );

    const figure = screen.getByText("Generated preview").closest("figure") as HTMLElement;
    const image = screen.getByAltText("Hero") as HTMLImageElement;
    const caption = screen.getByText("Generated preview");

    expect(figure.className).toContain("openpress-media-object");
    expect(figure.className).toContain("hero-media");
    expect(figure.dataset.openpressObjectKind).toBe("media");
    expect(figure.dataset.openpressObjectLabel).toBe("Hero media");
    expect(image.className).toContain("openpress-media");
    expect(image.getAttribute("src")).toBe("/openpress/media/hero.png");
    expect(image.style.getPropertyValue("--openpress-media-ratio")).toBe("16 / 9");
    expect(image.style.getPropertyValue("--openpress-media-fit")).toBe("cover");
    expect(image.style.getPropertyValue("--openpress-media-position")).toBe("50% 20%");
    expect(caption.tagName.toLowerCase()).toBe("figcaption");
    expect(caption.className).toContain("openpress-media-caption");
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
