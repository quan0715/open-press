import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function loadHook() {
  vi.stubGlobal("__OPENPRESS_CONTENT_PATH__", "document/chapters");
  vi.stubGlobal("__OPENPRESS_MEDIA_PATH__", "document/media");
  vi.stubGlobal("__OPENPRESS_COMPONENTS_PATH__", "document/components");
  const mod = await import("../src/openpress/workbench/document/hooks/useDocumentWorkbenchModel");
  return mod.useDocumentWorkbenchModel;
}

type Hook = Awaited<ReturnType<typeof loadHook>>;
type Model = ReturnType<Hook>;

function makeFixture() {
  const document = {
    meta: { title: "Doc" },
    source: {
      type: "openpress-press-tree-mdx",
      blockMap: {
        "b-1": {
          id: "b-1",
          kind: "element",
          name: "h2",
          path: "chapters/01/content/01.mdx",
          source: { line: 1, column: 1 },
        },
        "b-2": {
          id: "b-2",
          kind: "element",
          name: "p",
          path: "chapters/01/content/01.mdx",
          source: { line: 5, column: 1 },
        },
      },
      objectEntities: {},
    },
    theme: { page: { width: 595, height: 842 } },
    blocks: [],
  };

  const pages = [
    {
      id: "p-1",
      pageNumber: 1,
      frameKey: "intro",
      html: `<section data-openpress-bookmark="hero" id="hero"><h1>Hero</h1></section>`,
      source: { path: "chapters/01/content/01.mdx" },
    },
  ];
  return { document, pages };
}

describe("useDocumentWorkbenchModel", () => {
  it("returns indexed views derived from the document and pages", async () => {
    const useDocumentWorkbenchModel = await loadHook();
    const { document, pages } = makeFixture();
    let captured: Model | null = null;
    function Harness() {
      const model = useDocumentWorkbenchModel(document as never, pages as never);
      useEffect(() => {
        captured = model;
      });
      return null;
    }
    render(<Harness />);

    expect(captured).not.toBeNull();
    const model = captured!;
    expect(Object.keys(model).sort()).toEqual([
      "anchorPageMap",
      "bookmarks",
      "mediaAssets",
      "projectComponentUsages",
      "projectMentionItems",
      "sourceBlockMap",
      "sourceBlocksByPath",
    ]);

    expect(model.sourceBlockMap["b-1"]).toBeDefined();
    expect(model.sourceBlockMap["b-2"]).toBeDefined();
    expect(model.sourceBlocksByPath["chapters/01/content/01.mdx"]).toHaveLength(2);
  });

  it("memoizes return values when inputs are stable", async () => {
    const useDocumentWorkbenchModel = await loadHook();
    const { document, pages } = makeFixture();
    const captures: Model[] = [];
    function Harness() {
      const model = useDocumentWorkbenchModel(document as never, pages as never);
      useEffect(() => {
        captures.push(model);
      });
      return null;
    }
    const { rerender } = render(<Harness />);
    rerender(<Harness />);

    expect(captures.length).toBeGreaterThanOrEqual(2);
    const first = captures[0];
    const second = captures[captures.length - 1];
    expect(second.sourceBlockMap).toBe(first.sourceBlockMap);
    expect(second.mediaAssets).toBe(first.mediaAssets);
    expect(second.bookmarks).toBe(first.bookmarks);
    expect(second.projectMentionItems).toBe(first.projectMentionItems);
  });

  it("recomputes page-derived views when pages reference changes", async () => {
    const useDocumentWorkbenchModel = await loadHook();
    const { document, pages } = makeFixture();
    const captures: Model[] = [];
    let usePages: typeof pages = pages;
    function Harness() {
      const model = useDocumentWorkbenchModel(document as never, usePages as never);
      useEffect(() => {
        captures.push(model);
      });
      return null;
    }
    const { rerender } = render(<Harness />);
    usePages = [...pages];
    rerender(<Harness />);

    const first = captures[0];
    const second = captures[captures.length - 1];
    expect(second.mediaAssets).not.toBe(first.mediaAssets);
    expect(second.sourceBlockMap).toBe(first.sourceBlockMap);
  });
});
