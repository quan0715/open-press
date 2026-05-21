import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReaderDocument } from "../src/openpress/types";

afterEach(() => {
  cleanup();
});

describe("Renderer theme variables", () => {
  it("does not override stylesheet page geometry when document theme is absent", async () => {
    const { Renderer } = await importRenderer();
    const { container } = render(<Renderer document={documentFixture()} />);

    const shell = container.querySelector<HTMLElement>("[data-openpress-public-viewer]");

    expect(shell?.style.getPropertyValue("--openpress-page-width")).toBe("");
    expect(shell?.style.getPropertyValue("--openpress-page-height")).toBe("");
    expect(shell?.style.getPropertyValue("--openpress-page-padding")).toBe("");
  });

  it("applies explicit document page geometry as runtime variables", async () => {
    const { Renderer } = await importRenderer();
    const document = documentFixture({
      theme: {
        pageWidth: "176mm",
        pageHeight: "250mm",
        pagePadding: "16mm",
      },
    });

    const { container } = render(<Renderer document={document} />);

    const shell = container.querySelector<HTMLElement>("[data-openpress-public-viewer]");

    expect(shell?.style.getPropertyValue("--openpress-page-width")).toBe("176mm");
    expect(shell?.style.getPropertyValue("--openpress-page-height")).toBe("250mm");
    expect(shell?.style.getPropertyValue("--openpress-page-padding")).toBe("16mm");
  });
});

async function importRenderer() {
  vi.stubGlobal("__OPENPRESS_CONTENT_PATH__", "document/chapters");
  vi.stubGlobal("__OPENPRESS_MEDIA_PATH__", "document/media");
  vi.stubGlobal("__OPENPRESS_COMPONENTS_PATH__", "document/components");
  vi.stubGlobal("__OPENPRESS_PDF_HREF__", "/document.pdf");
  return import("../src/openpress/renderer");
}

function documentFixture(overrides: Partial<ReaderDocument> = {}): ReaderDocument {
  return {
    meta: { title: "Renderer Fixture" },
    blocks: [{
      id: "page-01",
      kind: "htmlPage",
      title: "Page 1",
      pageNumber: 1,
      anchors: ["page-01"],
      html: '<section class="reader-page reader-page--content" data-page-kind="content"><div class="page-frame"><main class="page-body"><h2 id="page-01">Page 1</h2></main></div></section>',
    }],
    ...overrides,
  };
}
