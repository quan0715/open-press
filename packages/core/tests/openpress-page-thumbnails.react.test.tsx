import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PageThumbnails } from "../src/openpress/reader";
import type { HtmlPageBlock } from "../src/openpress/document-model";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PageThumbnails", () => {
  it("keeps the active thumbnail inside the scrollable list", () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    const pages = Array.from({ length: 5 }, (_, index) => pageFixture(index));
    const { rerender } = render(
      <PageThumbnails
        pages={pages}
        currentPageIndex={0}
        onSelectPage={() => undefined}
        theme={{ pageWidth: "1920px", pageHeight: "1080px" }}
      />,
    );
    scrollIntoView.mockClear();

    rerender(
      <PageThumbnails
        pages={pages}
        currentPageIndex={4}
        onSelectPage={() => undefined}
        theme={{ pageWidth: "1920px", pageHeight: "1080px" }}
      />,
    );

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
  });
});

function pageFixture(index: number): HtmlPageBlock {
  const pageNumber = index + 1;
  return {
    id: `page-${String(pageNumber).padStart(2, "0")}`,
    kind: "htmlPage",
    title: `Page ${pageNumber}`,
    pageNumber,
    anchors: [],
    html: `<section><h1>Page ${pageNumber}</h1></section>`,
  };
}
