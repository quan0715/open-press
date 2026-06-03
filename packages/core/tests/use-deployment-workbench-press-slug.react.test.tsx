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
  openPdfRef,
  deployRef,
}: {
  deploymentInfo: DeploymentInfo;
  pressSlug?: string | null;
  openPdfRef?: { current: (() => void) | null };
  deployRef?: { current: (() => Promise<void>) | null };
}) {
  const workbench = useDeploymentWorkbench({ deploymentInfo, pressSlug });
  if (openPdfRef) openPdfRef.current = workbench.handleOpenWorkbenchPdf;
  if (deployRef) deployRef.current = workbench.handleDeploy;
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
    const openPdfRef: { current: (() => void) | null } = { current: null };

    render(<Harness deploymentInfo={{ online: true }} pressSlug="slide" openPdfRef={openPdfRef} />);
    act(() => {
      openPdfRef.current?.();
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
    const openPdfRef: { current: (() => void) | null } = { current: null };

    render(<Harness deploymentInfo={{ online: true }} pressSlug={null} openPdfRef={openPdfRef} />);
    act(() => {
      openPdfRef.current?.();
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init?.body as string)).toEqual({});
  });
});

describe("useDeploymentWorkbench deploy", () => {
  it("sends { press: <slug> } in the deploy POST body when pressSlug is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        deployed_at: "2026-06-03T00:00:00.000Z",
        pdf: "https://sample.pages.dev/sample-report-slide.pdf",
        public_url: "https://sample.pages.dev",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const deployRef: { current: (() => Promise<void>) | null } = { current: null };

    render(<Harness deploymentInfo={{ online: true, configured: true }} pressSlug="slide" deployRef={deployRef} />);
    await act(async () => {
      await deployRef.current?.();
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/__openpress/deploy");
    expect(init?.method).toBe("POST");
    expect(init?.headers?.["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init?.body as string)).toEqual({ press: "slide" });
  });
});
