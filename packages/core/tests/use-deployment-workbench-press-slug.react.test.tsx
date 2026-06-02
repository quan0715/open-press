import { act, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDeploymentWorkbench } from "../src/openpress/workbench/actions";
import type { DeploymentInfo } from "../src/openpress/document-model";

afterEach(() => {
  vi.unstubAllGlobals();
});

function Harness({
  deploymentInfo,
  pressSlug = null,
  fireRef,
}: {
  deploymentInfo: DeploymentInfo;
  pressSlug?: string | null;
  fireRef: { current: (() => void) | null };
}) {
  const workbench = useDeploymentWorkbench({ deploymentInfo, pressSlug });
  fireRef.current = workbench.handleOpenWorkbenchPdf;
  return null;
}

function stubLocalWindow() {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      ...window.location,
      hostname: "127.0.0.1",
      assign: vi.fn(),
    },
  });
}

describe("useDeploymentWorkbench local PDF export", () => {
  it("sends { press: <slug> } in the POST body when pressSlug is provided", async () => {
    stubLocalWindow();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ pdf: "/__openpress/local-pdf-file?press=slide&ts=1" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const fireRef: { current: (() => void) | null } = { current: null };

    render(<Harness deploymentInfo={{ online: true }} pressSlug="slide" fireRef={fireRef} />);
    act(() => {
      fireRef.current?.();
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/__openpress/local-pdf-export");
    expect(init?.method).toBe("POST");
    expect(init?.headers?.["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init?.body as string)).toEqual({ press: "slide" });
  });

  it("sends an empty body when pressSlug is null (single-Press workspace)", async () => {
    stubLocalWindow();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ pdf: "/__openpress/local-pdf-file?ts=1" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const fireRef: { current: (() => void) | null } = { current: null };

    render(<Harness deploymentInfo={{ online: true }} pressSlug={null} fireRef={fireRef} />);
    act(() => {
      fireRef.current?.();
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init?.body as string)).toEqual({});
  });
});
