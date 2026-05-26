import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearInspectorComment,
  createInspectorCommentDraft,
  fetchInspectorComments,
  findObjectSelection,
  formatInspectorHint,
  groupSourceBlocksByPath,
  InlineInspectorLayer,
  resolveInlineSavedComment,
  submitInspectorComment,
  updateInspectorComment,
  useInspector,
  type InspectorState,
  type ObjectSelection,
} from "../src/openpress/workbench/inspector";
import { PublicPage, PublicViewer, type PageInspector } from "../src/openpress/reader";
import type { ReaderDocument } from "../src/openpress/document-model";
import type { InlineSavedComment } from "../src/openpress/workbench/workbenchTypes";

const documentFixture: ReaderDocument = {
  meta: { title: "Inspector Fixture" },
  source: {
    type: "openpress-press-tree-mdx",
    blockMap: {
      "b-intro-0": {
        id: "b-intro-0",
        kind: "element",
        name: "h2",
        chapterSlug: "intro",
        path: "document/chapters/01-intro/content/01-start.mdx",
        pageIndex: 0,
        pageNumber: 1,
        source: { line: 1, column: 1, endLine: 1, endColumn: 9 },
      },
    },
    objectEntities: {
      "mdx-block:b-intro-0": {
        id: "mdx-block:b-intro-0",
        kind: "mdx-block",
        label: "Intro block",
        blockId: "b-intro-0",
        source: {
          path: "document/chapters/01-intro/content/01-start.mdx",
          source: { line: 1, column: 1, endLine: 1, endColumn: 9 },
        },
      },
    },
  },
  blocks: [],
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("findObjectSelection", () => {
  it("finds the nearest openpress block id from nested click targets", () => {
    const container = document.createElement("div");
    container.innerHTML = '<article data-openpress-block-id="b-intro-0"><span>Title</span></article>';
    const nested = container.querySelector("span");

    expect(findObjectSelection(nested)).toEqual({ blockId: "b-intro-0", placement: "block" });
    expect(findObjectSelection(container)).toBeNull();
  });

  it("treats an insertion target as a comment before the next block", () => {
    const container = document.createElement("div");
    container.innerHTML = '<button data-openpress-insert-before-block-id="b-intro-0"><span>新增</span></button>';
    const nested = container.querySelector("span");

    expect(findObjectSelection(nested)).toEqual({ blockId: "b-intro-0", placement: "before" });
  });

  it("prefers rendered object entity ids over legacy block lookup", () => {
    const container = document.createElement("div");
    container.innerHTML = [
      '<section data-openpress-object-id="page:intro.1">',
      '<article data-openpress-block-id="b-intro-0" data-openpress-object-id="mdx-block:b-intro-0">',
      "<span>Title</span>",
      "</article>",
      "</section>",
    ].join("");
    const nested = container.querySelector("span");

    expect(findObjectSelection(nested, {
      "mdx-block:b-intro-0": {
        id: "mdx-block:b-intro-0",
        kind: "mdx-block",
        label: "Intro heading",
        blockId: "b-intro-0",
      },
    })).toMatchObject({
      objectId: "mdx-block:b-intro-0",
      blockId: "b-intro-0",
      placement: "block",
    });
  });

  it("keeps inline editable cell targets more precise than the table row object", () => {
    const container = document.createElement("div");
    container.innerHTML = [
      '<table>',
      '<tr data-openpress-block-id="b-table-row" data-openpress-object-id="mdx-block:b-table-row">',
      '<td data-openpress-block-id="b-table-row" data-openpress-object-id="mdx-block:b-table-row:cell:1" data-openpress-editable-block="true">',
      "<span>Cell</span>",
      "</td>",
      "</tr>",
      "</table>",
    ].join("");
    const nested = container.querySelector("span");

    expect(findObjectSelection(nested)).toMatchObject({
      objectId: "mdx-block:b-table-row:cell:1",
      blockId: "b-table-row",
      placement: "block",
    });
  });
});

describe("useInspector", () => {
  it("persists inspector mode and selects React block metadata from clicks", () => {
    render(<InspectorHarness />);

    expect(screen.getByTestId("mode").textContent).toBe("off");

    fireEvent.click(screen.getByRole("button", { name: "Toggle inspector" }));

    expect(screen.getByTestId("mode").textContent).toBe("on");
    expect(window.localStorage.getItem("openpress:test-inspector")).toBe("on");

    fireEvent.click(screen.getByRole("link", { name: "Intro block" }));

    expect(screen.getByTestId("selected").textContent).toBe("document/chapters/01-intro/content/01-start.mdx:1");
    expect(screen.getByTestId("anchor-navigation").textContent).toBe("idle");
  });

  it("passes clicks through while inspector mode is disabled", () => {
    render(<InspectorHarness />);

    fireEvent.click(screen.getByRole("link", { name: "Intro block" }));

    expect(screen.getByTestId("selected").textContent).toBe("none");
    expect(screen.getByTestId("anchor-navigation").textContent).toBe("navigated");
  });

  it("selects editable source from a non-block rendered object", () => {
    const documentWithTarget: ReaderDocument = {
      meta: { title: "Area Target" },
      source: {
        type: "openpress-press-tree-mdx",
        objectEntities: {
          "mdx-area:intro.1:chapter%3Aintro:0": {
            id: "mdx-area:intro.1:chapter%3Aintro:0",
            kind: "mdx-area",
            label: "Intro area",
            source: {
              path: "document/chapters/01-intro/content/01-start.mdx",
              source: { line: 4, column: 1 },
            },
          },
        },
      },
      blocks: [],
    };

    render(<InspectorAreaHarness document={documentWithTarget} />);
    fireEvent.click(screen.getByRole("button", { name: "Toggle inspector" }));
    fireEvent.click(screen.getByText("Area"));

    expect(screen.getByTestId("selected").textContent).toBe("document/chapters/01-intro/content/01-start.mdx:4");
  });
});

describe("submitInspectorComment", () => {
  it("posts selected React block metadata to the dev comment endpoint", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, comment: { id: "c-1", path: "document/chapters/01-intro/content/01-start.mdx" } }),
    } as Response));

    const block = documentFixture.source?.blockMap?.["b-intro-0"] ?? null;
    const result = await submitInspectorComment({
      draft: createInspectorCommentDraft({
        block,
        entity: documentFixture.source?.objectEntities?.["mdx-block:b-intro-0"] ?? null,
        target: { objectId: "mdx-block:b-intro-0:cell:1", blockId: "b-intro-0", placement: "block" },
        note: "請補例子",
        placement: "block",
      }),
      fetchImpl,
    });

    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith("/__openpress/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target: {
          objectId: "mdx-block:b-intro-0",
          targetObjectId: "mdx-block:b-intro-0:cell:1",
          kind: "mdx-block",
          label: "Intro block",
          blockId: "b-intro-0",
          path: "document/chapters/01-intro/content/01-start.mdx",
          source: { line: 1, column: 1, endLine: 1, endColumn: 9 },
        },
        note: "請補例子",
        hint: "openpress-react-inspector placement=block target=mdx-block%3Ab-intro-0%3Acell%3A1",
      }),
    });
  });

  it("rejects empty notes before posting", async () => {
    const fetchImpl = vi.fn();

    expect(() => createInspectorCommentDraft({
      block: documentFixture.source?.blockMap?.["b-intro-0"] ?? null,
      entity: null,
      note: " ",
      placement: "block",
    })).toThrow(/must not be empty/);

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts placement in the inspector hint without a separate intent", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response));

    await submitInspectorComment({
      draft: createInspectorCommentDraft({
        block: documentFixture.source?.blockMap?.["b-intro-0"] ?? null,
        entity: null,
        note: "請新增：在這裡補一段練習題",
        placement: "before",
      }),
      fetchImpl,
    });

    const request = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      note: "請新增：在這裡補一段練習題",
      hint: "openpress-react-inspector placement=before",
    });
  });
});

describe("createInspectorCommentDraft validation", () => {
  it("rejects a draft with no selected block", () => {
    expect(() => createInspectorCommentDraft({
      block: null,
      entity: null,
      note: "anything",
      placement: "block",
    })).toThrow(/requires a selected object/);
  });

  it("rejects a draft whose block has no source path", () => {
    expect(() => createInspectorCommentDraft({
      block: {
        id: "b-no-path",
        kind: "element",
        name: "Orphan",
        path: "",
        source: { line: 5, column: 1 },
      },
      entity: null,
      note: "anything",
      placement: "block",
    })).toThrow(/no editable source location/);
  });

  it("rejects a draft whose block has no source.line", () => {
    expect(() => createInspectorCommentDraft({
      block: {
        id: "b-no-line",
        kind: "element",
        name: "Orphan",
        path: "document/chapters/01/content/01.mdx",
      },
      entity: null,
      note: "anything",
      placement: "block",
    })).toThrow(/no editable source location/);
  });

  it("falls back to block id when entity label is absent", () => {
    const draft = createInspectorCommentDraft({
      block: {
        id: "b-fallback",
        kind: "element",
        name: undefined,
        path: "document/chapters/01/content/01.mdx",
        source: { line: 3, column: 1 },
      },
      entity: null,
      note: "fallback note",
      placement: "block",
    });
    expect(draft.label).toBe("b-fallback");
    expect(draft.entityRef).toEqual({ id: "b-fallback", kind: "mdx-block" });
  });
});

describe("formatInspectorHint", () => {
  it("keeps inspector comment metadata compact and parseable", () => {
    expect(formatInspectorHint({ placement: "block" })).toBe("openpress-react-inspector placement=block");
    expect(formatInspectorHint({
      placement: "block",
      targetObjectId: "mdx-block:b-table-row:cell:1",
    })).toBe("openpress-react-inspector placement=block target=mdx-block%3Ab-table-row%3Acell%3A1");
  });
});

describe("comment list helpers", () => {
  it("fetches pending comments from the dev endpoint", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        comments: [{ id: "c-1", path: "document/chapters/01-intro/content/01-start.mdx", line: 3, note: "修改這段" }],
      }),
    } as Response));

    const comments = await fetchInspectorComments({ fetchImpl });

    expect(comments).toEqual([
      { id: "c-1", path: "document/chapters/01-intro/content/01-start.mdx", line: 3, note: "修改這段" },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith("/__openpress/comment", { method: "GET" });
  });

  it("clears one pending comment through the dev endpoint", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, removedCount: 1 }),
    } as Response));

    const result = await clearInspectorComment({ id: "c-1", fetchImpl });

    expect(result.removedCount).toBe(1);
    expect(fetchImpl).toHaveBeenCalledWith("/__openpress/comment", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "c-1" }),
    });
  });

  it("updates an existing source comment through the dev endpoint", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, comment: { id: "c-1", note: "更新註解" } }),
    } as Response));

    const result = await updateInspectorComment({
      id: "c-1",
      note: "更新註解",
      placement: "block",
      fetchImpl,
    });

    expect(result.comment?.id).toBe("c-1");
    expect(fetchImpl).toHaveBeenCalledWith("/__openpress/comment", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "c-1",
        note: "更新註解",
        hint: "openpress-react-inspector placement=block",
      }),
    });
  });

  it("resolves document-prefixed comment paths against exported source block paths", () => {
    const sourceBlocksByPath = groupSourceBlocksByPath({
      "b-intro-0": {
        id: "b-intro-0",
        path: "chapters/01-intro/content/01-start.mdx",
        source: { line: 1, column: 1 },
      },
    });

    expect(resolveInlineSavedComment({
      id: "c-1",
      path: "document/chapters/01-intro/content/01-start.mdx",
      line: 1,
      note: "請修改",
      hint: "openpress-react-inspector placement=block target=mdx-block%3Ab-intro-0%3Acell%3A1",
    }, sourceBlocksByPath)).toMatchObject([
      {
        id: "c-1",
        objectId: "mdx-block:b-intro-0:cell:1",
        blockId: "b-intro-0",
        placement: "block",
      },
    ]);
  });
});

describe("PublicPage inspector delegation", () => {
  it("lets inspector clicks win over internal anchor navigation", () => {
    const handleClick: PageInspector["handleClick"] = vi.fn((event) => {
      event.preventDefault();
      return true;
    });
    const navigate = vi.fn();

    render(
      <PublicPage
        pages={[
          {
            id: "page-1",
            title: "Page",
            pageNumber: 1,
            frameKey: "intro.1",
            html: '<section class="reader-page"><a href="#target" data-openpress-block-id="b-intro-0">Intro anchor</a></section>',
            anchors: ["target"],
          },
        ]}
        currentPageIndex={0}
        devMode={false}
        sourceContainerRef={createRef<HTMLDivElement>()}
        registerPage={() => () => undefined}
        inspector={{ enabled: true, handleClick }}
        onInternalAnchorNavigate={navigate}
      />,
    );

    fireEvent.click(screen.getByRole("link", { name: "Intro anchor" }));

    expect(document.querySelector(".openpress-html-page")?.getAttribute("data-openpress-object-id")).toBe("page:intro.1");
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("InlineInspectorLayer", () => {
  it("uses intents as the pre-composer step and locks scroll events while composing", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function getTestRect(this: HTMLElement) {
      if (this.classList.contains("openpress-html-page")) return testRect(80, 80, 420, 760);
      if (this.dataset.openpressBlockId === "b-intro-0") return testRect(140, 160, 240, 64);
      if (this.dataset.openpressBlockId === "b-intro-1") return testRect(140, 260, 240, 64);
      return testRect(0, 0, 1024, 768);
    });

    render(<InlineInspectorLayerHarness />);

    const addIntent = await screen.findByLabelText("Add");
    expect(addIntent).toBeTruthy();

    fireEvent.click(addIntent);

    const composer = await screen.findByRole("textbox", { name: "新增註解" });
    expect((composer as HTMLTextAreaElement).value).toBe("請新增：");
    expect(screen.queryByLabelText("Add")).toBeNull();
    expect(screen.queryByLabelText("Edit")).toBeNull();
    expect(screen.queryByLabelText("Remove")).toBeNull();

    const outsideWheel = new Event("wheel", { bubbles: true, cancelable: true });
    expect(window.dispatchEvent(outsideWheel)).toBe(false);
    expect(outsideWheel.defaultPrevented).toBe(true);

    const insideWheel = new Event("wheel", { bubbles: true, cancelable: true });
    expect(composer.dispatchEvent(insideWheel)).toBe(true);
    expect(insideWheel.defaultPrevented).toBe(false);
  });

  it("keeps markers circular and labels draft markers after existing comments", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function getTestRect(this: HTMLElement) {
      if (this.classList.contains("openpress-html-page")) return testRect(80, 80, 420, 760);
      if (this.dataset.openpressBlockId === "b-intro-0") return testRect(140, 160, 240, 64);
      if (this.dataset.openpressBlockId === "b-intro-1") return testRect(140, 260, 240, 64);
      if (this.dataset.openpressBlockId === "b-intro-2") return testRect(140, 360, 240, 64);
      if (this.dataset.openpressBlockId === "b-intro-3") return testRect(140, 460, 240, 64);
      return testRect(0, 0, 1024, 768);
    });

    render(
      <InlineInspectorLayerHarness
        objectIds={{
          first: "mdx-block:z-top",
          second: "mdx-block:a-middle",
          third: "mdx-block:m-lower",
          fourth: "mdx-block:draft",
        }}
        selectedTarget={{ objectId: "mdx-block:draft", blockId: "b-intro-3", placement: "block" }}
        savedComments={[
          {
            id: "c-middle",
            objectId: "mdx-block:a-middle",
            blockId: "b-intro-1",
            placement: "block",
            note: "Middle note",
          },
          {
            id: "c-top-a",
            objectId: "mdx-block:z-top",
            blockId: "b-intro-0",
            placement: "block",
            note: "Top note",
          },
          {
            id: "c-lower",
            objectId: "mdx-block:m-lower",
            blockId: "b-intro-2",
            placement: "block",
            note: "Lower note",
          },
        ]}
      />,
    );

    await screen.findByLabelText(/目前選取區塊 4/);
    const markers = Array.from(document.querySelectorAll<HTMLElement>("[data-openpress-inline-comment-marker]"));

    expect(markers).toHaveLength(4);
    expect(markers.map((marker) => marker.getAttribute("data-openpress-inline-comment-marker-block-id"))).toEqual([
      "b-intro-0",
      "b-intro-1",
      "b-intro-2",
      "b-intro-3",
    ]);
    expect(markers.map((marker) => marker.getAttribute("data-openpress-marker-label"))).toEqual(["2", "1", "3", "4"]);
    expect(markers.map((marker) => marker.textContent)).toEqual(["2", "1", "3", "4"]);
    expect(markers[3]?.getAttribute("data-openpress-marker-state")).toBe("draft");
    expect(markers.every((marker) => Boolean(marker.querySelector(".openpress-inline-comment-marker__index")))).toBe(true);
    expect(markers[0]?.getAttribute("style")).toContain("top: 160px");
    expect(markers[0]?.getAttribute("style")).toContain("left: 104px");
    expect(markers[0]?.getAttribute("style")).toContain("width: 36px");
    expect(markers[0]?.getAttribute("style")).toContain("height: 64px");
  });

  it("labels a draft marker after unresolved pending comments", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function getTestRect(this: HTMLElement) {
      if (this.dataset.openpressBlockId === "b-intro-0") return testRect(140, 160, 240, 64);
      return testRect(0, 0, 1024, 768);
    });

    render(<InlineInspectorLayerHarness savedCommentTotalCount={3} />);

    const draftMarker = await screen.findByLabelText("目前選取區塊 4");
    expect(draftMarker.getAttribute("data-openpress-marker-label")).toBe("4");
    expect(draftMarker.textContent).toBe("4");
  });

  it("refreshes composer geometry when the page scale changes without a resize event", async () => {
    let pageScale = 1;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function getTestRect(this: HTMLElement) {
      if (this.dataset.openpressBlockId === "b-intro-0") {
        return testRect(140 * pageScale, 160 * pageScale, 240 * pageScale, 64 * pageScale);
      }
      if (this.dataset.openpressBlockId === "b-intro-1") {
        return testRect(140 * pageScale, 260 * pageScale, 240 * pageScale, 64 * pageScale);
      }
      return testRect(0, 0, 1024, 768);
    });

    const { rerender } = render(<InlineInspectorLayerHarness geometryVersion={pageScale} />);

    await screen.findByLabelText("Add");
    const composer = document.querySelector<HTMLElement>("[data-openpress-inline-comment-composer]");
    expect(composer?.getAttribute("style")).toContain("top: 94px");
    expect(composer?.getAttribute("style")).toContain("left: 114px");

    pageScale = 0.5;
    rerender(<InlineInspectorLayerHarness geometryVersion={pageScale} />);

    await waitFor(() => {
      expect(composer?.getAttribute("style")).toContain("top: 14px");
      expect(composer?.getAttribute("style")).toContain("left: 16px");
    });
  });
});

describe("Press Tree reader rendering", () => {
  it("renders supplied page HTML without client-side heading or caption mutation", () => {
    render(
      <PublicViewer
        document={{
          meta: { title: "Press Tree Doc" },
          source: {
            type: "openpress-press-tree-mdx",
          },
          blocks: [],
        }}
        pages={[
          {
            id: "page-1",
            kind: "htmlPage",
            title: "Page",
            pageNumber: 1,
            html: [
              '<section class="reader-page reader-page--content" data-page-kind="content">',
              '<div class="page-frame"><main class="page-body">',
              '<h2 id="intro">Intro</h2>',
              '<figure><figcaption>Original caption</figcaption></figure>',
              '</main></div>',
              '</section>',
            ].join(""),
          },
        ]}
        style={{}}
      />,
    );

    const heading = document.querySelector("h2#intro");
    const caption = document.querySelector("figcaption");
    expect(heading?.hasAttribute("data-chapter")).toBe(false);
    expect(caption?.textContent).toBe("Original caption");
  });
});

function InspectorHarness() {
  const inspector = useInspector(documentFixture, {
    enabled: true,
    storageKey: "openpress:test-inspector",
  });
  const anchorNavigation = useAnchorNavigationState(inspector);

  return (
    <section>
      <button type="button" onClick={inspector.toggleInspectorMode}>
        Toggle inspector
      </button>
      <div data-testid="mode">{inspector.inspectorMode ? "on" : "off"}</div>
      <div data-testid="selected">
        {inspector.selectedBlock
          ? `${inspector.selectedBlock.path}:${inspector.selectedBlock.source?.line ?? "?"}`
          : "none"}
      </div>
      <div data-testid="anchor-navigation">{anchorNavigation.label}</div>
      <a
        href="#intro"
        data-openpress-block-id="b-intro-0"
        onClick={(event) => {
          const handled = inspector.handleClick(event);
          if (!handled) anchorNavigation.navigate();
        }}
      >
        Intro block
      </a>
    </section>
  );
}

function InspectorAreaHarness({ document }: { document: ReaderDocument }) {
  const inspector = useInspector(document, {
    enabled: true,
    storageKey: "openpress:test-area-inspector",
  });

  return (
    <section>
      <button type="button" onClick={inspector.toggleInspectorMode}>
        Toggle inspector
      </button>
      <div data-testid="selected">
        {inspector.selectedBlock
          ? `${inspector.selectedBlock.path}:${inspector.selectedBlock.source?.line ?? "?"}`
          : "none"}
      </div>
      <button
        type="button"
        data-openpress-object-id="mdx-area:intro.1:chapter%3Aintro:0"
        onClick={inspector.handleClick}
      >
        Area
      </button>
    </section>
  );
}

function InlineInspectorLayerHarness({
  objectIds = { first: "mdx-block:b-intro-0", second: undefined, third: undefined, fourth: undefined },
  savedComments = [],
  savedCommentTotalCount,
  selectedTarget: initialSelectedTarget = { objectId: "mdx-block:b-intro-0", blockId: "b-intro-0", placement: "block" },
  geometryVersion,
}: {
  objectIds?: { first: string; second?: string; third?: string; fourth?: string };
  savedComments?: InlineSavedComment[];
  savedCommentTotalCount?: number;
  selectedTarget?: ObjectSelection;
  geometryVersion?: unknown;
} = {}) {
  const sourceContainerRef = useRef<HTMLDivElement | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<ObjectSelection>(initialSelectedTarget);
  const [text, setText] = useState("");
  const inspector: InspectorState = {
    enabled: true,
    inspectorMode: true,
    selectedBlockId: selectedTarget.blockId ?? null,
    selectedBlock: null,
    selectedObjectEntity: null,
    selectedSelection: selectedTarget,
    selectedTarget,
    setInspectorMode: vi.fn(),
    toggleInspectorMode: vi.fn(),
    selectSelection: (target) => {
      if (target?.blockId === "b-intro-0" && target.placement === "block") {
        setSelectedTarget({ objectId: target.objectId ?? objectIds.first, blockId: "b-intro-0", placement: "block" });
      }
      return null;
    },
    inspectSelection: vi.fn(() => null),
    selectTarget: vi.fn(() => null),
    inspectTarget: vi.fn(() => null),
    handleClick: vi.fn(() => false),
  };

  return (
    <>
      <div ref={sourceContainerRef}>
        <div className="openpress-html-page">
          <p data-openpress-block-id="b-intro-0" data-openpress-object-id={objectIds.first}>Block</p>
          <p data-openpress-block-id="b-intro-1" data-openpress-object-id={objectIds.second}>Next</p>
          {objectIds.third ? <p data-openpress-block-id="b-intro-2" data-openpress-object-id={objectIds.third}>Third</p> : null}
          {objectIds.fourth ? <p data-openpress-block-id="b-intro-3" data-openpress-object-id={objectIds.fourth}>Fourth</p> : null}
        </div>
      </div>
      <InlineInspectorLayer
        sourceContainerRef={sourceContainerRef}
        inspector={inspector}
        comments={{
          saved: savedComments,
          active: null,
          status: "idle",
          statusMessage: "",
          totalCount: savedCommentTotalCount,
          onOpenSaved: vi.fn(),
          onRemoveSaved: vi.fn(async () => undefined),
        }}
        composer={{
          text,
          submitDisabled: !text.trim(),
          mentionItems: [],
          onTextChange: setText,
          onSubmit: vi.fn(async () => undefined),
        }}
        geometryVersion={geometryVersion}
      />
    </>
  );
}

function useAnchorNavigationState(inspector: InspectorState) {
  const [navigated, setNavigated] = useState(false);
  const label = inspector.selectedBlock ? "idle" : (navigated ? "navigated" : "idle");

  return {
    label,
    navigate() {
      setNavigated(true);
    },
  };
}

function testRect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  } as DOMRect;
}
