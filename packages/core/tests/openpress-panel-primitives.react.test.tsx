import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Panel } from "../src/openpress/workbench/panels";

afterEach(() => cleanup());

describe("Panel primitives", () => {
  it("composes title, description, actions, sections, empty and error states", () => {
    render(
      <Panel aria-label="Project panel">
        <Panel.Header>
          <Panel.Kicker>Project</Panel.Kicker>
          <Panel.Title>素材庫</Panel.Title>
          <Panel.Description>目前頁面的可用素材</Panel.Description>
          <Panel.Actions>
            <Panel.ActionButton type="button">同步</Panel.ActionButton>
          </Panel.Actions>
        </Panel.Header>
        <Panel.Body>
          <Panel.Error>讀取失敗</Panel.Error>
          <Panel.Section aria-label="Media">
            <Panel.SectionTitle>Media</Panel.SectionTitle>
            <Panel.SectionDescription>圖片與截圖</Panel.SectionDescription>
            <Panel.Empty>尚無圖片</Panel.Empty>
          </Panel.Section>
        </Panel.Body>
      </Panel>,
    );

    expect(screen.getByLabelText("Project panel").className).toContain("openpress-panel");
    expect(screen.getByRole("heading", { name: "素材庫" }).className).toContain("openpress-panel-title");
    expect(screen.getByText("目前頁面的可用素材").className).toContain("openpress-panel-description");
    expect(screen.getByRole("button", { name: "同步" }).className).toContain("openpress-panel-action-button");
    expect(screen.getByRole("alert").textContent).toBe("讀取失敗");
    expect(screen.getByLabelText("Media").className).toContain("openpress-panel-section");
    expect(screen.getByText("尚無圖片").className).toContain("openpress-panel-empty");
  });
});
