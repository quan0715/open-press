import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PendingCommentsPanel } from "../src/openpress/workbench/panels";

afterEach(() => cleanup());

describe("PendingCommentsPanel", () => {
  it("keeps comment entries compact by hiding intent and placement helper chips", () => {
    render(
      <PendingCommentsPanel
        comments={[{
          id: "comment-1",
          path: "document/content/page.tsx",
          line: 12,
          note: "請把這段改短一點，避免頁面太擠。",
          hint: "openpress-react-inspector intent=edit placement=block",
        }]}
        status="ready"
        error=""
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByText("請把這段改短一點，避免頁面太擠。")).toBeTruthy();
    expect(screen.queryByText("Edit")).toBeNull();
    expect(screen.queryByText("針對目前區塊")).toBeNull();
  });

  it("does not render refresh or clear-all actions in the panel header", () => {
    render(
      <PendingCommentsPanel
        comments={[]}
        status="ready"
        error=""
        onClear={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "重新整理" })).toBeNull();
    expect(screen.queryByRole("button", { name: "清空全部" })).toBeNull();
    expect(screen.queryByLabelText("註解操作")).toBeNull();
  });

  it("can jump to a pending comment target from the compact list", () => {
    const comment = {
      id: "comment-1",
      path: "document/content/page.tsx",
      line: 12,
      note: "請把這段改短一點，避免頁面太擠。",
    };
    const select = vi.fn();

    render(
      <PendingCommentsPanel
        comments={[comment]}
        status="ready"
        error=""
        onClear={vi.fn()}
        onSelect={select}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "跳到註解 comment-1" }));

    expect(select).toHaveBeenCalledWith(comment);
  });
});
