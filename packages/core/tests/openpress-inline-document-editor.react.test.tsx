import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRef } from "react";
import type { SourceBlock } from "../src/openpress/document-model";
import {
  useInlineDocumentEditor,
  type InlineDocumentEditStatus,
} from "../src/openpress/workbench/document/hooks/useInlineDocumentEditor";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useInlineDocumentEditor", () => {
  it("marks active editing state locally while a text block is focused", () => {
    const fetchEdit = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(null, { status: 204 }));
    const onStatusChange = vi.fn((_status: InlineDocumentEditStatus) => undefined);

    render(<InlineEditorHarness enabled fetchEdit={fetchEdit} onStatusChange={onStatusChange} />);

    const heading = screen.getByText("Old heading");
    fireEvent.focus(heading);

    expect(heading.dataset.openpressEditing).toBe("true");
    expect(onStatusChange).not.toHaveBeenCalledWith(expect.objectContaining({ state: "editing" }));
  });

  it("focuses editable text blocks from click so keyboard input stays local", () => {
    const fetchEdit = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(null, { status: 204 }));

    render(<InlineEditorHarness enabled fetchEdit={fetchEdit} />);

    const heading = screen.getByText("Old heading");
    fireEvent.mouseDown(heading.firstChild ?? heading);

    expect(document.activeElement).toBe(heading);
  });

  it("places the caret inside editable text when the user clicks a block", () => {
    const fetchEdit = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(null, { status: 204 }));

    render(<InlineEditorHarness enabled fetchEdit={fetchEdit} />);

    const heading = screen.getByText("Old heading");
    window.getSelection()?.removeAllRanges();

    fireEvent.mouseDown(heading.firstChild ?? heading);

    const selection = window.getSelection();
    expect(document.activeElement).toBe(heading);
    expect(heading.contains(selection?.anchorNode ?? null)).toBe(true);
  });

  it("starts editing on pointer down without depending on a later focus event", () => {
    const fetchEdit = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(null, { status: 204 }));
    const onStatusChange = vi.fn((_status: InlineDocumentEditStatus) => undefined);

    render(<InlineEditorHarness enabled fetchEdit={fetchEdit} onStatusChange={onStatusChange} />);

    const heading = screen.getByText("Old heading");
    vi.spyOn(heading, "focus").mockImplementation(() => undefined);

    fireEvent.mouseDown(heading.firstChild ?? heading);

    expect(heading.dataset.openpressEditing).toBe("true");
    expect(onStatusChange).not.toHaveBeenCalledWith(expect.objectContaining({ state: "editing" }));
  });

  it("marks source-mapped text blocks editable and saves text changes", async () => {
    const fetchEdit = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      ok: true,
      edit: { path: "chapters/01-intro/content/01-start.mdx", line: 1 },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const onStatusChange = vi.fn((_status: InlineDocumentEditStatus) => undefined);

    render(<InlineEditorHarness enabled fetchEdit={fetchEdit} onStatusChange={onStatusChange} />);

    const heading = screen.getByText("Old heading");
    const component = screen.getByTestId("component-block");

    expect(heading.getAttribute("contenteditable")).toBe("true");
    expect(heading.getAttribute("data-openpress-editable-block")).toBe("true");
    expect(heading.getAttribute("tabindex")).toBe("0");
    expect(component.getAttribute("contenteditable")).toBeNull();

    fireEvent.focus(heading);
    heading.textContent = "New heading";
    fireEvent.blur(heading);

    await waitFor(() => expect(fetchEdit).toHaveBeenCalledTimes(1));
    expect(fetchEdit).toHaveBeenCalledWith("/__openpress/source-edit", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }));

    const requestInit = fetchEdit.mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(requestInit.body));
    expect(payload).toEqual({
      blockId: "b-heading",
      path: "chapters/01-intro/content/01-start.mdx",
      kind: "element",
      name: "h2",
      source: { line: 1, column: 1, endLine: 1, endColumn: 15 },
      text: "New heading",
    });
    expect(heading.dataset.openpressEditState).toBe("saved");
    expect(onStatusChange).not.toHaveBeenCalledWith(expect.objectContaining({ state: "saving" }));
    expect(onStatusChange).not.toHaveBeenCalledWith(expect.objectContaining({ state: "saved" }));
  });

  it("keeps inline text save progress on the edited block without rerendering the document shell", async () => {
    let resolveEdit: (response: Response) => void = () => undefined;
    const fetchEdit = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => new Promise<Response>((resolve) => {
      resolveEdit = resolve;
    }));
    const onStatusChange = vi.fn((_status: InlineDocumentEditStatus) => undefined);

    render(<InlineEditorHarness enabled fetchEdit={fetchEdit as typeof fetch} onStatusChange={onStatusChange} />);

    const heading = screen.getByText("Old heading");
    fireEvent.focus(heading);
    heading.textContent = "New heading";
    fireEvent.blur(heading);

    expect(fetchEdit).toHaveBeenCalledTimes(1);
    expect(heading.dataset.openpressEditState).toBe("saving");
    expect(heading.getAttribute("aria-busy")).toBe("true");
    expect(onStatusChange).not.toHaveBeenCalledWith(expect.objectContaining({ state: "saving" }));

    resolveEdit(new Response(JSON.stringify({
      ok: true,
      edit: { path: "chapters/01-intro/content/01-start.mdx", line: 1 },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await waitFor(() => expect(heading.dataset.openpressEditState).toBe("saved"));
    expect(heading.getAttribute("aria-busy")).toBeNull();
    expect(heading.textContent).toBe("New heading");
    expect(onStatusChange).not.toHaveBeenCalledWith(expect.objectContaining({ state: "saved" }));
  });

  it("waits for document state sync before marking an inline edit saved", async () => {
    let resolveDocumentSync: () => void = () => undefined;
    const fetchEdit = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      ok: true,
      edit: { path: "chapters/01-intro/content/01-start.mdx", line: 1 },
      document: { path: "/openpress/document.json", pageCount: 1 },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const onDocumentEdited = vi.fn(() => new Promise<void>((resolve) => {
      resolveDocumentSync = resolve;
    }));

    render(<InlineEditorHarness enabled fetchEdit={fetchEdit} onDocumentEdited={onDocumentEdited} />);

    const heading = screen.getByText("Old heading");
    fireEvent.focus(heading);
    heading.textContent = "New heading";
    fireEvent.blur(heading);

    await waitFor(() => expect(onDocumentEdited).toHaveBeenCalledTimes(1));
    expect(heading.dataset.openpressEditState).toBe("saving");

    resolveDocumentSync();

    await waitFor(() => expect(heading.dataset.openpressEditState).toBe("saved"));
  });

  it("does not let editable remarking overwrite the original text while typing", async () => {
    const fetchEdit = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      ok: true,
      edit: { path: "chapters/01-intro/content/01-start.mdx", line: 1 },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    render(<InlineEditorHarness enabled fetchEdit={fetchEdit} />);

    const heading = screen.getByText("Old heading");
    fireEvent.focus(heading);
    heading.textContent = "New heading";
    await waitFor(() => expect(heading.dataset.openpressOriginalText).toBe("Old heading"));
    fireEvent.blur(heading);

    await waitFor(() => expect(fetchEdit).toHaveBeenCalledTimes(1));
  });

  it("saves the active text block when the user clicks outside even if blur is delayed", async () => {
    const fetchEdit = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      ok: true,
      edit: { path: "chapters/01-intro/content/01-start.mdx", line: 1 },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    render(<InlineEditorHarness enabled fetchEdit={fetchEdit} />);

    const heading = screen.getByText("Old heading");
    fireEvent.focus(heading);
    heading.textContent = "New heading";
    fireEvent.mouseDown(screen.getByRole("button", { name: "Outside" }));

    await waitFor(() => expect(fetchEdit).toHaveBeenCalledTimes(1));
    expect(heading.dataset.openpressEditState).toBe("saved");
  });

  it("edits table cells as plain text instead of opening the whole markdown row", async () => {
    const fetchEdit = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      ok: true,
      edit: { path: "chapters/01-intro/content/01-start.mdx", line: 7 },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const onOpenSourceBlock = vi.fn();

    render(<InlineEditorHarness enabled fetchEdit={fetchEdit} onOpenSourceBlock={onOpenSourceBlock} />);

    const cell = screen.getByText("Old cell");
    const row = screen.getByTestId("table-row");

    expect(row.getAttribute("data-openpress-source-editable-block")).toBeNull();
    expect(cell.getAttribute("contenteditable")).toBe("true");
    expect(cell.getAttribute("data-openpress-table-cell-index")).toBe("1");

    fireEvent.focus(cell);
    cell.textContent = "New cell";
    fireEvent.blur(cell);

    await waitFor(() => expect(fetchEdit).toHaveBeenCalledTimes(1));
    const requestInit = fetchEdit.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(requestInit.body))).toEqual({
      blockId: "b-table-row",
      path: "chapters/01-intro/content/01-start.mdx",
      kind: "table-cell",
      name: "td",
      source: { line: 7, column: 1, endLine: 7, endColumn: 24 },
      text: "New cell",
      cellIndex: 1,
    });
    expect(onOpenSourceBlock).not.toHaveBeenCalled();
  });

  it("edits table header cells as plain text", async () => {
    const fetchEdit = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      ok: true,
      edit: { path: "chapters/01-intro/content/01-start.mdx", line: 5 },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    render(<InlineEditorHarness enabled fetchEdit={fetchEdit} />);

    const headerCell = screen.getByText("Old header");

    expect(headerCell.getAttribute("contenteditable")).toBe("true");
    expect(headerCell.getAttribute("data-openpress-table-cell-index")).toBe("1");
    expect(headerCell.getAttribute("data-openpress-object-id")).toBe("mdx-block:b-table-header-row:cell:1");

    fireEvent.focus(headerCell);
    headerCell.textContent = "New header";
    fireEvent.blur(headerCell);

    await waitFor(() => expect(fetchEdit).toHaveBeenCalledTimes(1));
    const requestInit = fetchEdit.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(requestInit.body))).toEqual({
      blockId: "b-table-header-row",
      path: "chapters/01-intro/content/01-start.mdx",
      kind: "table-cell",
      name: "th",
      source: { line: 5, column: 1, endLine: 5, endColumn: 23 },
      text: "New header",
      cellIndex: 1,
    });
  });

  it("marks prose blocks with inline code editable as plain text", async () => {
    const fetchEdit = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      ok: true,
      edit: { path: "chapters/01-intro/content/01-start.mdx", line: 9 },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    render(<InlineEditorHarness enabled fetchEdit={fetchEdit} />);

    const paragraph = screen.getByTestId("inline-code-paragraph");
    expect(paragraph.getAttribute("contenteditable")).toBe("true");

    fireEvent.focus(paragraph);
    paragraph.textContent = "Move files into 老師要求/ and 參考資料/.";
    fireEvent.blur(paragraph);

    await waitFor(() => expect(fetchEdit).toHaveBeenCalledTimes(1));
    const requestInit = fetchEdit.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(requestInit.body))).toEqual(expect.objectContaining({
      blockId: "b-inline-code",
      kind: "element",
      name: "p",
      text: "Move files into 老師要求/ and 參考資料/.",
    }));
  });

  it("marks list items with inline code editable as plain text", () => {
    const fetchEdit = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(null, { status: 204 }));

    render(<InlineEditorHarness enabled fetchEdit={fetchEdit} />);

    const listItem = screen.getByTestId("inline-code-list-item");
    expect(listItem.getAttribute("contenteditable")).toBe("true");
    expect(listItem.getAttribute("data-openpress-editable-block")).toBe("true");
  });

  it("marks code blocks editable while preserving line breaks in the edit payload", async () => {
    const fetchEdit = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      ok: true,
      edit: { path: "chapters/01-intro/content/01-start.mdx", line: 13 },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    render(<InlineEditorHarness enabled fetchEdit={fetchEdit} />);

    const codeBlock = screen.getByTestId("code-block");
    expect(codeBlock.getAttribute("contenteditable")).toBe("true");
    expect(codeBlock.dataset.openpressPreserveLineBreaks).toBe("true");

    fireEvent.focus(codeBlock);
    codeBlock.textContent = "New prompt\n- first\n- second";
    fireEvent.blur(codeBlock);

    await waitFor(() => expect(fetchEdit).toHaveBeenCalledTimes(1));
    const requestInit = fetchEdit.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(requestInit.body))).toEqual(expect.objectContaining({
      blockId: "b-code",
      kind: "element",
      name: "pre",
      text: "New prompt\n- first\n- second",
    }));
  });

  it("marks source-mapped captions editable as plain text", () => {
    const fetchEdit = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(null, { status: 204 }));

    render(<InlineEditorHarness enabled fetchEdit={fetchEdit} />);

    const caption = screen.getByText("Table caption");
    expect(caption.getAttribute("contenteditable")).toBe("true");
    expect(caption.getAttribute("data-openpress-editable-block")).toBe("true");
  });

  it("edits MediaFigure caption props as plain text", async () => {
    const fetchEdit = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      ok: true,
      edit: { path: "chapters/01-intro/content/01-start.mdx", line: 20 },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    render(<InlineEditorHarness enabled fetchEdit={fetchEdit} />);

    const caption = screen.getByText("Old figure caption");
    const component = screen.getByTestId("media-figure-block");

    expect(component.getAttribute("contenteditable")).toBeNull();
    expect(caption.getAttribute("contenteditable")).toBe("true");
    expect(caption.getAttribute("data-openpress-block-id")).toBe("b-media-figure");
    expect(caption.getAttribute("data-openpress-edit-kind")).toBe("component-caption");

    fireEvent.focus(caption);
    caption.textContent = "New figure caption";
    fireEvent.blur(caption);

    await waitFor(() => expect(fetchEdit).toHaveBeenCalledTimes(1));
    const requestInit = fetchEdit.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(requestInit.body))).toEqual({
      blockId: "b-media-figure",
      path: "chapters/01-intro/content/01-start.mdx",
      kind: "component-caption",
      name: "MediaFigure",
      source: { line: 20, column: 1, endLine: 25, endColumn: 3 },
      text: "New figure caption",
    });
  });

  it("edits source-mapped Text objects as plain text", async () => {
    const fetchEdit = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      ok: true,
      edit: { path: "press/index.tsx", line: 30 },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    render(<InlineEditorHarness enabled fetchEdit={fetchEdit} />);

    const textObject = screen.getByText("Old slide title");

    expect(textObject.getAttribute("contenteditable")).toBe("true");
    expect(textObject.getAttribute("data-openpress-editable-block")).toBe("true");
    expect(textObject.getAttribute("data-openpress-block-id")).toBe("object-text:text:slide-01:title");

    fireEvent.focus(textObject);
    textObject.textContent = "New slide title";
    fireEvent.blur(textObject);

    await waitFor(() => expect(fetchEdit).toHaveBeenCalledTimes(1));
    const requestInit = fetchEdit.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(requestInit.body))).toEqual({
      blockId: "object-text:text:slide-01:title",
      path: "press/index.tsx",
      kind: "object-text",
      name: "text",
      source: { line: 30, column: 12, endLine: 30, endColumn: 27 },
      text: "New slide title",
    });
  });

  it("edits custom component caption props as plain text", async () => {
    const fetchEdit = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      ok: true,
      edit: { path: "chapters/01-intro/content/01-start.mdx", line: 27 },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    render(<InlineEditorHarness enabled fetchEdit={fetchEdit} />);

    const caption = screen.getByText("Old custom caption");
    const component = screen.getByTestId("custom-figure-block");

    expect(component.getAttribute("contenteditable")).toBeNull();
    expect(caption.getAttribute("contenteditable")).toBe("true");
    expect(caption.getAttribute("data-openpress-block-id")).toBe("b-custom-figure");
    expect(caption.getAttribute("data-openpress-edit-kind")).toBe("component-caption");

    fireEvent.focus(caption);
    caption.textContent = "New custom caption";
    fireEvent.blur(caption);

    await waitFor(() => expect(fetchEdit).toHaveBeenCalledTimes(1));
    const requestInit = fetchEdit.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(requestInit.body))).toEqual({
      blockId: "b-custom-figure",
      path: "chapters/01-intro/content/01-start.mdx",
      kind: "component-caption",
      name: "CustomFigure",
      source: { line: 27, column: 1, endLine: 27, endColumn: 41 },
      text: "New custom caption",
    });
  });

  it("restores the original text when editing is cancelled", () => {
    const fetchEdit = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(null, { status: 204 }));

    render(<InlineEditorHarness enabled fetchEdit={fetchEdit} />);

    const heading = screen.getByText("Old heading");
    fireEvent.focus(heading);
    heading.textContent = "Changed";
    fireEvent.keyDown(heading, { key: "Escape" });

    expect(heading.textContent).toBe("Old heading");
    expect(fetchEdit).not.toHaveBeenCalled();

    const paragraph = screen.getByText("Paragraph text");
    paragraph.textContent = "Programmatic change";
    fireEvent.keyDown(paragraph, { key: "Escape" });

    expect(paragraph.textContent).toBe("Paragraph text");
    expect(fetchEdit).not.toHaveBeenCalled();
  });

  it("leaves rendered component blocks out of plain text editing", () => {
    const fetchEdit = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(null, { status: 204 }));
    const onOpenSourceBlock = vi.fn();

    render(<InlineEditorHarness enabled fetchEdit={fetchEdit} onOpenSourceBlock={onOpenSourceBlock} />);

    const component = screen.getByTestId("component-block");

    expect(component.getAttribute("contenteditable")).toBeNull();
    expect(component.getAttribute("data-openpress-source-editable-block")).toBeNull();
    expect(component.getAttribute("role")).toBeNull();
    expect(component.getAttribute("tabindex")).toBeNull();

    fireEvent.click(component);

    expect(onOpenSourceBlock).not.toHaveBeenCalled();
  });
});

function InlineEditorHarness({
  enabled,
  fetchEdit,
  onStatusChange,
  onOpenSourceBlock,
  onDocumentEdited,
}: {
  enabled: boolean;
    fetchEdit: typeof fetch;
    onStatusChange?: (status: InlineDocumentEditStatus) => void;
    onOpenSourceBlock?: Parameters<typeof useInlineDocumentEditor>[0]["onOpenSourceBlock"];
    onDocumentEdited?: Parameters<typeof useInlineDocumentEditor>[0]["onDocumentEdited"];
}) {
  const sourceContainerRef = useRef<HTMLDivElement | null>(null);

  useInlineDocumentEditor({
    enabled,
    sourceContainerRef,
    sourceBlockMap: sourceBlockMapFixture(),
    fetchImpl: fetchEdit,
    onStatusChange,
    onOpenSourceBlock,
    onDocumentEdited,
  });

  return (
    <div ref={sourceContainerRef}>
      <h2 data-openpress-block-id="b-heading">Old heading</h2>
      <p data-openpress-block-id="b-paragraph">Paragraph text</p>
      <p data-openpress-block-id="b-inline-code" data-testid="inline-code-paragraph">
        Put files in <code>老師要求/</code> and <code>參考資料/</code>.
      </p>
      <ul>
        <li data-openpress-block-id="b-list-item" data-testid="inline-code-list-item">
          Check <code>reference</code> first
        </li>
      </ul>
      <pre data-openpress-block-id="b-code" data-testid="code-block"><code>Old prompt{"\n"}- item</code></pre>
      <table>
        <caption data-openpress-block-id="b-caption">Table caption</caption>
        <thead>
          <tr data-openpress-block-id="b-table-header-row" data-testid="table-header-row">
            <th>Header</th>
            <th>Old header</th>
          </tr>
        </thead>
        <tbody>
          <tr data-openpress-block-id="b-table-row" data-testid="table-row">
            <td>Keep</td>
            <td>Old cell</td>
          </tr>
        </tbody>
      </table>
      <div data-openpress-block-id="b-component" data-testid="component-block">
        <img alt="" src="/openpress/media/example.png" />
      </div>
      <div data-openpress-block-id="b-media-figure" data-testid="media-figure-block">
        <figure>
          <img alt="" src="/openpress/media/example.png" />
          <figcaption><span data-openpress-caption-label="figure">圖 1</span> Old figure caption</figcaption>
        </figure>
      </div>
      <div data-openpress-block-id="b-custom-figure" data-testid="custom-figure-block">
        <figure>
          <img alt="" src="/openpress/media/example.png" />
          <figcaption>Old custom caption</figcaption>
        </figure>
      </div>
      <p
        data-openpress-object-id="text:slide-01:title"
        data-openpress-object-kind="text"
        data-openpress-object-label="Slide title"
        data-openpress-object-source={JSON.stringify({
          path: "press/index.tsx",
          source: { line: 30, column: 12, endLine: 30, endColumn: 27 },
        })}
      >
        Old slide title
      </p>
      <button type="button">Outside</button>
    </div>
  );
}

function sourceBlockMapFixture(): Record<string, SourceBlock> {
  return {
    "b-heading": {
      id: "b-heading",
      kind: "element",
      name: "h2",
      path: "chapters/01-intro/content/01-start.mdx",
      source: { line: 1, column: 1, endLine: 1, endColumn: 15 },
    },
    "b-paragraph": {
      id: "b-paragraph",
      kind: "element",
      name: "p",
      path: "chapters/01-intro/content/01-start.mdx",
      source: { line: 3, column: 1, endLine: 3, endColumn: 15 },
    },
    "b-component": {
      id: "b-component",
      kind: "component",
      name: "HeroFigure",
      path: "chapters/01-intro/content/01-start.mdx",
      source: { line: 5, column: 1, endLine: 5, endColumn: 15 },
    },
    "b-media-figure": {
      id: "b-media-figure",
      kind: "component",
      name: "MediaFigure",
      path: "chapters/01-intro/content/01-start.mdx",
      source: { line: 20, column: 1, endLine: 25, endColumn: 3 },
    },
    "b-custom-figure": {
      id: "b-custom-figure",
      kind: "component",
      name: "CustomFigure",
      path: "chapters/01-intro/content/01-start.mdx",
      source: { line: 27, column: 1, endLine: 27, endColumn: 41 },
    },
    "b-inline-code": {
      id: "b-inline-code",
      kind: "element",
      name: "p",
      path: "chapters/01-intro/content/01-start.mdx",
      source: { line: 9, column: 1, endLine: 9, endColumn: 51 },
    },
    "b-list-item": {
      id: "b-list-item",
      kind: "list-item",
      name: "list-item",
      path: "chapters/01-intro/content/01-start.mdx",
      source: { line: 11, column: 1, endLine: 11, endColumn: 28 },
    },
    "b-code": {
      id: "b-code",
      kind: "element",
      name: "pre",
      path: "chapters/01-intro/content/01-start.mdx",
      source: { line: 13, column: 1, endLine: 16, endColumn: 4 },
    },
    "b-table-row": {
      id: "b-table-row",
      kind: "table-row",
      name: "tr",
      path: "chapters/01-intro/content/01-start.mdx",
      source: { line: 7, column: 1, endLine: 7, endColumn: 24 },
    },
    "b-table-header-row": {
      id: "b-table-header-row",
      kind: "table-row",
      name: "table-header-row",
      path: "chapters/01-intro/content/01-start.mdx",
      source: { line: 5, column: 1, endLine: 5, endColumn: 23 },
    },
    "b-caption": {
      id: "b-caption",
      kind: "element",
      name: "caption",
      path: "chapters/01-intro/content/01-start.mdx",
      source: { line: 18, column: 1, endLine: 18, endColumn: 38 },
    },
  };
}
