import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeploymentControl } from "../src/openpress/workbench/actions";

afterEach(() => cleanup());

describe("DeploymentControl", () => {
  it("keeps the toolbar button icon-only and confirms deployment in a dialog", () => {
    const onDeploy = vi.fn();

    render(
      <DeploymentControl
        info={{
          online: true,
          dirty: true,
          deployedAt: "2026-05-23T07:47:00.000Z",
          publicUrl: "https://openpress.example.com",
          pdf: "https://openpress.example.com/document.pdf",
          adapter: "cloudflare-pages",
        }}
        status="idle"
        onDeploy={onDeploy}
      />,
    );

    const trigger = screen.getByRole("button", { name: /重新部署/ });
    expect(trigger.textContent).toBe("");

    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "部署資訊" });
    expect(dialog.classList.contains("openpress-workbench-dialog")).toBe(true);
    expect(screen.getByText(/有更新/)).toBeTruthy();
    const source = screen.getByText("Cloudflare Pages");
    expect(source.closest(".openpress-workbench-dialog__title-meta")).toBeTruthy();
    expect(source.closest(".openpress-workbench-dialog__title-row")?.querySelector("h2")?.textContent).toBe("部署資訊");
    expect(screen.queryByText("來源")).toBeNull();
    expect(screen.getByRole("link", { name: "openpress.example.com" }).getAttribute("href")).toBe("https://openpress.example.com");
    expect(screen.getByRole("link", { name: "openpress.example.com/document.pdf" }).getAttribute("href")).toBe("https://openpress.example.com/document.pdf");
    expect(screen.getByText(/有更新/).getAttribute("data-openpress-deploy-status")).toBe("dirty");
    expect(dialog.querySelector(".openpress-deploy-dialog dl")?.getAttribute("data-openpress-deploy-align")).toBe("left-values");

    fireEvent.click(screen.getByRole("button", { name: "確認部署" }));

    expect(onDeploy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog", { name: "部署資訊" })).toBeNull();
  });

  it("marks the toolbar button busy while deploying", () => {
    render(
      <DeploymentControl
        info={{ online: true }}
        status="deploying"
        onDeploy={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: /部署中/ });
    expect(trigger.getAttribute("aria-busy")).toBe("true");
    expect(trigger.getAttribute("data-openpress-deploy-status")).toBe("deploying");
    expect(screen.getByRole("status").textContent).toContain("部署中");
  });

  it("portals the dialog outside toolbar layout containment", () => {
    const { container } = render(
      <header className="openpress-workbench-toolbar">
        <DeploymentControl
          info={{
            online: true,
            dirty: true,
            publicUrl: "https://openpress.example.com",
          }}
          status="idle"
          onDeploy={vi.fn()}
        />
      </header>,
    );

    fireEvent.click(screen.getByRole("button", { name: /重新部署/ }));

    const toolbar = container.querySelector(".openpress-workbench-toolbar");
    const dialog = screen.getByRole("dialog", { name: "部署資訊" });

    expect(toolbar?.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });
});
