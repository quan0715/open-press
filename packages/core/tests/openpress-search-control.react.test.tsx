import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchControl } from "../src/openpress/workbench/actions";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  cleanup();
});

describe("SearchControl", () => {
  it("opens an icon-only read-only search dialog and searches all sources", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      kind: "search",
      query: "Needle",
      scope: "all",
      caseSensitive: false,
      matchCount: 1,
      files: [
        {
          scope: "source-implementation",
          file: "01-start.mdx",
          path: "press/chapters/01-intro/content/01-start.mdx",
          matchCount: 1,
        },
      ],
      matches: [
        {
          id: "match-0001",
          scope: "source-implementation",
          file: "01-start.mdx",
          path: "press/chapters/01-intro/content/01-start.mdx",
          line: 3,
          column: 1,
          index: 18,
          text: "Needle",
          preview: "Needle appears in MDX content.",
        },
      ],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    render(<SearchControl />);

    const trigger = screen.getByRole("button", { name: "搜尋文件" });
    expect(trigger.textContent).toBe("");

    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "搜尋文件" });
    expect(document.body.contains(dialog)).toBe(true);
    expect(dialog.classList.contains("openpress-workbench-dialog")).toBe(true);
    expect(dialog.querySelector(".openpress-workbench-dialog__title-row h2")?.textContent).toBe("搜尋文件");
    expect(screen.queryByText(/replace/i)).toBeNull();
    expect(screen.queryByRole("button", { name: "內容" })).toBeNull();
    expect(screen.queryByRole("button", { name: "全部來源" })).toBeNull();

    fireEvent.change(screen.getByRole("searchbox", { name: "搜尋文字" }), { target: { value: "Needle" } });
    fireEvent.submit(screen.getByRole("search", { name: "文件搜尋" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith("/__openpress/search?q=Needle&scope=all", expect.objectContaining({ cache: "no-store" }));
    expect(await screen.findByText("press/chapters/01-intro/content/01-start.mdx")).toBeTruthy();
    expect(screen.getByText("3:1")).toBeTruthy();
    expect(screen.getByText("Needle appears in MDX content.")).toBeTruthy();
  });

  it("searches automatically after the user pauses typing", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      kind: "search",
      query: "Needle",
      scope: "all",
      caseSensitive: false,
      matchCount: 1,
      files: [
        {
          scope: "content",
          file: "01-start.mdx",
          path: "press/chapters/01-intro/content/01-start.mdx",
          matchCount: 1,
        },
      ],
      matches: [
        {
          id: "match-0001",
          scope: "content",
          file: "01-start.mdx",
          path: "press/chapters/01-intro/content/01-start.mdx",
          line: 3,
          column: 1,
          index: 18,
          text: "Needle",
          preview: "Needle appears without submit.",
        },
      ],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    render(<SearchControl />);

    fireEvent.click(screen.getByRole("button", { name: "搜尋文件" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "搜尋文字" }), { target: { value: "Needle" } });

    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(280);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/__openpress/search?q=Needle&scope=all", expect.objectContaining({ cache: "no-store" }));
    expect(screen.getByText("Needle appears without submit.")).toBeTruthy();
  });

  it("aborts the in-flight live search when the query changes", async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      if (init?.signal) signals.push(init.signal);
      return new Promise<Response>(() => undefined);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SearchControl />);

    fireEvent.click(screen.getByRole("button", { name: "搜尋文件" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "搜尋文字" }), { target: { value: "Need" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(280);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(signals[0]?.aborted).toBe(false);

    fireEvent.change(screen.getByRole("searchbox", { name: "搜尋文字" }), { target: { value: "Needle" } });

    expect(signals[0]?.aborted).toBe(true);
  });

  it("jumps from a source match to the closest rendered page", async () => {
    const onSelectPage = vi.fn();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      kind: "search",
      query: "Needle",
      scope: "content",
      caseSensitive: false,
      matchCount: 1,
      files: [
        {
          scope: "content",
          file: "01-start.mdx",
          path: "press/chapters/01-intro/content/01-start.mdx",
          matchCount: 1,
        },
      ],
      matches: [
        {
          id: "match-0001",
          scope: "content",
          file: "01-start.mdx",
          path: "press/chapters/01-intro/content/01-start.mdx",
          line: 12,
          column: 7,
          index: 120,
          text: "Needle",
          preview: "Needle appears in the rendered page.",
        },
      ],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <SearchControl
        sourceBlocksByPath={{
          "chapters/01-intro/content/01-start.mdx": [
            {
              id: "b-intro-1",
              path: "chapters/01-intro/content/01-start.mdx",
              pageIndex: 2,
              pageNumber: 3,
              source: { line: 9, column: 1 },
            },
          ],
        }}
        onSelectPage={onSelectPage}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "搜尋文件" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "搜尋文字" }), { target: { value: "Needle" } });
    fireEvent.submit(screen.getByRole("search", { name: "文件搜尋" }));

    const result = await screen.findByRole("button", { name: /Needle appears in the rendered page/ });
    expect(result.textContent).toContain("P03");

    fireEvent.click(result);

    expect(onSelectPage).toHaveBeenCalledWith(2, { behavior: "smooth" });
    expect(screen.queryByRole("dialog", { name: "搜尋文件" })).toBeNull();
  });
});
