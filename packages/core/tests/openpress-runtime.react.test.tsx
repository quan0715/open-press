import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReaderDocument } from "../src/openpress/document-model";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

function openDropdownMenu(trigger: HTMLElement) {
  fireEvent.keyDown(trigger, { key: "ArrowDown", code: "ArrowDown" });
}

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

  it("renders the public viewer through the workbench shell with zoom in the toolbar and no right-panel toggle", async () => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    window.history.replaceState(null, "", "/");
    const { OpenPressRuntime } = await importOpenPressRuntime();

    const { container } = render(<OpenPressRuntime document={documentFixture({
      blocks: [
        {
          id: "page-01",
          kind: "htmlPage",
          title: "Cover",
          pageNumber: 1,
          anchors: ["page-01"],
          html: '<section class="reader-page reader-page--content" data-page-kind="content"><div class="page-frame"><main class="page-body"><h2 data-openpress-block-id="b-cover" id="page-01">Cover heading</h2></main></div></section>',
        },
      ],
    })} />);

    expect(container.querySelector("[data-openpress-public-viewer]")).toBeTruthy();
    expect(container.querySelector("[data-openpress-workbench-shell]")).toBeTruthy();
    expect(container.querySelector("[data-openpress-workbench-toolbar]")).toBeTruthy();
    expect(container.querySelector("[data-openpress-toggle-left-panel]")).toBeTruthy();
    expect(container.querySelector("[data-openpress-toggle-right-panel]")).toBeNull();
    expect(container.querySelector("[data-openpress-page-zoom]")).toBeTruthy();
    expect(container.querySelector("[data-openpress-public-export]")).toBeTruthy();
    expect(container.querySelector("[data-openpress-search]")).toBeTruthy();
    expect(container.querySelector("[data-openpress-right-panel]")).toBeNull();
    expect(container.querySelector(".openpress-public-fab")).toBeNull();

    const viewportPill = container.querySelector<HTMLElement>("[data-openpress-page-viewport-pill]");
    expect(viewportPill).toBeTruthy();
    expect(viewportPill?.textContent).toContain("A4 Page");
    expect(viewportPill?.textContent).toContain("100%");
  });

  it("does not render a public preview route action in workspace mode", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, comments: [] }),
    }));
    window.history.replaceState(null, "", "/workspace#page-01");
    const { OpenPressRuntime } = await importOpenPressRuntime();

    const { baseElement, container } = render(<OpenPressRuntime document={documentFixture()} />);

    expect(container.querySelector("[data-openpress-workbench-toolbar]")).toBeTruthy();
    expect(container.querySelector("[data-openpress-open-public-preview]")).toBeNull();
    expect(container.querySelector(".openpress-public-preview-link")).toBeNull();
  });

  it("shows theme typography as specimen cards without a source section", async () => {
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

    const { baseElement, container } = render(<OpenPressRuntime document={documentFixture({
      meta: { title: "Styled Fixture", type: "pages" },
      theme: {
        name: "Editorial theme",
        colors: {
          paper: { value: "#fffdfa", label: "Paper" },
          ink: { value: "#171717", label: "Ink" },
          line: { value: "rgb(0 0 0 / 14%)", label: "Line" },
        },
        fonts: {
          serif: "Source Serif Pro, serif",
          body: "Source Sans Pro, sans-serif",
        },
        typography: {
          title: {
            label: "Title",
            fontFamily: "Source Serif Pro, serif",
            size: "64px",
            lineHeight: "1",
            weight: "300",
            sample: "OpenPress",
          },
          body: {
            label: "Body",
            fontFamily: "Source Sans Pro, sans-serif",
            size: "16px",
            lineHeight: "1.7",
            weight: "400",
            sample: "Readable body copy for a formal document.",
          },
        },
      },
      source: {
        styles: [{
          kind: "theme-css",
          path: "press/userstory/theme/tokens.css",
        }],
      } as ReaderDocument["source"],
    })} />);

    const summary = await waitFor(() => {
      const node = container.querySelector<HTMLButtonElement>("[data-openpress-theme-summary]");
      expect(node).toBeTruthy();
      return node as HTMLButtonElement;
    });
    fireEvent.click(summary);

    await waitFor(() => expect(baseElement.querySelector("[data-openpress-theme-typography-grid]")).toBeTruthy());
    expect(baseElement.querySelector("[aria-label='Theme source files']")).toBeNull();
    expect(baseElement.querySelector("[data-openpress-theme-source-section]")).toBeNull();
    expect(baseElement.querySelectorAll("[data-openpress-theme-type-specimen]")).toHaveLength(2);
    expect(baseElement.querySelector("[data-openpress-theme-type-meta]")?.textContent).toContain("64px");
  });

  it("enables inline editing by default in page workspaces and marks MDX source editing experimental", async () => {
    const onDocumentRefresh = vi.fn(async () => {});
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("/__openpress/source-edit") && (!init || init.method === "GET")) {
        return jsonResponse({
          ok: true,
          source: {
            path: "userstory/chapters/01-intro/content/01-start.mdx",
            requestedPath: "userstory/chapters/01-intro/content/01-start.mdx",
            file: "01-start.mdx",
            text: "## Page 1\n\nBody text.",
          },
        });
      }
      if (url === "/__openpress/source-edit" && init?.method === "POST") {
        const body = JSON.parse(String(init.body ?? "{}"));
        expect(body.type).toBe("source-file-edit");
        return jsonResponse({ ok: true, edit: { path: "userstory/chapters/01-intro/content/01-start.mdx" } });
      }
      return jsonResponse({ ok: true, comments: [] });
    });
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    window.history.replaceState(null, "", "/workspace#page-01");
    const { OpenPressRuntime } = await importOpenPressRuntime();

    const { container } = render(<OpenPressRuntime
      activeSlug="userstory"
      onDocumentRefresh={onDocumentRefresh}
      document={documentFixture({
      source: {
        type: "openpress-press-tree-mdx",
        blockMap: {
          "b-heading": {
            id: "b-heading",
            kind: "element",
            name: "h2",
            path: "userstory/chapters/01-intro/content/01-start.mdx",
            source: { line: 1, column: 1, endLine: 1, endColumn: 9 },
          },
          "b-body": {
            id: "b-body",
            kind: "element",
            name: "p",
            path: "userstory/chapters/01-intro/content/01-start.mdx",
            source: { line: 3, column: 1, endLine: 3, endColumn: 10 },
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
    })}
    />);

    const shell = container.querySelector<HTMLElement>("[data-openpress-workbench-shell]");
    const heading = container.querySelector<HTMLElement>("[data-openpress-public-page='true'] [data-openpress-block-id='b-heading']");

    await waitFor(() => expect(shell?.dataset.openpressEditMode).toBe("on"));
    await waitFor(() => expect(heading?.getAttribute("contenteditable")).toBe("true"));
    expect(container.querySelector("[data-openpress-page-edit-toggle]")).toBeNull();
    expect(container.querySelector("[data-openpress-page-edit-editor]")).toBeNull();
    expect(container.querySelector("[data-openpress-source-tree-panel]")).toBeNull();
    expect(container.querySelector("[data-openpress-mdx-experimental-warning]")).toBeNull();

    fireEvent.click(container.querySelector<HTMLButtonElement>("[data-openpress-mdx-editor-toggle]") as HTMLButtonElement);

    await waitFor(() => expect(container.querySelector("[data-openpress-source-tree-panel]")).toBeTruthy());
    expect(heading?.getAttribute("contenteditable")).toBeNull();
    expect(container.querySelector("[data-openpress-mdx-experimental-warning]")?.textContent).toContain("Experimental");
    expect(container.querySelector("[data-openpress-mdx-experimental-warning]")?.textContent).toContain("Use at your own risk");
    expect(container.querySelector("[data-openpress-page-edit-editor]")).toBeTruthy();
    expect(container.querySelector("[data-openpress-page-edit-preview-pane]")).toBeNull();
    expect(container.querySelector("[data-openpress-page-edit-mode-tabs]")).toBeNull();
    expect(container.querySelector("[data-openpress-source-file-tree-pane]")).toBeTruthy();
    expect(container.querySelector("[data-openpress-source-file-editor-pane]")).toBeTruthy();
    expect(container.querySelector("[data-openpress-left-panel]")?.getAttribute("data-openpress-panel-visible")).toBe("false");
    expect(container.querySelector("[data-openpress-right-panel]")?.getAttribute("data-openpress-panel-visible")).toBe("false");
    const fileButton = container.querySelector<HTMLElement>("[data-openpress-source-file='userstory/chapters/01-intro/content/01-start.mdx']");
    expect(fileButton?.getAttribute("data-slot")).toBeNull();
    expect(fileButton?.className).toContain("gap-3");
    expect(fileButton?.querySelector("[data-openpress-source-file-icon]")?.getAttribute("class")).toContain("h-3");
    expect(fileButton?.querySelector("[data-openpress-source-file-name]")?.textContent).toBe("01-start.mdx");
    expect(fileButton?.querySelector("[data-openpress-source-file-path]")?.textContent).toBe("chapters/01-intro/content/01-start.mdx");
    expect(container.querySelector("[data-openpress-source-file-landmark]")).toBeNull();
    await waitFor(() => {
      const textarea = container.querySelector<HTMLTextAreaElement>("[data-openpress-source-file-editor]");
      expect(textarea?.value).toBe("## Page 1\n\nBody text.");
    });

    fireEvent.change(container.querySelector<HTMLTextAreaElement>("[data-openpress-source-file-editor]") as HTMLTextAreaElement, {
      target: { value: "## Draft heading\n\nBody text." },
    });

    await new Promise((resolve) => setTimeout(resolve, 520));
    expect(fetchMock.mock.calls.some(([input, init]) => {
      if (String(input) !== "/__openpress/source-edit" || init?.method !== "POST") return false;
      return JSON.parse(String(init.body ?? "{}")).type === "source-file-preview";
    })).toBe(false);

    const editorPanel = container.querySelector<HTMLElement>("[data-openpress-source-tree-panel]") as HTMLElement;
    fireEvent.click(within(editorPanel).getByRole("button", { name: /Save & Render/i }));

    await waitFor(() => {
      const editRequest = fetchMock.mock.calls.find(([input, init]) => {
        if (String(input) !== "/__openpress/source-edit" || init?.method !== "POST") return false;
        return JSON.parse(String(init.body ?? "{}")).type === "source-file-edit";
      });
      expect(editRequest).toBeTruthy();
    });
    await waitFor(() => expect(onDocumentRefresh).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(container.querySelector("[data-openpress-source-tree-panel]")).toBeNull());
    await waitFor(() => expect(shell?.dataset.openpressEditMode).toBe("on"));
    await waitFor(() => {
      const restoredHeadings = Array.from(container.querySelectorAll<HTMLElement>("[data-openpress-public-page='true'] [data-openpress-block-id='b-heading']"));
      expect(restoredHeadings.some((node) => node.getAttribute("contenteditable") === "true")).toBe(true);
    });
  });

  it("auto-saves inline edits on blur and keeps the edited block in rebuilding state until refresh completes", async () => {
    let resolveDocumentRefresh: () => void = () => undefined;
    const onDocumentRefresh = vi.fn((_options?: unknown) => new Promise<void>((resolve) => {
      resolveDocumentRefresh = resolve;
    }));
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/__openpress/source-edit" && init?.method === "POST") {
        const body = JSON.parse(String(init.body ?? "{}"));
        expect(body.blockId).toBe("b-heading");
        expect(body.pressSlug).toBe("userstory");
        return jsonResponse({
          ok: true,
          edit: { path: "userstory/chapters/01-intro/content/01-start.mdx" },
          document: {
            path: "/openpress/userstory/document.json",
            pageCount: 1,
            renderId: "render-inline-new",
          },
        });
      }
      return jsonResponse({ ok: true, comments: [] });
    });
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    window.history.replaceState(null, "", "/workspace#page-01");
    const { OpenPressRuntime } = await importOpenPressRuntime();

    const { container } = render(<OpenPressRuntime
      activeSlug="userstory"
      onDocumentRefresh={onDocumentRefresh}
      document={documentFixture({
        source: {
          type: "openpress-press-tree-mdx",
          blockMap: {
            "b-heading": {
              id: "b-heading",
              kind: "element",
              name: "h2",
              path: "userstory/chapters/01-intro/content/01-start.mdx",
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
          html: '<section class="reader-page reader-page--content" data-page-kind="content"><div class="page-frame"><main class="page-body"><h2 data-openpress-block-id="b-heading" id="page-01">Old heading</h2></main></div></section>',
        }],
      })}
    />);

    const heading = await waitFor(() => {
      const node = container.querySelector<HTMLElement>("[data-openpress-public-page='true'] [data-openpress-block-id='b-heading']");
      expect(node?.getAttribute("contenteditable")).toBe("true");
      expect(node?.dataset.openpressEditableBlock).toBe("true");
      return node as HTMLElement;
    });
    expect(container.querySelector("[data-openpress-page-edit-toggle]")).toBeNull();

    fireEvent.focus(heading);
    expect(heading.dataset.openpressEditing).toBe("true");
    heading.textContent = "New inline heading";
    fireEvent.blur(heading);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/__openpress/source-edit", expect.objectContaining({ method: "POST" })));
    expect(heading.dataset.openpressEditState).toBe("saving");
    expect(heading.getAttribute("aria-busy")).toBe("true");
    expect(onDocumentRefresh).toHaveBeenCalledWith({ expectedRenderId: "render-inline-new" });

    resolveDocumentRefresh();

    await waitFor(() => expect(heading.dataset.openpressEditState).toBe("saved"));
  });

  it("keeps narrow MDX source editing as editor-only instead of tabbed preview", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("/__openpress/source-edit") && (!init || init.method === "GET")) {
        return jsonResponse({
          ok: true,
          source: {
            path: "chapters/01-intro/content/01-start.mdx",
            requestedPath: "chapters/01-intro/content/01-start.mdx",
            file: "01-start.mdx",
            text: "## Page 1\n\nBody text.",
          },
        });
      }
      return jsonResponse({ ok: true, comments: [] });
    });
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 820,
    });
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

    fireEvent.click(container.querySelector<HTMLButtonElement>("[data-openpress-mdx-editor-toggle]") as HTMLButtonElement);

    await waitFor(() => expect(container.querySelector("[data-openpress-page-edit-editor]")).toBeTruthy());
    expect(container.querySelector("[data-openpress-page-edit-mode-tabs]")).toBeNull();
    expect(container.querySelector("[data-openpress-page-edit-preview-pane]")).toBeNull();
    expect(container.querySelector("[data-openpress-source-tree-panel]")).toBeTruthy();
  });

  it("waits for the newly rendered document before completing Save & Render", async () => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    window.history.replaceState(null, "", "/userstory/preview#page-01");
    const oldDocument = documentFixture({
      meta: { title: "Old Fixture", renderId: "render-old" } as ReaderDocument["meta"] & { renderId: string },
      source: pageSourceFixture(),
      blocks: [{
        id: "page-01",
        kind: "htmlPage",
        title: "Old page",
        pageNumber: 1,
        anchors: ["page-01"],
        html: '<section class="reader-page reader-page--content" data-page-kind="content"><div class="page-frame"><main class="page-body"><h2 data-openpress-block-id="b-heading" id="page-01">Old rendered heading</h2></main></div></section>',
      }],
    });
    const newDocument = documentFixture({
      meta: { title: "New Fixture", renderId: "render-new" } as ReaderDocument["meta"] & { renderId: string },
      source: pageSourceFixture(),
      blocks: [{
        id: "page-01",
        kind: "htmlPage",
        title: "New page",
        pageNumber: 1,
        anchors: ["page-01"],
        html: '<section class="reader-page reader-page--content" data-page-kind="content"><div class="page-frame"><main class="page-body"><h2 data-openpress-block-id="b-heading" id="page-01">New rendered heading</h2></main></div></section>',
      }],
    });
    const manifest = {
      version: 1,
      name: "Workspace Fixture",
      presses: [{
        slug: "userstory",
        title: "User Story",
        documentUrl: "/openpress/userstory/document.json",
        thumbnailUrl: "/openpress/userstory/thumbnail.png",
        pageCount: 1,
        page: null,
        type: "pages",
      }],
    };
    let documentFetchCount = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/openpress/workspace.json") return jsonResponse(manifest);
      if (url === "/__openpress/status" || url === "/openpress/deploy.json") {
        return jsonResponse({ deploy_configured: false });
      }
      if (url.startsWith("/openpress/userstory/document.json")) {
        documentFetchCount += 1;
        return jsonResponse(documentFetchCount < 3 ? oldDocument : newDocument);
      }
      if (url.startsWith("/__openpress/source-edit") && (!init || init.method === "GET")) {
        return jsonResponse({
          ok: true,
          source: {
            path: "chapters/01-intro/content/01-start.mdx",
            requestedPath: "chapters/01-intro/content/01-start.mdx",
            file: "01-start.mdx",
            text: "## Old heading\n\nBody text.",
          },
        });
      }
      if (url === "/__openpress/source-edit" && init?.method === "POST") {
        return jsonResponse({
          ok: true,
          edit: { path: "chapters/01-intro/content/01-start.mdx" },
          document: {
            path: "/openpress/userstory/document.json",
            pageCount: 1,
            renderId: "render-new",
          },
        });
      }
      if (url === "/__openpress/comment") return jsonResponse({ ok: true, comments: [] });
      return { ok: false, status: 404, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const { OpenPressApp } = await importOpenPressRuntime();

    const { container } = render(<OpenPressApp />);

    await waitFor(() => expect(container.textContent).toContain("Old rendered heading"));
    fireEvent.click(container.querySelector<HTMLButtonElement>("[data-openpress-mdx-editor-toggle]") as HTMLButtonElement);
    await waitFor(() => expect(container.querySelector("[data-openpress-source-file-editor]")).toBeTruthy());
    fireEvent.change(container.querySelector<HTMLTextAreaElement>("[data-openpress-source-file-editor]") as HTMLTextAreaElement, {
      target: { value: "## New heading\n\nBody text." },
    });
    const editorPanel = container.querySelector<HTMLElement>("[data-openpress-source-tree-panel]") as HTMLElement;
    fireEvent.click(within(editorPanel).getByRole("button", { name: /Save & Render/i }));

    await waitFor(() => expect(documentFetchCount).toBe(2));
    expect(container.querySelector("[data-openpress-workbench-shell]")?.getAttribute("data-openpress-edit-mode")).toBe("on");
    expect(container.querySelector("[data-openpress-save-render-overlay]")).toBeTruthy();
    expect(container.textContent).toContain("Save & Render");

    await waitFor(() => expect(container.textContent).toContain("New rendered heading"));
    expect(container.querySelector("[data-openpress-workbench-shell]")?.getAttribute("data-openpress-edit-mode")).toBe("on");
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

    const { baseElement, container } = render(<OpenPressRuntime document={documentFixture()} />);

    const zoomControl = container.querySelector<HTMLButtonElement>("[data-openpress-page-zoom]");
    expect(zoomControl).toBeTruthy();
    expect(zoomControl?.dataset.openpressScaleMode).toBe("fit-width");
    expect(zoomControl?.getAttribute("aria-haspopup")).toBe("menu");

    openDropdownMenu(zoomControl as HTMLButtonElement);
    const menu = baseElement.querySelector<HTMLElement>("[data-openpress-page-zoom-menu]");
    expect(menu).toBeTruthy();
    expect(menu?.textContent).toContain("雙頁");
    expect(menu?.textContent).toContain("符合頁面寬度");

    const scale150 = Array.from(baseElement.querySelectorAll<HTMLButtonElement>("[data-openpress-zoom-option]"))
      .find((option) => option.dataset.openpressZoomOption === "scale-150");
    expect(scale150).toBeTruthy();
    fireEvent.click(scale150 as HTMLButtonElement);
    expect(zoomControl?.dataset.openpressScaleMode).toBe("scale-150");
    expect(zoomControl?.textContent).toContain("150%");

    openDropdownMenu(zoomControl as HTMLButtonElement);
    const singlePage = baseElement.querySelector<HTMLButtonElement>("[data-openpress-page-layout-option='single']");
    const spreadPage = baseElement.querySelector<HTMLButtonElement>("[data-openpress-page-layout-option='spread']");
    expect(singlePage?.getAttribute("aria-checked")).toBe("true");
    expect(spreadPage?.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(spreadPage as HTMLButtonElement);

    const pageContainer = container.querySelector<HTMLElement>("[data-openpress-public-page]");
    expect(pageContainer?.dataset.openpressPageLayout).toBe("spread");
    openDropdownMenu(zoomControl as HTMLButtonElement);
    expect(baseElement.querySelector<HTMLButtonElement>("[data-openpress-page-layout-option='spread']")?.getAttribute("aria-checked")).toBe("true");
  });

  it("renders spread layout data when double-page mode is selected", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, comments: [] }),
    }));
    window.history.replaceState(null, "", "/workspace#page-01");
    const { OpenPressRuntime } = await importOpenPressRuntime();

    const { baseElement, container } = render(<OpenPressRuntime document={documentFixture({
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
    openDropdownMenu(zoomControl as HTMLButtonElement);
    fireEvent.click(baseElement.querySelector<HTMLButtonElement>("[data-openpress-page-layout-option='spread']") as HTMLButtonElement);

    const pageContainer = container.querySelector<HTMLElement>("[data-openpress-public-page]");
    const pages = Array.from(container.querySelectorAll<HTMLElement>(".openpress-html-page"));

    expect(pageContainer?.dataset.openpressPageLayout).toBe("spread");
    expect(pages).toHaveLength(2);
    expect(pages[0]?.dataset.openpressPageSpreadSide).toBe("left");
    expect(pages[1]?.dataset.openpressPageSpreadSide).toBe("right");

    openDropdownMenu(zoomControl as HTMLButtonElement);
    const scale100 = baseElement.querySelector<HTMLButtonElement>("[data-openpress-zoom-option='scale-100']");
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

  it("shows current slide speaker notes below the workspace slide stage", async () => {
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
    const document = slideDocumentFixture();
    document.source = {
      type: "openpress-press-tree-mdx",
      slides: [
        { id: "cover", skip: false, notes: "Cover speaker note" },
        { id: "agenda", skip: false, notes: "Agenda speaker note" },
      ],
    };
    document.blocks[0].frameKey = "cover";
    document.blocks[1].frameKey = "agenda";

    const { container } = render(<OpenPressRuntime document={document} />);

    const notesPanel = container.querySelector<HTMLElement>("[data-openpress-slide-notes-dock]");
    expect(notesPanel).toBeTruthy();
    expect(notesPanel?.textContent).toContain("Cover speaker note");
    expect(notesPanel?.textContent).not.toContain("Agenda speaker note");
    expect(container.querySelector(".openpress-html-page")?.textContent).not.toContain("Cover speaker note");
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
    expect(progress?.dataset.openpressPresentScale).toBe("fit-page");

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

  it("keeps the slide delete dialog body inside the modal padding", async () => {
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
    const slideDocument = slideDocumentFixture();
    const documentWithFrameKeys = {
      ...slideDocument,
      blocks: slideDocument.blocks.map((page, index) => ({
        ...page,
        frameKey: ["cover", "agenda", "close"][index],
      })),
    };

    render(<OpenPressRuntime document={documentWithFrameKeys} />);

    const agendaThumb = await waitFor(() => {
      const node = document.body.querySelector<HTMLElement>("[aria-label='前往第 2 頁：Agenda']");
      expect(node).toBeTruthy();
      return node as HTMLElement;
    });
    fireEvent.keyDown(agendaThumb, { key: "Delete" });

    const dialog = await screen.findByRole("dialog", { name: "Delete slide?" });
    const deletePrompt = within(dialog).getByText((_, element) => (
      element?.tagName.toLowerCase() === "p"
      && element.textContent === "Delete agenda from this deck?"
    ));
    const dialogBody = deletePrompt.parentElement as HTMLElement;
    expect(dialogBody.className).toContain("px-6");
    expect(dialogBody.querySelector("p")?.className).toContain("text-xs");
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

  it("navigates to the presentation route in-place when play button is clicked from workspace", async () => {
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
    // requestFullscreen is not implemented in jsdom; the click handler guards
    // with `if (root?.requestFullscreen)` so it is silently skipped in tests.
    const openWindow = vi.spyOn(window, "open").mockImplementation(() => null);
    const { OpenPressApp } = await importOpenPressRuntime();

    const { container } = render(<OpenPressApp />);

    await waitFor(() => expect(container.querySelector("[data-openpress-slide-present]")).toBeTruthy());
    fireEvent.click(container.querySelector<HTMLButtonElement>("[data-openpress-slide-present]") as HTMLButtonElement);

    // Play navigates in-place to /<slug>/present — no new tab is opened.
    expect(openWindow).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/slide/present");
      expect(container.querySelector("[data-openpress-slide-presenter]")).toBeTruthy();
    });
  });

  it("renders workspace thumbnails from manifest PNGs without fetching document JSON first", async () => {
    window.history.replaceState(null, "", "/workspace");
    const manifest = {
      version: 1,
      name: "Workspace Fixture",
      presses: [
        {
          slug: "report",
          title: "Report Fixture",
          documentUrl: "/openpress/report/document.json",
          thumbnailUrl: "/openpress/report/thumbnail.png",
          pageCount: 1,
          page: { pagePreset: "a4", pageLabel: "A4 Page" },
          type: "pages",
        },
        {
          slug: "slide",
          title: "Slide Fixture",
          documentUrl: "/openpress/slide/document.json",
          thumbnailUrl: "/openpress/slide/thumbnail.png",
          pageCount: 1,
          page: { pagePreset: "slide-16-9", pageLabel: "Slide 16:9" },
          type: "slides",
        },
      ],
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/openpress/workspace.json") return jsonResponse(manifest);
      if (url === "/__openpress/status" || url === "/openpress/deploy.json") {
        return jsonResponse({ deploy_configured: false });
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const { OpenPressApp } = await importOpenPressRuntime();

    const { container } = render(<OpenPressApp />);

    await waitFor(() => expect(container.querySelector("img[src='/openpress/report/thumbnail.png']")).toBeTruthy());
    expect(container.querySelector("img[src='/openpress/slide/thumbnail.png']")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalledWith("/openpress/report/document.json", expect.anything());
    expect(fetchMock).not.toHaveBeenCalledWith("/openpress/slide/document.json", expect.anything());
  });

  it("falls back to the HTML miniature when a workspace thumbnail image fails", async () => {
    window.history.replaceState(null, "", "/workspace");
    const reportDocument = documentFixture({
      blocks: [{
        id: "page-01",
        kind: "htmlPage",
        title: "Report Cover",
        pageNumber: 1,
        anchors: ["page-01"],
        html: '<section class="reader-page reader-page--cover"><h1>Rendered fallback cover</h1></section>',
      }],
    });
    const manifest = {
      version: 1,
      name: "Workspace Fixture",
      presses: [
        {
          slug: "report",
          title: "Report Fixture",
          documentUrl: "/openpress/report/document.json",
          thumbnailUrl: "/openpress/report/thumbnail.png",
          pageCount: 1,
          page: { pagePreset: "a4", pageLabel: "A4 Page" },
          type: "pages",
        },
        {
          slug: "slide",
          title: "Slide Fixture",
          documentUrl: "/openpress/slide/document.json",
          thumbnailUrl: "/openpress/slide/thumbnail.png",
          pageCount: 1,
          page: { pagePreset: "slide-16-9", pageLabel: "Slide 16:9" },
          type: "slides",
        },
      ],
    };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/openpress/workspace.json") return jsonResponse(manifest);
      if (url === "/openpress/report/document.json") return jsonResponse(reportDocument);
      if (url === "/__openpress/status" || url === "/openpress/deploy.json") {
        return jsonResponse({ deploy_configured: false });
      }
      return { ok: false, status: 404, json: async () => ({}) };
    }));
    const { OpenPressApp } = await importOpenPressRuntime();

    const { container } = render(<OpenPressApp />);

    const img = await waitFor(() => {
      const node = container.querySelector<HTMLImageElement>("img[src='/openpress/report/thumbnail.png']");
      expect(node).toBeTruthy();
      return node as HTMLImageElement;
    });
    fireEvent.error(img);

    await waitFor(() => expect(container.textContent).toContain("Rendered fallback cover"));
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

function pageSourceFixture(): NonNullable<ReaderDocument["source"]> {
  return {
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
  };
}

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}
