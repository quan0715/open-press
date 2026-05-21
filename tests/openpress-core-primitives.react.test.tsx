import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  BaseBackCoverPage,
  BaseCallout,
  BaseCoverPage,
  BaseFigure,
  BaseReportPage,
  BaseTocPage,
} from "../src/openpress/core";
import type { PageProps } from "../src/openpress/core";

afterEach(() => {
  cleanup();
});

describe("@openpress/core BaseX primitives", () => {
  it("renders page primitives as reader page sections with page metadata", () => {
    const reportProps = {
      pageIndex: 2,
      totalPages: 12,
      chapterSlug: "linked-list",
      chapterTone: "mint",
      children: "Report body",
    } satisfies PageProps;

    render(
      <>
        <BaseCoverPage>Cover body</BaseCoverPage>
        <BaseTocPage>TOC body</BaseTocPage>
        <BaseReportPage {...reportProps} />
        <BaseBackCoverPage>Back cover body</BaseBackCoverPage>
      </>,
    );

    const cover = screen.getByText("Cover body").closest("section");
    const toc = screen.getByText("TOC body").closest("section");
    const report = screen.getByText("Report body").closest("section");
    const backCover = screen.getByText("Back cover body").closest("section");

    expect(cover?.classList.contains("reader-page")).toBe(true);
    expect(cover?.getAttribute("data-page-kind")).toBe("cover");
    expect(cover?.getAttribute("data-page-footer")).toBe("false");

    expect(toc?.classList.contains("reader-page")).toBe(true);
    expect(toc?.getAttribute("data-page-kind")).toBe("toc");
    expect(toc?.getAttribute("data-page-footer")).toBe("false");

    expect(report?.classList.contains("reader-page")).toBe(true);
    expect(report?.getAttribute("data-page-kind")).toBe("report");
    expect(report?.getAttribute("data-page-footer")).toBe("true");
    expect(report?.getAttribute("data-page-index")).toBe("2");
    expect(report?.getAttribute("data-total-pages")).toBe("12");
    expect(report?.getAttribute("data-chapter-slug")).toBe("linked-list");
    expect(report?.getAttribute("data-chapter-tone")).toBe("mint");

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
