import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  BaseBackCoverPage,
  BaseCallout,
  BaseContentPage,
  BaseCoverPage,
  BaseFigure,
  BaseTocPage,
} from "../src/openpress/core";
import type { PageProps } from "../src/openpress/core";

afterEach(() => {
  cleanup();
});

describe("@openpress/core BaseX primitives", () => {
  it("renders page primitives as reader page sections with page metadata", () => {
    const contentProps = {
      pageIndex: 2,
      totalPages: 12,
      chapterSlug: "linked-list",
      chapterTone: "mint",
      children: "Content body",
    } satisfies PageProps;

    render(
      <>
        <BaseCoverPage>Cover body</BaseCoverPage>
        <BaseTocPage>TOC body</BaseTocPage>
        <BaseContentPage {...contentProps} />
        <BaseBackCoverPage>Back cover body</BaseBackCoverPage>
      </>,
    );

    const cover = screen.getByText("Cover body").closest("section");
    const toc = screen.getByText("TOC body").closest("section");
    const content = screen.getByText("Content body").closest("section");
    const backCover = screen.getByText("Back cover body").closest("section");

    expect(cover?.classList.contains("reader-page")).toBe(true);
    expect(cover?.getAttribute("data-page-kind")).toBe("cover");
    expect(cover?.getAttribute("data-page-footer")).toBe("false");

    expect(toc?.classList.contains("reader-page")).toBe(true);
    expect(toc?.getAttribute("data-page-kind")).toBe("toc");
    expect(toc?.getAttribute("data-page-footer")).toBe("false");

    expect(content?.classList.contains("reader-page")).toBe(true);
    expect(content?.classList.contains("reader-page--content")).toBe(true);
    expect(content?.getAttribute("data-page-kind")).toBe("content");
    expect(content?.getAttribute("data-page-footer")).toBe("true");
    expect(content?.getAttribute("data-page-index")).toBe("2");
    expect(content?.getAttribute("data-total-pages")).toBe("12");
    expect(content?.getAttribute("data-chapter-slug")).toBe("linked-list");
    expect(content?.getAttribute("data-chapter-tone")).toBe("mint");

    expect(backCover?.classList.contains("reader-page")).toBe(true);
    expect(backCover?.getAttribute("data-page-kind")).toBe("back-cover");
    expect(backCover?.getAttribute("data-page-footer")).toBe("false");
  });

  it("wraps figure children in a body area and renders captions outside that body", () => {
    render(
      <BaseFigure caption="Pointer diagram">
        <div>Diagram body</div>
      </BaseFigure>,
    );

    const figure = screen.getByText("Diagram body").closest("figure");
    expect(figure).not.toBeNull();

    const body = figure?.querySelector("[data-figure-body]");
    const caption = within(figure as HTMLElement).getByText("Pointer diagram");

    expect(body?.contains(screen.getByText("Diagram body"))).toBe(true);
    expect(caption.tagName).toBe("FIGCAPTION");
    expect(caption.parentElement).toBe(figure);
    expect(body?.contains(caption)).toBe(false);
  });

  it("omits figcaption when BaseFigure receives no caption", () => {
    render(
      <BaseFigure>
        <div>Uncaptioned body</div>
      </BaseFigure>,
    );

    const figure = screen.getByText("Uncaptioned body").closest("figure");

    expect(figure?.querySelector("figcaption")).toBeNull();
  });

  it("renders callouts as block elements with callout kind metadata", () => {
    render(<BaseCallout kind="warn">Check the pointer update order.</BaseCallout>);

    const callout = screen.getByText("Check the pointer update order.").closest("[data-callout-kind]");

    expect(callout?.tagName).toBe("ASIDE");
    expect(callout?.getAttribute("data-callout-kind")).toBe("warn");
  });
});
