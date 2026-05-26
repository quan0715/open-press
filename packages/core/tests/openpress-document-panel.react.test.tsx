import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DocumentPanel } from "../src/openpress/workbench/document/components/DocumentPanel";

afterEach(() => cleanup());

describe("DocumentPanel", () => {
  it("switches the right panel between comments and project content", () => {
    render(
      <DocumentPanel>
        <DocumentPanel.Tabs />
        <DocumentPanel.PendingComments>
          <p>Comment content</p>
        </DocumentPanel.PendingComments>
        <DocumentPanel.Project>
          <p>Project content</p>
        </DocumentPanel.Project>
      </DocumentPanel>,
    );

    expect(screen.queryByRole("tab", { name: "目錄" })).toBeNull();
    expect(screen.getByRole("tab", { name: "註解" }).getAttribute("aria-selected")).toBe("true");
    expect(panelForText("Comment content")?.hidden).toBe(false);
    expect(panelForText("Project content")?.hidden).toBe(true);

    fireEvent.click(screen.getByRole("tab", { name: "Project" }));

    expect(screen.getByRole("tab", { name: "Project" }).getAttribute("aria-selected")).toBe("true");
    expect(panelForText("Comment content")?.hidden).toBe(true);
    expect(panelForText("Project content")?.hidden).toBe(false);
  });
});

function panelForText(text: string) {
  return screen.getByText(text).closest<HTMLElement>("[role='tabpanel']");
}
