import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExportControl } from "../src/openpress/workbench/actions";
import type { HtmlPageBlock } from "../src/openpress/document-model";

afterEach(() => cleanup());

const pages: HtmlPageBlock[] = [
  {
    id: "page-01",
    kind: "htmlPage",
    title: "Page 1",
    pageNumber: 1,
    html: "<main>Page 1</main>",
  },
];

describe("ExportControl", () => {
  it("opens a Word export dialog from the export menu without a zoom-menu check slot", () => {
    const onExportWord = vi.fn();

    render(
      <ExportControl
        pages={pages}
        currentPageIndex={0}
        pressTitle="Test Press"
        onExportPdf={vi.fn()}
        onExportWord={onExportWord}
        wordActionStatus="idle"
      />,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: "匯出" }), { key: "ArrowDown" });

    const wordItem = screen.getByRole("menuitem", { name: /Word DOCX/ });
    expect(document.body.querySelector(".op-workspace-zoom-menu-check")).toBeNull();

    fireEvent.click(wordItem);

    expect(onExportWord).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Word DOCX" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /匯出 1 頁/ }));

    expect(onExportWord).toHaveBeenCalledWith({ mode: "visual", pageIndexes: [0] });
  });

  it("exports editable semantic Word from the Word dialog option", () => {
    const onExportWord = vi.fn();

    render(
      <ExportControl
        pages={pages}
        currentPageIndex={0}
        pressTitle="Test Press"
        onExportPdf={vi.fn()}
        onExportWord={onExportWord}
        wordActionStatus="idle"
      />,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: "匯出" }), { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("menuitem", { name: /Word DOCX/ }));
    fireEvent.click(screen.getByText("可編輯"));
    fireEvent.click(screen.getByRole("button", { name: /匯出可編輯 DOCX/ }));

    expect(onExportWord).toHaveBeenCalledWith({ mode: "semantic" });
  });

  it("uses the same footer-only loading treatment for Word export progress", () => {
    const props = {
      pages,
      currentPageIndex: 0,
      pressTitle: "Test Press",
      onExportPdf: vi.fn(),
      onExportWord: vi.fn(),
    };
    const { rerender } = render(
      <ExportControl
        {...props}
        wordActionStatus="idle"
      />,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: "匯出" }), { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("menuitem", { name: /Word DOCX/ }));
    rerender(
      <ExportControl
        {...props}
        wordActionStatus="generating"
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Word DOCX" });
    expect(dialog.querySelector('[data-openpress-export-status="generating"]')).toBeTruthy();
    expect(dialog.querySelector('[class*="min-w-[132px]"]')).toBeNull();
  });
});
