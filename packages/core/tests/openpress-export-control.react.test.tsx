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
  it("places Word export under the export menu without a zoom-menu check slot", () => {
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

    expect(onExportWord).toHaveBeenCalledTimes(1);
  });
});
