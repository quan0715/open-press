import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkbenchShell } from "../src/openpress/workbench/shell";

afterEach(() => cleanup());

function renderShell(overrides: Partial<{
  viewMode: string;
  inspectorMode: boolean;
  editMode: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
}> = {}) {
  const onToggleLeftPanel = overrides.onToggleLeftPanel ?? vi.fn();
  const onToggleRightPanel = overrides.onToggleRightPanel ?? vi.fn();
  const utils = render(
    <WorkbenchShell
      style={{}}
      viewMode={overrides.viewMode ?? "paged"}
      inspectorMode={overrides.inspectorMode ?? false}
      editMode={overrides.editMode ?? false}
      leftPanelOpen={overrides.leftPanelOpen ?? false}
      rightPanelOpen={overrides.rightPanelOpen ?? false}
      onToggleLeftPanel={onToggleLeftPanel}
      onToggleRightPanel={onToggleRightPanel}
    >
      <WorkbenchShell.Toolbar>Toolbar actions</WorkbenchShell.Toolbar>
      <WorkbenchShell.LeftPanel>Navigation state</WorkbenchShell.LeftPanel>
      <WorkbenchShell.MainContent>Main stage</WorkbenchShell.MainContent>
      <WorkbenchShell.RightPanel>Comment project panel</WorkbenchShell.RightPanel>
    </WorkbenchShell>,
  );
  return { ...utils, onToggleLeftPanel, onToggleRightPanel };
}

describe("WorkbenchShell", () => {
  it("renders a compact toolbar with separate left and control panels", () => {
    const { onToggleLeftPanel, onToggleRightPanel } = renderShell();

    expect(screen.getByTestId("workbench-shell")).toBeTruthy();
    expect(screen.getByRole("toolbar", { name: "工作台操作" }).textContent).toContain("Toolbar actions");
    expect(screen.getByLabelText("文件導覽").textContent).toContain("Navigation state");
    expect(screen.getByLabelText("控制面板").textContent).toContain("Comment project panel");
    expect(screen.getByLabelText("主要內容").textContent).toContain("Main stage");

    fireEvent.click(screen.getByRole("button", { name: "展開左側面板" }));
    fireEvent.click(screen.getByRole("button", { name: "展開右側面板" }));

    expect(onToggleLeftPanel).toHaveBeenCalledTimes(1);
    expect(onToggleRightPanel).toHaveBeenCalledTimes(1);
  });

  it("swaps toolbar button labels and panel-open data attributes when panels are open", () => {
    renderShell({ leftPanelOpen: true, rightPanelOpen: true });

    const collapseLeft = screen.getByRole("button", { name: "收合左側面板" });
    const collapseRight = screen.getByRole("button", { name: "收合右側面板" });
    expect(collapseLeft.getAttribute("data-openpress-panel-open")).toBe("true");
    expect(collapseRight.getAttribute("data-openpress-panel-open")).toBe("true");
  });

  it("exposes runtime mode flags as data attributes", () => {
    renderShell({ inspectorMode: true, editMode: true, viewMode: "scroll" });

    const shell = screen.getByTestId("workbench-shell");
    expect(shell.getAttribute("data-openpress-view-mode")).toBe("scroll");
    expect(shell.getAttribute("data-openpress-inspector-mode")).toBe("on");
    expect(shell.getAttribute("data-openpress-edit-mode")).toBe("on");
  });

  it("renders a scrim that toggles the right panel when it is open", () => {
    const onToggleRightPanel = vi.fn();
    const { container } = renderShell({ rightPanelOpen: true, onToggleRightPanel });

    const scrim = container.querySelector(".openpress-public-scrim");
    expect(scrim).not.toBeNull();
    fireEvent.click(scrim as Element);
    expect(onToggleRightPanel).toHaveBeenCalledTimes(1);
  });

  it("omits the scrim when the right panel is closed", () => {
    const { container } = renderShell({ rightPanelOpen: false });
    expect(container.querySelector(".openpress-public-scrim")).toBeNull();
  });

  it("renders a drawer close button inside the right panel that calls the toggle", () => {
    const onToggleRightPanel = vi.fn();
    renderShell({ rightPanelOpen: true, onToggleRightPanel });

    fireEvent.click(screen.getByRole("button", { name: "關閉右側面板" }));
    // Both the scrim and the close button can call the toggle; we only assert at least one call.
    expect(onToggleRightPanel).toHaveBeenCalled();
  });

  it("throws when compound parts render outside <WorkbenchShell>", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => render(<WorkbenchShell.Toolbar>orphan</WorkbenchShell.Toolbar>)).toThrow(
        /compound components must be rendered inside <WorkbenchShell>/,
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("aliases WorkbenchShell.ControlPanel to WorkbenchShell.RightPanel", () => {
    expect(WorkbenchShell.ControlPanel).toBe(WorkbenchShell.RightPanel);
  });
});
