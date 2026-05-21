import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import { paginateSourcePages } from "../src/openpress/pagination";

const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
const originalGetComputedStyle = window.getComputedStyle;

afterEach(() => {
  HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  window.getComputedStyle = originalGetComputedStyle;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("paginateSourcePages", () => {
  it("does not gate responsive paged page sizing on pagination-ready state", async () => {
    const css = await fs.readFile("src/styles/openpress/responsive.css", "utf8");

    expect(css).not.toContain('[data-openpress-view-mode="paged"][data-openpress-pagination="ready"]');
    expect(css).toContain('[data-openpress-view-mode="paged"] .openpress-html-page__html .reader-page');
  });

  it("caps paged public pages on narrow desktop viewports", async () => {
    const css = await fs.readFile("src/styles/openpress/responsive.css", "utf8");

    expect(css).toContain('--openpress-public-page-width: min(');
    expect(css).toContain('860px');
    expect(css).toContain('calc(100cqw - 48px)');
  });

  it("caps desktop paged public pages to the reader page width", async () => {
    const css = await fs.readFile("src/styles/openpress/public-viewer.css", "utf8");

    expect(css).toContain('--openpress-public-page-width: min(');
    expect(css).toContain('var(--openpress-page-width)');
    expect(css).toContain('860px');
  });

  it("renders the public drawer scrim as a fixed viewport overlay", async () => {
    const css = await fs.readFile("src/styles/openpress/responsive.css", "utf8");

    expect(css).toContain(".openpress-public-viewer.openpress-reader-app .openpress-public-scrim");
    expect(css).toContain("position: fixed");
    expect(css).toContain("inset: 0");
    expect(css).toContain("z-index: 35");
  });

  it("sizes the toc body as a full page shell container", async () => {
    const css = await fs.readFile("document/theme/page-surfaces/toc.css", "utf8");

    expect(css).toContain(".reader-page--toc .page-body");
    expect(css).toContain("height: 100%");
  });

  it("measures content pages inside the rendered page wrapper before deciding whether blocks fit", () => {
    installDeterministicLayout();
    const sourceContainer = document.createElement("div");
    sourceContainer.className = "reader-pages openpress-public-page";
    sourceContainer.innerHTML = `
      <div class="openpress-html-page">
        <div class="openpress-html-page__html">
          <section class="reader-page reader-page--content" data-page-kind="content">
            <div class="page-frame">
              <main class="page-body">
                <p class="test-block">Block 1</p>
                <p class="test-block">Block 2</p>
                <p class="test-block">Block 3</p>
                <p class="test-block">Block 4</p>
              </main>
            </div>
          </section>
        </div>
      </div>
    `;
    document.body.append(sourceContainer);

    const pages = paginateSourcePages(sourceContainer, [{
      id: "source-page",
      kind: "htmlPage",
      title: "Source Page",
      pageNumber: 1,
      html: "",
      anchors: [],
    }]);

    const contentPages = pages.filter((page) => page.html.includes('data-page-kind="content"'));
    expect(contentPages.length).toBeGreaterThan(1);
  });

  it("reserves bottom safety space when deciding whether blocks fit", () => {
    installDeterministicLayout();
    const sourceContainer = document.createElement("div");
    sourceContainer.className = "reader-pages openpress-public-page";
    sourceContainer.innerHTML = `
      <div class="openpress-html-page">
        <div class="openpress-html-page__html">
          <section class="reader-page reader-page--content" data-page-kind="content">
            <div class="page-frame">
              <main class="page-body">
                <p class="test-safe-block">Block 1</p>
                <p class="test-safe-block">Block 2</p>
              </main>
            </div>
          </section>
        </div>
      </div>
    `;
    document.body.append(sourceContainer);

    const pages = paginateSourcePages(sourceContainer, [{
      id: "source-page",
      kind: "htmlPage",
      title: "Source Page",
      pageNumber: 1,
      html: "",
      anchors: [],
    }]);

    const contentPages = pages.filter((page) => page.html.includes('data-page-kind="content"'));
    expect(contentPages).toHaveLength(2);
  });

  it("numbers figure and table captions through one content caption contract", () => {
    installDeterministicLayout();
    const sourceContainer = document.createElement("div");
    sourceContainer.className = "reader-pages openpress-public-page";
    sourceContainer.innerHTML = `
      <div class="openpress-html-page">
        <div class="openpress-html-page__html">
          <section class="reader-page reader-page--content" data-page-kind="content">
            <div class="page-frame">
              <main class="page-body">
                <figure class="test-short-block">
                  <div>Figure body</div>
                  <figcaption>Pointer diagram</figcaption>
                </figure>
                <table class="test-short-block">
                  <caption>Pointer syntax</caption>
                  <tbody><tr><td>p</td></tr></tbody>
                </table>
                <figure class="test-short-block">
                  <div>Second figure</div>
                  <figcaption>圖 5-X：Old handwritten label</figcaption>
                </figure>
              </main>
            </div>
          </section>
        </div>
      </div>
    `;
    document.body.append(sourceContainer);

    const pages = paginateSourcePages(sourceContainer, [{
      id: "source-page",
      kind: "htmlPage",
      title: "Source Page",
      pageNumber: 1,
      html: "",
      anchors: [],
    }]);

    const template = document.createElement("template");
    template.innerHTML = pages.map((page) => page.html).join("");
    const figureCaptions = Array.from(template.content.querySelectorAll("figcaption"));
    const tableCaptions = Array.from(template.content.querySelectorAll("caption"));

    expect(figureCaptions.map((caption) => caption.textContent)).toEqual([
      "圖 1：Pointer diagram",
      "圖 2：Old handwritten label",
    ]);
    expect(tableCaptions.map((caption) => caption.textContent)).toEqual(["表 1：Pointer syntax"]);
    expect(figureCaptions[0]?.getAttribute("data-openpress-caption")).toBe("true");
    expect(figureCaptions[0]?.getAttribute("data-openpress-caption-label")).toBe("圖 1");
    expect(figureCaptions[0]?.hasAttribute("data-openpress-caption-kind")).toBe(false);
    expect(figureCaptions[0]?.hasAttribute("data-openpress-caption-index")).toBe(false);
    expect(tableCaptions[0]?.getAttribute("data-openpress-caption")).toBe("true");
    expect(tableCaptions[0]?.getAttribute("data-openpress-caption-label")).toBe("表 1");
    expect(tableCaptions[0]?.hasAttribute("data-openpress-caption-kind")).toBe(false);
    expect(tableCaptions[0]?.hasAttribute("data-openpress-caption-index")).toBe(false);
  });

  it("keeps a split table caption on the first rendered fragment", () => {
    installDeterministicLayout();
    const sourceContainer = document.createElement("div");
    sourceContainer.className = "reader-pages openpress-public-page";
    sourceContainer.innerHTML = `
      <div class="openpress-html-page">
        <div class="openpress-html-page__html">
          <section class="reader-page reader-page--content" data-page-kind="content">
            <div class="page-frame">
              <main class="page-body">
                <table class="test-split-table">
                  <caption>Trace rows</caption>
                  <thead><tr><th>Step</th><th>State</th></tr></thead>
                  <tbody>
                    <tr><td>1</td><td>A</td></tr>
                    <tr><td>2</td><td>B</td></tr>
                    <tr><td>3</td><td>C</td></tr>
                  </tbody>
                </table>
              </main>
            </div>
          </section>
        </div>
      </div>
    `;
    document.body.append(sourceContainer);

    const pages = paginateSourcePages(sourceContainer, [{
      id: "source-page",
      kind: "htmlPage",
      title: "Source Page",
      pageNumber: 1,
      html: "",
      anchors: [],
    }]);

    const templates = pages.map((page) => {
      const template = document.createElement("template");
      template.innerHTML = page.html;
      return template;
    });
    const tablePages = templates
      .map((template) => template.content.querySelector("table"))
      .filter((table): table is HTMLTableElement => Boolean(table));

    expect(tablePages).toHaveLength(2);
    expect(tablePages[0]?.querySelector("caption")?.textContent).toBe("表 1：Trace rows");
    expect(tablePages[1]?.querySelector("caption")).toBeNull();
  });

  it("preserves custom whole-page surfaces without injecting a page frame", () => {
    installDeterministicLayout();
    const sourceContainer = document.createElement("div");
    sourceContainer.className = "reader-pages openpress-public-page";
    sourceContainer.innerHTML = `
      <div class="openpress-html-page">
        <div class="openpress-html-page__html">
          <section class="reader-page reader-page--cover no-footer" data-page-kind="cover" data-page-footer="false">
            <figure class="cover-visual"></figure>
            <div class="cover-main">Cover</div>
          </section>
        </div>
      </div>
    `;
    document.body.append(sourceContainer);

    const pages = paginateSourcePages(sourceContainer, [{
      id: "cover",
      kind: "htmlPage",
      title: "Cover",
      pageNumber: 1,
      html: "",
      anchors: [],
    }]);

    expect(pages[0]?.html).toContain('data-page-kind="cover"');
    expect(pages[0]?.html).not.toContain('class="page-frame"');
    expect(pages[0]?.html).toContain('class="cover-main"');
  });

  it("keeps framed toc pages on the no-footer page shell", () => {
    installDeterministicLayout();
    const sourceContainer = document.createElement("div");
    sourceContainer.className = "reader-pages openpress-public-page";
    sourceContainer.innerHTML = `
      <div class="openpress-html-page">
        <div class="openpress-html-page__html">
          <section class="reader-page reader-page--toc no-footer" data-page-kind="toc" data-page-footer="false">
            <div class="page-frame">
              <main class="page-body"><h2 id="toc-title">目錄</h2></main>
            </div>
          </section>
        </div>
      </div>
    `;
    document.body.append(sourceContainer);

    const pages = paginateSourcePages(sourceContainer, [{
      id: "toc",
      kind: "htmlPage",
      title: "TOC",
      pageNumber: 1,
      html: "",
      anchors: [],
    }]);

    expect(pages[0]?.html).toContain('class="page-frame"');
    expect(pages[0]?.html).toContain('class="page-body"');
    expect(pages[0]?.html).not.toContain('class="page-footer"');
  });

  it("splits toc pages by measured page-body capacity", () => {
    installDeterministicLayout();
    const sourceContainer = document.createElement("div");
    sourceContainer.className = "reader-pages openpress-public-page";
    sourceContainer.innerHTML = `
      <div class="openpress-html-page">
        <div class="openpress-html-page__html">
          <section class="reader-page reader-page--toc no-footer" data-page-kind="toc" data-page-footer="false">
            <div class="page-frame">
              <main class="page-body"><h2 id="toc-title">目錄</h2></main>
            </div>
          </section>
          <section class="reader-page reader-page--content" data-page-kind="content">
            <div class="page-frame">
              <main class="page-body">
                <h2 id="chapter-1">Chapter 1</h2>
                <h3 id="section-1">Section 1</h3>
                <h3 id="section-2">Section 2</h3>
                <h3 id="section-3">Section 3</h3>
                <h3 id="section-4">Section 4</h3>
                <h3 id="section-5">Section 5</h3>
              </main>
            </div>
          </section>
        </div>
      </div>
    `;
    document.body.append(sourceContainer);

    const pages = paginateSourcePages(sourceContainer, [
      {
        id: "toc",
        kind: "htmlPage",
        title: "TOC",
        pageNumber: 1,
        html: "",
        anchors: [],
      },
      {
        id: "content",
        kind: "htmlPage",
        title: "Content",
        pageNumber: 2,
        html: "",
        anchors: [],
      },
    ]);

    const tocPages = pages.filter((page) => page.html.includes('data-page-kind="toc"'));
    const firstToc = document.createElement("template");
    firstToc.innerHTML = tocPages[0]?.html ?? "";

    expect(tocPages.length).toBeGreaterThan(1);
    expect(firstToc.content.querySelectorAll(".toc-list li").length).toBeLessThanOrEqual(2);
  });

});

function installDeterministicLayout() {
  window.getComputedStyle = vi.fn(() => ({
    marginBottom: "0px",
  } as CSSStyleDeclaration));

  HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
    if (this.classList.contains("page-body")) {
      const constrainedByRenderedPageWrapper = Boolean(this.closest(".openpress-html-page__html"));
      return rect(0, constrainedByRenderedPageWrapper ? 100 : 10000);
    }

    if (this.classList.contains("test-block")) {
      const siblings = Array.from(this.parentElement?.children ?? []);
      const index = Math.max(0, siblings.indexOf(this));
      return rect(index * 60, (index + 1) * 60);
    }

    if (this.classList.contains("test-safe-block")) {
      const siblings = Array.from(this.parentElement?.children ?? []);
      const index = Math.max(0, siblings.indexOf(this));
      return rect(index * 47, (index + 1) * 47);
    }

    if (this.classList.contains("test-short-block")) {
      const siblings = Array.from(this.parentElement?.children ?? []);
      const index = Math.max(0, siblings.indexOf(this));
      return rect(index * 20, (index + 1) * 20);
    }

    if (this.classList.contains("test-split-table")) {
      const rows = this.querySelectorAll("tbody tr").length;
      const captionHeight = this.querySelector("caption") ? 10 : 0;
      return rect(0, rows * 40 + captionHeight);
    }

    if (this.classList.contains("toc-heading")) {
      return rect(0, 20);
    }

    if (this.classList.contains("toc-list")) {
      return rect(20, 20 + this.children.length * 36);
    }

    return rect(0, 100);
  };
}

function rect(top: number, bottom: number): DOMRect {
  return {
    x: 0,
    y: top,
    top,
    bottom,
    left: 0,
    right: 100,
    width: 100,
    height: bottom - top,
    toJSON: () => ({}),
  };
}
