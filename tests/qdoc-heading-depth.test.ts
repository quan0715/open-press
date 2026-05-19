import { describe, expect, it } from "vitest";
import { collectBookmarkIndex } from "../src/qdoc/indexes";
import { paginateQDocSourcePages } from "../src/qdoc/pagination";

describe("QDoc heading depth", () => {
  it("includes H3 items in the formal table of contents but keeps H4 out", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <section class="reader-page toc" data-page-title="目錄">
        <div class="page-frame">
          <main class="page-body"><h2>目錄</h2></main>
        </div>
      </section>
      <section class="reader-page report-page">
        <div class="page-frame">
          <main class="page-body">
            <h2 id="chapter-tree">CH5 Tree</h2>
            <h3 id="tree-traversal">Traversal</h3>
            <h4 id="recursive-traversal">Recursive traversal</h4>
            <p>Traversal notes.</p>
            <h3 id="tree-bst">BST</h3>
            <h4 id="bst-insert">BST insert</h4>
            <p>BST notes.</p>
          </main>
        </div>
      </section>
    `;

    const pages = paginateQDocSourcePages(container, []);
    const tocHtml = pages.find((page) => page.id === "qdoc-rendered-page-01")?.html ?? "";

    expect(tocHtml).toContain("toc-level-2");
    expect(tocHtml).toContain("CH5 Tree");
    expect(tocHtml).toContain("toc-level-3");
    expect(tocHtml).toContain("Traversal");
    expect(tocHtml).toContain("BST");
    expect(tocHtml).not.toContain("Recursive traversal");
    expect(tocHtml).not.toContain("BST insert");
  });

  it("indexes H4 headings as third-level reader bookmarks", () => {
    const bookmarks = collectBookmarkIndex([
      {
        id: "page-01",
        title: "CH5 Tree",
        pageNumber: 1,
        html: `
          <section class="reader-page report-page">
            <div class="page-frame">
              <main class="page-body">
                <h2 id="chapter-tree" data-chapter="05">CH5 Tree</h2>
                <h3 id="tree-traversal" data-section="5.1">Traversal</h3>
                <h4 id="recursive-traversal" data-topic="5.1.1">Recursive traversal</h4>
              </main>
            </div>
          </section>
        `,
      },
    ]);

    expect(bookmarks[0]?.subs[0]?.title).toBe("Traversal");
    expect(bookmarks[0]?.subs[0]?.subs[0]).toMatchObject({
      title: "Recursive traversal",
      label: "5.1.1",
      pageIndex: 0,
    });
  });

  it("splits deep formal table-of-contents entries across pages", () => {
    const h3Blocks = Array.from({ length: 25 }, (_, index) => {
      const number = index + 1;
      return `<h3 id="tree-topic-${number}">Tree topic ${number}</h3><p>Topic ${number} notes.</p>`;
    }).join("");
    const container = document.createElement("div");
    container.innerHTML = `
      <section class="reader-page toc" data-page-title="目錄">
        <div class="page-frame">
          <main class="page-body"><h2>目錄</h2></main>
        </div>
      </section>
      <section class="reader-page report-page">
        <div class="page-frame">
          <main class="page-body">
            <h2 id="chapter-tree">CH5 Tree</h2>
            ${h3Blocks}
          </main>
        </div>
      </section>
    `;

    const pages = paginateQDocSourcePages(container, []);
    const tocPages = pages.filter((page) => page.html.includes("reader-page toc"));

    expect(tocPages).toHaveLength(2);
    expect(tocPages[0].html).toContain("Tree topic 23");
    expect(tocPages[0].html).not.toContain("Tree topic 24");
    expect(tocPages[1].html).toContain("toc-continuation");
    expect(tocPages[1].html).toContain("目錄續");
    expect(tocPages[1].html).toContain("Tree topic 24");
    expect(tocPages[1].html).toContain("Tree topic 25");
  });
});
