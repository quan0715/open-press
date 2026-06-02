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

  it("uses slide thumbnails and opens the presentation route for slide Press documents", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, comments: [] }),
    }));
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    window.history.replaceState(null, "", "/slide/preview#page-01");
    const { OpenPressRuntime } = await importOpenPressRuntime();
    const onOpenPresentation = vi.fn();

    const { container } = render(<OpenPressRuntime document={documentFixture({
      meta: { title: "Slide Fixture", type: "slides" },
      blocks: [
        {
          id: "page-01",
          kind: "htmlPage",
          title: "Cover",
          pageNumber: 1,
          anchors: ["page-01"],
          html: '<section class="reader-page" data-page-kind="content"><div class="page-frame"><h2 id="page-01">Cover heading</h2></div></section>',
        },
        {
          id: "page-02",
          kind: "htmlPage",
          title: "Agenda",
          pageNumber: 2,
          anchors: ["page-02"],
          html: '<section class="reader-page" data-page-kind="content"><div class="page-frame"><h2 id="page-02">Agenda heading</h2></div></section>',
        },
      ],
    })} onOpenPresentation={onOpenPresentation} />);

    const shell = container.querySelector<HTMLElement>("[data-openpress-workbench-shell]");
    const presentButton = container.querySelector<HTMLButtonElement>("[data-openpress-slide-present]");

    expect(container.querySelector("#openpress-thumbnails")).toBeTruthy();
    expect(container.querySelector("#openpress-bookmarks")).toBeNull();
    expect(presentButton).toBeTruthy();
    expect(shell?.dataset.openpressPressType).toBe("slides");
    expect(shell?.dataset.openpressPresentationMode).toBe("off");

    fireEvent.click(presentButton as HTMLButtonElement);

    expect(onOpenPresentation).toHaveBeenCalledWith(0);
    expect(shell?.dataset.openpressPresentationMode).toBe("off");
    expect(presentButton?.getAttribute("aria-pressed")).toBe("false");
  });

  it("renders a slide presentation runtime with click, keyboard, fullscreen, and exit controls", async () => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    window.history.replaceState(null, "", "/slide/present#page-01");
    const { OpenPressRuntime } = await importOpenPressRuntime();
    const onExitPresentation = vi.fn();

    const { container } = render(<OpenPressRuntime
      document={slideDocumentFixture()}
      runtimeMode="present"
      onExitPresentation={onExitPresentation}
    />);

    const presenter = container.querySelector<HTMLElement>("[data-openpress-slide-presenter]");
    const stage = container.querySelector<HTMLElement>("[data-openpress-present-stage]");
    const progress = container.querySelector<HTMLElement>("[data-openpress-present-progress]");

    expect(presenter).toBeTruthy();
    expect(container.querySelector("[data-openpress-workbench-shell]")).toBeNull();
    expect(container.querySelectorAll(".openpress-html-page")).toHaveLength(1);
    expect(container.textContent).toContain("Cover heading");
    expect(container.textContent).not.toContain("Agenda heading");
    expect(progress?.textContent).toContain("01");
    expect(progress?.textContent).toContain("03");
    expect(progress?.dataset.openpressPresentScale).toBe("fit-width");

    fireEvent.click(stage as HTMLElement);
    await waitFor(() => expect(progress?.textContent).toContain("02"));
    expect(container.querySelectorAll(".openpress-html-page")).toHaveLength(1);
    expect(container.textContent).toContain("Agenda heading");
    expect(container.textContent).not.toContain("Cover heading");

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    await waitFor(() => expect(progress?.textContent).toContain("01"));

    fireEvent.keyDown(window, { key: "End" });
    await waitFor(() => expect(progress?.textContent).toContain("03"));

    window.history.replaceState(null, "", "/slide/present#page-02");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    await waitFor(() => expect(progress?.textContent).toContain("02"));

    // Esc never navigates out of the presenter — even outside of
    // fullscreen the keystroke is a no-op. The HUD's exit button is
    // the explicit way to leave.
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onExitPresentation).not.toHaveBeenCalled();

    const exitButton = container.querySelector<HTMLButtonElement>("[data-openpress-present-exit]");
    fireEvent.click(exitButton as HTMLButtonElement);
    expect(onExitPresentation).toHaveBeenCalledWith(1);
  });

  it("switches slide presentation chrome into immersive fullscreen mode", async () => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    window.history.replaceState(null, "", "/slide/present#page-01");
    const { OpenPressRuntime } = await importOpenPressRuntime();

    const { container } = render(<OpenPressRuntime
      document={slideDocumentFixture()}
      runtimeMode="present"
    />);

    const presenter = container.querySelector<HTMLElement>("[data-openpress-slide-presenter]");
    const stage = container.querySelector<HTMLElement>(".reader-stage");
    const fullscreenButton = container.querySelector<HTMLButtonElement>("[data-openpress-present-fullscreen]");

    expect(presenter?.dataset.openpressPresentUi).toBe("chrome");

    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null,
    });
    Object.defineProperty(stage as HTMLElement, "requestFullscreen", {
      configurable: true,
      value: vi.fn(async () => {
        Object.defineProperty(document, "fullscreenElement", {
          configurable: true,
          value: stage,
        });
        document.dispatchEvent(new Event("fullscreenchange"));
      }),
    });

    fireEvent.click(fullscreenButton as HTMLButtonElement);

    await waitFor(() => expect(presenter?.dataset.openpressPresentUi).toBe("immersive"));

    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null,
    });
    document.dispatchEvent(new Event("fullscreenchange"));

    await waitFor(() => expect(presenter?.dataset.openpressPresentUi).toBe("chrome"));
  });

  it("never navigates out of slide presentation from Esc, even after exiting fullscreen", async () => {
    // Regression for the "Esc in fullscreen drops me into a stale legacy
    // public-viewer with a leftover FAB" bug. The browser handles the Esc
    // natively to exit fullscreen; the same keystroke is still delivered
    // to our keydown handler. The previous behavior of calling
    // onExitPresentation from that fallthrough is racy (route memos in
    // OpenPressRuntime might be stale) and surprising — the chrome HUD
    // already exposes an explicit close button. Esc should only ever exit
    // fullscreen and leave the presenter visible in chrome mode.
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    window.history.replaceState(null, "", "/slide/present#page-01");
    const onExitPresentation = vi.fn();
    const { OpenPressRuntime } = await importOpenPressRuntime();

    const { container } = render(<OpenPressRuntime
      document={slideDocumentFixture()}
      runtimeMode="present"
      onExitPresentation={onExitPresentation}
    />);

    const presenter = container.querySelector<HTMLElement>("[data-openpress-slide-presenter]");
    const stage = container.querySelector<HTMLElement>(".reader-stage");

    // Enter fullscreen via state + event (skip the click path; we just
    // need to land in immersive mode).
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: stage,
    });
    document.dispatchEvent(new Event("fullscreenchange"));
    await waitFor(() => expect(presenter?.dataset.openpressPresentUi).toBe("immersive"));

    // Browser's Esc-to-exit: fullscreenchange fires, then the keydown
    // arrives at our handler. Neither path should call onExitPresentation.
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null,
    });
    document.dispatchEvent(new Event("fullscreenchange"));
    fireEvent.keyDown(window, { key: "Escape" });

    expect(onExitPresentation).not.toHaveBeenCalled();
    await waitFor(() => expect(presenter?.dataset.openpressPresentUi).toBe("chrome"));

    // Esc fired again from chrome mode is still a no-op. The exit
    // button stays the only way out.
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onExitPresentation).not.toHaveBeenCalled();
  });

  it("re-evaluates workspaceMode when client-side navigation changes the route", async () => {
    // OpenPressRuntime used to memoize workspaceMode / printMode with
    // [] deps, so a SPA navigation from /slide/present -> /slide/preview
    // (the exit-presentation flow) kept the stale workspaceMode=false
    // from mount and rendered PublicViewer (legacy FAB) instead of the
    // workbench. The route-version hook should re-evaluate them when
    // pushState / popstate / hashchange fires.
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, comments: [] }),
    }));
    window.history.replaceState(null, "", "/slide/present#page-01");
    const { OpenPressRuntime } = await importOpenPressRuntime();

    const { container, rerender } = render(<OpenPressRuntime
      document={slideDocumentFixture()}
      runtimeMode="present"
    />);

    expect(container.querySelector("[data-openpress-slide-presenter]")).toBeTruthy();
    expect(container.querySelector("[data-openpress-workbench-shell]")).toBeNull();

    // Simulate the OpenPressApp exit-presentation flow: pushState +
    // re-render with the new runtimeMode prop.
    window.history.pushState({}, "", "/slide/preview");
    rerender(<OpenPressRuntime
      document={slideDocumentFixture()}
      runtimeMode="preview"
    />);

    await waitFor(() => expect(container.querySelector("[data-openpress-workbench-shell]")).toBeTruthy());
    expect(container.querySelector("[data-openpress-slide-presenter]")).toBeNull();
    expect(container.querySelector(".openpress-public-fab")).toBeNull();
  });

  it("starts slide presentation in immersive mode when fullscreen is requested", async () => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null,
    });
    const requestFullscreen = vi.fn(async function requestFullscreen(this: HTMLElement) {
      Object.defineProperty(document, "fullscreenElement", {
        configurable: true,
        value: this,
      });
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      value: requestFullscreen,
    });
    window.history.replaceState(null, "", "/slide/present?fullscreen=1#page-01");
    const { OpenPressRuntime } = await importOpenPressRuntime();

    const { container } = render(<OpenPressRuntime
      document={slideDocumentFixture()}
      runtimeMode="present"
    />);

    const presenter = container.querySelector<HTMLElement>("[data-openpress-slide-presenter]");

    expect(presenter?.dataset.openpressPresentUi).toBe("immersive");
    await waitFor(() => expect(requestFullscreen).toHaveBeenCalled());
  });

  it("resolves /<press>/present as the slide presentation route", async () => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    window.history.replaceState(null, "", "/slide/present#page-02");
    const document = slideDocumentFixture();
    const manifest = {
      presses: [{
        slug: "slide",
        title: "Slide Fixture",
        documentUrl: "/openpress/slide/document.json",
        pageCount: 3,
        page: "slide-16-9",
        type: "slides",
      }],
    };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/openpress/workspace.json") return jsonResponse(manifest);
      if (url === "/openpress/slide/document.json") return jsonResponse(document);
      if (url === "/__openpress/status" || url === "/openpress/deploy.json") {
        return jsonResponse({ deploy_configured: false });
      }
      return { ok: false, status: 404, json: async () => ({}) };
    }));
    const { OpenPressApp } = await importOpenPressRuntime();

    const { container } = render(<OpenPressApp />);

    await waitFor(() => expect(container.querySelector("[data-openpress-slide-presenter]")).toBeTruthy());
    const progress = container.querySelector<HTMLElement>("[data-openpress-present-progress]");
    expect(progress?.textContent).toContain("02");
  });

  it("opens slide presentation in a new fullscreen-requested tab from the workspace", async () => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    window.history.replaceState(null, "", "/slide/preview#page-02");
    const document = slideDocumentFixture();
    const manifest = {
      presses: [{
        slug: "slide",
        title: "Slide Fixture",
        documentUrl: "/openpress/slide/document.json",
        pageCount: 3,
        page: "slide-16-9",
        type: "slides",
      }],
    };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/openpress/workspace.json") return jsonResponse(manifest);
      if (url === "/openpress/slide/document.json") return jsonResponse(document);
      if (url === "/__openpress/status" || url === "/openpress/deploy.json") {
        return jsonResponse({ deploy_configured: false });
      }
      if (url === "/__openpress/comment") return jsonResponse({ ok: true, comments: [] });
      return { ok: false, status: 404, json: async () => ({}) };
    }));
    const openWindow = vi.spyOn(window, "open").mockImplementation(() => null);
    const { OpenPressApp } = await importOpenPressRuntime();

    const { container } = render(<OpenPressApp />);

    await waitFor(() => expect(container.querySelector("[data-openpress-slide-present]")).toBeTruthy());
    fireEvent.click(container.querySelector<HTMLButtonElement>("[data-openpress-slide-present]") as HTMLButtonElement);

    expect(openWindow).toHaveBeenCalledWith(
      "/slide/present?fullscreen=1#page-02",
      "_blank",
      "noopener,noreferrer",
    );
    expect(window.location.pathname).toBe("/slide/preview");
    expect(window.location.hash).toBe("#page-02");
    expect(container.querySelector("[data-openpress-workbench-shell]")).toBeTruthy();
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

function slideDocumentFixture(): ReaderDocument {
  return documentFixture({
    meta: { title: "Slide Fixture", type: "slides" },
    theme: {
      pageWidth: "1920px",
      pageHeight: "1080px",
      pageAspectRatio: "16 / 9",
      pageHeightRatio: "0.5625",
    },
    blocks: [
      {
        id: "page-01",
        kind: "htmlPage",
        title: "Cover",
        pageNumber: 1,
        anchors: ["page-01"],
        html: '<section class="reader-page" data-page-kind="content"><div class="page-frame"><h2 id="page-01">Cover heading</h2></div></section>',
      },
      {
        id: "page-02",
        kind: "htmlPage",
        title: "Agenda",
        pageNumber: 2,
        anchors: ["page-02"],
        html: '<section class="reader-page" data-page-kind="content"><div class="page-frame"><h2 id="page-02">Agenda heading</h2></div></section>',
      },
      {
        id: "page-03",
        kind: "htmlPage",
        title: "Close",
        pageNumber: 3,
        anchors: ["page-03"],
        html: '<section class="reader-page" data-page-kind="content"><div class="page-frame"><h2 id="page-03">Close heading</h2></div></section>',
      },
    ],
  });
}

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}
