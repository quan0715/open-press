import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearInspectorComment,
  fetchInspectorComments,
  findInspectorTarget,
  formatInspectorHint,
  submitInspectorComment,
  updateInspectorComment,
  useInspector,
  type InspectorState,
} from "../src/openpress/inspector";
import { PublicPage, PublicViewer, type PageInspector } from "../src/openpress/publicPage";
import type { ReaderDocument } from "../src/openpress/types";

const documentFixture: ReaderDocument = {
  meta: { title: "Inspector Fixture" },
  source: {
    type: "openpress-react-mdx",
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

describe("findInspectorTarget", () => {
  it("finds the nearest openpress block id from nested click targets", () => {
    const container = document.createElement("div");
    container.innerHTML = '<article data-openpress-block-id="b-intro-0"><span>Title</span></article>';
    const nested = container.querySelector("span");

    expect(findInspectorTarget(nested)).toEqual({ blockId: "b-intro-0", placement: "block" });
    expect(findInspectorTarget(container)).toBeNull();
  });

  it("treats an insertion target as a comment before the next block", () => {
    const container = document.createElement("div");
    container.innerHTML = '<button data-openpress-insert-before-block-id="b-intro-0"><span>新增</span></button>';
    const nested = container.querySelector("span");

    expect(findInspectorTarget(nested)).toEqual({ blockId: "b-intro-0", placement: "before" });
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
});

describe("submitInspectorComment", () => {
  it("posts selected React block metadata to the dev comment endpoint", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, comment: { id: "c-1", path: "document/chapters/01-intro/content/01-start.mdx" } }),
    } as Response));

    const result = await submitInspectorComment({
      block: documentFixture.source?.blockMap?.["b-intro-0"] ?? null,
      note: "請補例子",
      fetchImpl,
    });

    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith("/__openpress/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target: {
          blockId: "b-intro-0",
          path: "document/chapters/01-intro/content/01-start.mdx",
          source: { line: 1, column: 1, endLine: 1, endColumn: 9 },
        },
        note: "請補例子",
        hint: "openpress-react-inspector",
      }),
    });
  });

  it("rejects empty notes before posting", async () => {
    const fetchImpl = vi.fn();

    await expect(submitInspectorComment({
      block: documentFixture.source?.blockMap?.["b-intro-0"] ?? null,
      note: " ",
      fetchImpl,
    })).rejects.toThrow(/must not be empty/);

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts comment intent and placement in the inspector hint", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response));

    await submitInspectorComment({
      block: documentFixture.source?.blockMap?.["b-intro-0"] ?? null,
      note: "在這裡補一段練習題",
      intent: "add",
      placement: "before",
      fetchImpl,
    });

    const request = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      note: "在這裡補一段練習題",
      hint: "openpress-react-inspector intent=add placement=before",
    });
  });
});

describe("formatInspectorHint", () => {
  it("keeps inspector comment metadata compact and parseable", () => {
    expect(formatInspectorHint({ intent: "delete", placement: "block" })).toBe(
      "openpress-react-inspector intent=delete placement=block",
    );
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
      intent: "edit",
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
        hint: "openpress-react-inspector intent=edit placement=block",
      }),
    });
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
            html: '<section class="reader-page"><a href="#target" data-openpress-block-id="b-intro-0">Intro anchor</a></section>',
            anchors: ["target"],
          },
        ]}
        currentPageIndex={0}
        devMode={false}
        paginatedReady
        sourceContainerRef={createRef<HTMLDivElement>()}
        registerPage={() => () => undefined}
        inspector={{ enabled: true, handleClick }}
        onInternalAnchorNavigate={navigate}
      />,
    );

    fireEvent.click(screen.getByRole("link", { name: "Intro anchor" }));

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("React pre-paginated reader metadata", () => {
  it("treats build-time paginated React documents as ready on first render", () => {
    render(
      <PublicViewer
        document={{
          meta: { title: "Pre-paginated React Doc" },
          source: {
            type: "openpress-react-mdx",
            pagination: { mode: "build-time-block-measurement" },
          },
          blocks: [],
        }}
        pages={[
          {
            id: "page-1",
            kind: "htmlPage",
            title: "Page",
            pageNumber: 1,
            html: '<section class="reader-page reader-page--report" data-page-kind="report"><h2 data-openpress-block-id="b-intro-0">Intro</h2></section>',
          },
        ]}
        style={{}}
      />,
    );

    expect(document.querySelector(".openpress-reader-app")?.getAttribute("data-openpress-pagination")).toBe("ready");
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
