import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InlineSourceEditorLayer } from "../src/openpress/workbench/document/components/InlineSourceEditorLayer";
import type { InlineDocumentEditStatus, InlineDocumentSourceTarget } from "../src/openpress/workbench/document";

afterEach(() => {
  cleanup();
});

describe("InlineSourceEditorLayer", () => {
  it("loads raw source for a source-editable block and saves it in source mode", async () => {
    const fetchEdit = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!init || init.method === "GET") {
        return new Response(JSON.stringify({
          ok: true,
          source: {
            path: "chapters/01-intro/content/01-start.mdx",
            requestedPath: "chapters/01-intro/content/01-start.mdx",
            file: "01-start.mdx",
            text: "<HeroFigure tone=\"quiet\" />",
          },
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ ok: true, edit: { blockId: "b-component" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const onStatusChange = vi.fn((_status: InlineDocumentEditStatus) => undefined);
    const onClose = vi.fn();

    render(
      <InlineSourceEditorLayer
        target={sourceTargetFixture()}
        fetchImpl={fetchEdit}
        onClose={onClose}
        onStatusChange={onStatusChange}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Source 編輯" })).toBeTruthy();
    await waitFor(() => {
      expect((screen.getByLabelText("Source 內容") as HTMLTextAreaElement).value).toBe("<HeroFigure tone=\"quiet\" />");
    });

    fireEvent.change(screen.getByLabelText("Source 內容"), { target: { value: "<HeroFigure tone=\"bold\" />" } });
    fireEvent.click(screen.getByRole("button", { name: "儲存 source" }));

    await waitFor(() => expect(fetchEdit).toHaveBeenCalledTimes(2));
    expect(String(fetchEdit.mock.calls[0]?.[0])).toContain("/__openpress/source-edit?path=chapters%2F01-intro%2Fcontent%2F01-start.mdx");

    const requestInit = fetchEdit.mock.calls[1]?.[1] as RequestInit;
    expect(JSON.parse(String(requestInit.body))).toEqual({
      blockId: "b-component",
      path: "chapters/01-intro/content/01-start.mdx",
      kind: "component",
      name: "HeroFigure",
      source: { line: 5, column: 1, endLine: 5, endColumn: 29 },
      sourceMode: true,
      text: "<HeroFigure tone=\"bold\" />",
    });
    expect(onStatusChange).toHaveBeenCalledWith(expect.objectContaining({ state: "saving", blockId: "b-component" }));
    expect(onStatusChange).toHaveBeenCalledWith(expect.objectContaining({ state: "saved", blockId: "b-component" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("refreshes source editor position when page scale changes after opening", async () => {
    const fetchEdit = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      source: { text: "<HeroFigure />" },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    let pageScale = 1;
    const target = sourceTargetFixture();
    target.element.getBoundingClientRect = vi.fn(() =>
      sourceRect(120 * pageScale, 80 * pageScale, 200 * pageScale, 100 * pageScale),
    );

    const { rerender } = render(
      <InlineSourceEditorLayer
        target={target}
        fetchImpl={fetchEdit}
        onClose={vi.fn()}
        geometryVersion={pageScale}
      />,
    );

    const dialog = await screen.findByRole("dialog", { name: "Source 編輯" });
    expect(dialog.getAttribute("style")).toContain("left: 120px");
    expect(dialog.getAttribute("style")).toContain("top: 192px");

    pageScale = 0.5;
    rerender(
      <InlineSourceEditorLayer
        target={target}
        fetchImpl={fetchEdit}
        onClose={vi.fn()}
        geometryVersion={pageScale}
      />,
    );

    expect(dialog.getAttribute("style")).toContain("left: 60px");
    expect(dialog.getAttribute("style")).toContain("top: 102px");
  });
});

function sourceTargetFixture(): InlineDocumentSourceTarget {
  const element = document.createElement("div");
  return {
    element,
    rect: sourceRect(120, 80, 200, 100),
    block: {
      id: "b-component",
      kind: "component",
      name: "HeroFigure",
      path: "chapters/01-intro/content/01-start.mdx",
      source: { line: 5, column: 1, endLine: 5, endColumn: 29 },
    },
  };
}

function sourceRect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    top,
    left,
    right: left + width,
    bottom: top + height,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect;
}
