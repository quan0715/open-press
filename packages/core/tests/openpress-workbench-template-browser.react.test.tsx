import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HtmlPageBlock, ReaderDocument } from "../src/openpress/document-model";

afterEach(() => {
  cleanup();
  window.location.hash = "";
  window.localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("HtmlWorkbench template browser", () => {
  it("persists workspace panel open state per slide press", async () => {
    vi.stubGlobal("__OPENPRESS_CONTENT_PATH__", "document/chapters");
    vi.stubGlobal("__OPENPRESS_MEDIA_PATH__", "document/media");
    vi.stubGlobal("__OPENPRESS_COMPONENTS_PATH__", "document/components");
    const { HtmlWorkbench } = await import("../src/openpress/workbench");
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      disconnect() {}
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    }));

    const props = {
      document: documentFixture(),
      pages: [pageFixture()],
      style: {},
      workspaceMode: true,
      deploymentInfo: { online: false },
      pressSlug: "slide",
    } as const;
    const { unmount } = render(<HtmlWorkbench {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "展開左側面板" }));
    fireEvent.click(screen.getByRole("button", { name: "展開右側面板" }));
    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem("openpress:workspace:panels:slides:slide") ?? "{}")).toMatchObject({
        leftPanelOpen: true,
        rightPanelOpen: true,
      });
    });

    unmount();
    render(<HtmlWorkbench {...props} />);

    expect(screen.getByRole("button", { name: "收合左側面板" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "收合右側面板" })).toBeTruthy();
  });

  it("switches the left panel to templates, previews the selected template, and adds it", async () => {
    vi.stubGlobal("__OPENPRESS_CONTENT_PATH__", "document/chapters");
    vi.stubGlobal("__OPENPRESS_MEDIA_PATH__", "document/media");
    vi.stubGlobal("__OPENPRESS_COMPONENTS_PATH__", "document/components");
    const { HtmlWorkbench } = await import("../src/openpress/workbench");
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      disconnect() {}
    });
    const fetchEdit = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, slide: { id: "split-media-2" } }),
    });
    vi.stubGlobal("fetch", fetchEdit);
    const onDocumentRefresh = vi.fn();

    const { container, rerender } = render(
      <HtmlWorkbench
        document={documentFixture()}
        pages={[pageFixture()]}
        style={{}}
        workspaceMode
        deploymentInfo={{ online: false }}
        pressSlug="slide"
        onDocumentRefresh={onDocumentRefresh}
      />,
    );

    expect(screen.getByRole("tab", { name: "Slides" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Templates" }));

    expect(stagePageTitles(container)).toEqual([
      "Blank template preview",
      "Split media template preview",
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Preview split-media template" }));
    expect(screen.getAllByText("Split media template preview").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Add split-media template" }));

    await waitFor(() => expect(fetchEdit).toHaveBeenCalled());
    const slideAddBody = fetchEdit.mock.calls
      .map((call) => call[1]?.body)
      .filter((body): body is string => typeof body === "string")
      .map((body) => JSON.parse(body))
      .find((body) => body.type === "slide-add");
    expect(slideAddBody).toMatchObject({
      type: "slide-add",
      slug: "slide",
      template: "split-media",
    });
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Slides" }).getAttribute("aria-selected")).toBe("true");
      expect(activeStagePageTitle(container)).toBe("Split media template preview");
    });
    await waitFor(() => expect(onDocumentRefresh).toHaveBeenCalled());
    rerender(
      <HtmlWorkbench
        document={documentFixture({
          slides: [{ id: "cover" }, { id: "split-media-2" }],
        })}
        pages={[
          pageFixture(),
          pageFixture({
            id: "split-media-2-page",
            frameKey: "split-media-2",
            title: "New split slide",
            html: `<section class="reader-page"><h1>New split slide</h1></section>`,
          }),
        ]}
        style={{}}
        workspaceMode
        deploymentInfo={{ online: false }}
        pressSlug="slide"
        onDocumentRefresh={onDocumentRefresh}
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Slides" }).getAttribute("aria-selected")).toBe("true");
      expect(stagePageTitles(container)).toContain("New split slide");
    });
  });

  it("optimistically removes the current slide from the main stage when skipping or deleting", async () => {
    window.location.hash = "#page-02";
    vi.stubGlobal("__OPENPRESS_CONTENT_PATH__", "document/chapters");
    vi.stubGlobal("__OPENPRESS_MEDIA_PATH__", "document/media");
    vi.stubGlobal("__OPENPRESS_COMPONENTS_PATH__", "document/components");
    const { HtmlWorkbench } = await import("../src/openpress/workbench");
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      disconnect() {}
    });
    const fetchEdit = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchEdit);

    const props = {
      document: documentFixture({
        slides: [{ id: "cover" }, { id: "second" }, { id: "third" }],
      }),
      pages: [
        pageFixture(),
        pageFixture({
          id: "second-page",
          frameKey: "second",
          title: "Second slide",
          pageNumber: 2,
          html: `<section class="reader-page"><h1>Second slide</h1></section>`,
        }),
        pageFixture({
          id: "third-page",
          frameKey: "third",
          title: "Third slide",
          pageNumber: 3,
          html: `<section class="reader-page"><h1>Third slide</h1></section>`,
        }),
      ],
      style: {},
      workspaceMode: true,
      deploymentInfo: { online: false },
      pressSlug: "slide",
    } as const;

    const { container, unmount } = render(<HtmlWorkbench {...props} />);
    expect(activeStagePageTitle(container)).toBe("Second slide");

    fireEvent.contextMenu(screen.getByRole("button", { name: "前往第 2 頁：Second slide" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Skip slide" }));
    await waitFor(() => {
      expect(stagePageTitles(container)).toEqual(["Current deck slide", "Third slide"]);
      expect(activeStagePageTitle(container)).toBe("Third slide");
    });

    unmount();
    window.location.hash = "#page-02";
    const rendered = render(<HtmlWorkbench {...props} />);
    const deleteContainer = rendered.container;
    expect(activeStagePageTitle(deleteContainer)).toBe("Second slide");

    fireEvent.keyDown(screen.getByRole("button", { name: "前往第 2 頁：Second slide" }), { key: "Delete" });
    fireEvent.click(screen.getByRole("button", { name: "Delete slide" }));
    await waitFor(() => {
      expect(stagePageTitles(deleteContainer)).toEqual(["Current deck slide", "Third slide"]);
      expect(activeStagePageTitle(deleteContainer)).toBe("Third slide");
    });
  });

  it("restores the current deck slide when switching back from templates", async () => {
    window.location.hash = "#page-02";
    vi.stubGlobal("__OPENPRESS_CONTENT_PATH__", "document/chapters");
    vi.stubGlobal("__OPENPRESS_MEDIA_PATH__", "document/media");
    vi.stubGlobal("__OPENPRESS_COMPONENTS_PATH__", "document/components");
    const { HtmlWorkbench } = await import("../src/openpress/workbench");
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      disconnect() {}
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    }));

    const { container } = render(
      <HtmlWorkbench
        document={documentFixture({
          slides: [{ id: "cover" }, { id: "existing-second" }],
        })}
        pages={[
          pageFixture(),
          pageFixture({
            id: "existing-second-page",
            frameKey: "existing-second",
            title: "Existing second slide",
            pageNumber: 2,
            html: `<section class="reader-page"><h1>Existing second slide</h1></section>`,
          }),
        ]}
        style={{}}
        workspaceMode
        deploymentInfo={{ online: false }}
        pressSlug="slide"
      />,
    );

    expect(activeStagePageTitle(container)).toBe("Existing second slide");
    fireEvent.click(screen.getByRole("tab", { name: "Templates" }));
    expect(stagePageTitles(container)).toEqual([
      "Blank template preview",
      "Split media template preview",
    ]);
    fireEvent.click(screen.getByRole("tab", { name: "Slides" }));

    await waitFor(() => {
      expect(activeStagePageTitle(container)).toBe("Existing second slide");
    });
  });
});

function documentFixture({
  slides = [{ id: "cover" }],
}: {
  slides?: Array<{ id: string; skip?: boolean; notes?: string }>;
} = {}): ReaderDocument {
  return {
    meta: { title: "Deck", type: "slides" },
    theme: { pageWidth: "1920px", pageHeight: "1080px" },
    source: {
      type: "openpress-press-tree-mdx",
      editable: true,
      slides,
      slideTemplates: [
        {
          name: "blank",
          description: "Blank starter",
          default: true,
          preview: templatePreview("blank-preview", "Blank template preview"),
        },
        {
          name: "split-media",
          description: "Split media starter",
          default: false,
          preview: templatePreview("split-preview", "Split media template preview"),
        },
      ],
    },
    blocks: [pageFixture()],
  };
}

function pageFixture(overrides: Partial<HtmlPageBlock> = {}): HtmlPageBlock {
  return {
    id: "cover-page",
    kind: "htmlPage",
    title: "Cover",
    pageNumber: 1,
    frameKey: "cover",
    html: `<section class="reader-page"><h1>Current deck slide</h1></section>`,
    ...overrides,
  };
}

function templatePreview(id: string, title: string): HtmlPageBlock {
  return {
    id,
    kind: "htmlPage",
    title,
    pageNumber: 1,
    frameKey: id,
    html: `<section class="reader-page"><h1>${title}</h1></section>`,
  };
}

function stagePageTitles(container: HTMLElement) {
  return [...container.querySelectorAll(".reader-pages > .openpress-html-page")]
    .map((page) => page.textContent?.trim())
    .filter(Boolean);
}

function activeStagePageTitle(container: HTMLElement) {
  return container
    .querySelector('.reader-pages > .openpress-html-page[data-openpress-active="true"]')
    ?.textContent
    ?.trim();
}
