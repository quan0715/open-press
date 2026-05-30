import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReaderDocument } from "../src/openpress/document-model";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("OpenPressRuntime theme variables", () => {
  it("does not override stylesheet page geometry when document theme is absent", async () => {
    const { OpenPressRuntime } = await importOpenPressRuntime();
    const { container } = render(<OpenPressRuntime document={documentFixture()} />);

    const shell = container.querySelector<HTMLElement>("[data-openpress-public-viewer]");

    expect(shell?.style.getPropertyValue("--openpress-page-width")).toBe("");
    expect(shell?.style.getPropertyValue("--openpress-page-height")).toBe("");
    expect(shell?.style.getPropertyValue("--openpress-page-padding")).toBe("");
  });

  it("applies explicit document page geometry as runtime variables", async () => {
    const { OpenPressRuntime } = await importOpenPressRuntime();
    const document = documentFixture({
      theme: {
        pageWidth: "176mm",
        pageHeight: "250mm",
        pageAspectRatio: "176 / 250",
        pageHeightRatio: "1.420455",
        pagePadding: "16mm",
      },
    });

    const { container } = render(<OpenPressRuntime document={document} />);

    const shell = container.querySelector<HTMLElement>("[data-openpress-public-viewer]");

    expect(shell?.style.getPropertyValue("--openpress-page-width")).toBe("176mm");
    expect(shell?.style.getPropertyValue("--openpress-page-height")).toBe("250mm");
    expect(shell?.style.getPropertyValue("--openpress-page-aspect-ratio")).toBe("176 / 250");
    expect(shell?.style.getPropertyValue("--openpress-page-height-ratio")).toBe("1.420455");
    expect(shell?.style.getPropertyValue("--openpress-page-padding")).toBe("16mm");
  });

  it("does not render a public preview route action in workspace mode", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, comments: [] }),
    }));
    window.history.replaceState(null, "", "/workspace#page-01");
    const { OpenPressRuntime } = await importOpenPressRuntime();

    const { container } = render(<OpenPressRuntime document={documentFixture()} />);

    expect(container.querySelector("[data-openpress-workbench-toolbar]")).toBeTruthy();
    expect(container.querySelector("[data-openpress-open-public-preview]")).toBeNull();
    expect(container.querySelector(".openpress-public-preview-link")).toBeNull();
  });

  it("keeps document editing resident in workspace mode", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, comments: [] }),
    }));
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    window.history.replaceState(null, "", "/workspace#page-01");
    const { OpenPressRuntime } = await importOpenPressRuntime();

    const { container } = render(<OpenPressRuntime document={documentFixture({
      source: {
        type: "openpress-press-tree-mdx",
        blockMap: {
          "b-heading": {
            id: "b-heading",
            kind: "element",
            name: "h2",
            path: "chapters/01-intro/content/01-start.mdx",
            source: { line: 1, column: 1, endLine: 1, endColumn: 9 },
          },
        },
      },
      blocks: [{
        id: "page-01",
        kind: "htmlPage",
        title: "Page 1",
        pageNumber: 1,
        anchors: ["page-01"],
        html: '<section class="reader-page reader-page--content" data-page-kind="content"><div class="page-frame"><main class="page-body"><h2 data-openpress-block-id="b-heading" id="page-01">Page 1</h2></main></div></section>',
      }],
    })} />);

    const shell = container.querySelector<HTMLElement>("[data-openpress-workbench-shell]");
    const heading = container.querySelector<HTMLElement>("[data-openpress-block-id='b-heading']");

    expect(shell?.dataset.openpressEditMode).toBe("on");
    expect(container.querySelector("[data-openpress-edit-toggle]")).toBeNull();
    await waitFor(() => expect(heading?.getAttribute("contenteditable")).toBe("true"));
  });

  it("keeps paged layout mode on narrow viewports so pages scale instead of reflowing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, comments: [] }),
    }));
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 320,
    });
    window.history.replaceState(null, "", "/workspace#page-01");
    const { OpenPressRuntime } = await importOpenPressRuntime();

    const { container } = render(<OpenPressRuntime document={documentFixture()} />);

    const shell = container.querySelector<HTMLElement>("[data-openpress-workbench-shell]");
    expect(shell?.dataset.openpressViewMode).toBe("paged");
  });

  it("exposes a page zoom control backed by the viewport scale model", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, comments: [] }),
    }));
    window.history.replaceState(null, "", "/workspace#page-01");
    const { OpenPressRuntime } = await importOpenPressRuntime();

    const { container } = render(<OpenPressRuntime document={documentFixture()} />);

    const zoomControl = container.querySelector<HTMLButtonElement>("[data-openpress-page-zoom]");
    expect(zoomControl).toBeTruthy();
    expect(zoomControl?.dataset.openpressScaleMode).toBe("fit-width");
    expect(zoomControl?.getAttribute("aria-haspopup")).toBe("menu");

    fireEvent.click(zoomControl as HTMLButtonElement);
    const menu = container.querySelector<HTMLElement>("[data-openpress-page-zoom-menu]");
    expect(menu).toBeTruthy();
    expect(menu?.textContent).toContain("雙頁");
    expect(menu?.textContent).toContain("符合頁面寬度");

    const scale150 = Array.from(container.querySelectorAll<HTMLButtonElement>("[data-openpress-zoom-option]"))
      .find((option) => option.dataset.openpressZoomOption === "scale-150");
    expect(scale150).toBeTruthy();
    fireEvent.click(scale150 as HTMLButtonElement);
    expect(zoomControl?.dataset.openpressScaleMode).toBe("scale-150");
    expect(zoomControl?.textContent).toContain("150%");

    fireEvent.click(zoomControl as HTMLButtonElement);
    const singlePage = container.querySelector<HTMLButtonElement>("[data-openpress-page-layout-option='single']");
    const spreadPage = container.querySelector<HTMLButtonElement>("[data-openpress-page-layout-option='spread']");
    expect(singlePage?.getAttribute("aria-checked")).toBe("true");
    expect(spreadPage?.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(spreadPage as HTMLButtonElement);

    const pageContainer = container.querySelector<HTMLElement>("[data-openpress-public-page]");
    expect(pageContainer?.dataset.openpressPageLayout).toBe("spread");
    fireEvent.click(zoomControl as HTMLButtonElement);
    expect(container.querySelector<HTMLButtonElement>("[data-openpress-page-layout-option='spread']")?.getAttribute("aria-checked")).toBe("true");
  });

  it("renders spread layout data when double-page mode is selected", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, comments: [] }),
    }));
    window.history.replaceState(null, "", "/workspace#page-01");
    const { OpenPressRuntime } = await importOpenPressRuntime();

    const { container } = render(<OpenPressRuntime document={documentFixture({
      blocks: [
        {
          id: "page-01",
          kind: "htmlPage",
          title: "Page 1",
          pageNumber: 1,
          anchors: ["page-01"],
          html: '<section class="reader-page reader-page--content" data-page-kind="content"><div class="page-frame"><main class="page-body"><h2 id="page-01">Page 1</h2></main></div></section>',
        },
        {
          id: "page-02",
          kind: "htmlPage",
          title: "Page 2",
          pageNumber: 2,
          anchors: ["page-02"],
          html: '<section class="reader-page reader-page--content" data-page-kind="content"><div class="page-frame"><main class="page-body"><h2 id="page-02">Page 2</h2></main></div></section>',
        },
      ],
    })} />);

    const zoomControl = container.querySelector<HTMLButtonElement>("[data-openpress-page-zoom]");
    fireEvent.click(zoomControl as HTMLButtonElement);
    fireEvent.click(container.querySelector<HTMLButtonElement>("[data-openpress-page-layout-option='spread']") as HTMLButtonElement);

    const pageContainer = container.querySelector<HTMLElement>("[data-openpress-public-page]");
    const pages = Array.from(container.querySelectorAll<HTMLElement>(".openpress-html-page"));

    expect(pageContainer?.dataset.openpressPageLayout).toBe("spread");
    expect(pages).toHaveLength(2);
    expect(pages[0]?.dataset.openpressPageSpreadSide).toBe("left");
    expect(pages[1]?.dataset.openpressPageSpreadSide).toBe("right");

    fireEvent.click(zoomControl as HTMLButtonElement);
    const scale100 = container.querySelector<HTMLButtonElement>("[data-openpress-zoom-option='scale-100']");
    fireEvent.click(scale100 as HTMLButtonElement);
    expect(zoomControl?.textContent).toContain("100%");
  });
});

async function importOpenPressRuntime() {
  vi.stubGlobal("__OPENPRESS_CONTENT_PATH__", "document/chapters");
  vi.stubGlobal("__OPENPRESS_MEDIA_PATH__", "document/media");
  vi.stubGlobal("__OPENPRESS_COMPONENTS_PATH__", "document/components");
  vi.stubGlobal("__OPENPRESS_PDF_HREF__", "/document.pdf");
  return import("../src/openpress/app");
}

function documentFixture(overrides: Partial<ReaderDocument> = {}): ReaderDocument {
  return {
    meta: { title: "OpenPress Runtime Fixture" },
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
