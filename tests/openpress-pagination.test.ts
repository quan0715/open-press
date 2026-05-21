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

  it("measures report pages inside the rendered page wrapper before deciding whether blocks fit", () => {
    installDeterministicLayout();
    const sourceContainer = document.createElement("div");
    sourceContainer.className = "reader-pages openpress-public-page";
    sourceContainer.innerHTML = `
      <div class="openpress-html-page">
        <div class="openpress-html-page__html">
          <section class="reader-page reader-page--report" data-page-kind="report">
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

    const reportPages = pages.filter((page) => page.html.includes('data-page-kind="report"'));
    expect(reportPages.length).toBeGreaterThan(1);
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
