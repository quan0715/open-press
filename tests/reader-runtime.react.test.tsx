import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useQDocReaderRuntime } from "../src/qdoc/readerRuntime";

type MockIntersectionEntry = {
  target: Element;
  isIntersecting?: boolean;
  intersectionRatio?: number;
};

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  observed: Element[] = [];

  constructor(
    private readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    MockIntersectionObserver.instances.push(this);
  }

  observe = (target: Element) => {
    this.observed.push(target);
  };

  unobserve = (target: Element) => {
    this.observed = this.observed.filter((entry) => entry !== target);
  };

  disconnect = () => {
    this.observed = [];
  };

  takeRecords = () => [];

  emit(entries: MockIntersectionEntry[]) {
    this.callback(
      entries.map((entry) => ({
        boundingClientRect: entry.target.getBoundingClientRect(),
        intersectionRatio: entry.intersectionRatio ?? 0,
        intersectionRect: entry.target.getBoundingClientRect(),
        isIntersecting: entry.isIntersecting ?? false,
        rootBounds: null,
        target: entry.target,
        time: performance.now(),
      })) as IntersectionObserverEntry[],
      this as unknown as IntersectionObserver,
    );
  }
}

const scrollIntoView = vi.fn();

beforeEach(() => {
  cleanup();
  MockIntersectionObserver.instances = [];
  window.history.replaceState(null, "", "/");
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 1200 });
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollIntoView,
  });
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  scrollIntoView.mockReset();
});

function latestObserver() {
  return MockIntersectionObserver.instances.at(-1);
}

function emitVisible(pageIndex: number, ratio = 0.9) {
  const observer = latestObserver();
  if (!observer) throw new Error("No IntersectionObserver instance");
  observer.emit([
    {
      target: screen.getByTestId(`reader-page-${pageIndex}`),
      isIntersecting: true,
      intersectionRatio: ratio,
    },
  ]);
}

async function flushDebounce() {
  // readerScroll debounces IO with setTimeout(100).
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 120));
  });
}

describe("useQDocReaderRuntime", () => {
  it("setPage scrolls to the target page imperatively", async () => {
    render(<ReaderRuntimeHarness />);
    await waitFor(() => expect(latestObserver()?.observed.length).toBe(4));
    scrollIntoView.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Go to page 3" }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("currentPageIndex follows the IntersectionObserver visible page", async () => {
    render(<ReaderRuntimeHarness />);
    await waitFor(() => expect(latestObserver()?.observed.length).toBe(4));

    emitVisible(2);
    await flushDebounce();

    expect(screen.getByTestId("current-page").textContent).toBe("03");
  });

  it("mirrors the visible page into the URL hash via replaceState", async () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    render(<ReaderRuntimeHarness />);
    await waitFor(() => expect(latestObserver()?.observed.length).toBe(4));
    replaceState.mockClear();

    emitVisible(3);
    await flushDebounce();

    expect(window.location.hash).toBe("#page-04");
    expect(replaceState).toHaveBeenCalledWith(null, "", "#page-04");
  });

  it("scrolls instantly to the routed page on initial mount when the hash is set", async () => {
    window.history.replaceState(null, "", "#page-04");
    render(<ReaderRuntimeHarness />);
    await waitFor(() => expect(latestObserver()?.observed.length).toBe(4));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "instant", block: "start" });
  });

  it("smooth-scrolls to the routed page when the hash changes externally", async () => {
    render(<ReaderRuntimeHarness />);
    await waitFor(() => expect(latestObserver()?.observed.length).toBe(4));
    scrollIntoView.mockClear();

    window.history.replaceState(null, "", "#page-03");
    window.dispatchEvent(new HashChangeEvent("hashchange"));

    await waitFor(() =>
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" }),
    );
  });

  it("does not re-scroll on responsive resize", async () => {
    render(<ReaderRuntimeHarness rightPanelBreakpoint={1000} />);
    await waitFor(() => expect(latestObserver()?.observed.length).toBe(4));
    scrollIntoView.mockClear();

    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 700 });
    window.dispatchEvent(new Event("resize"));

    await waitFor(() => expect(screen.getByTestId("right-panel").textContent).toBe("closed"));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});

function ReaderRuntimeHarness({
  pageCount = 4,
  rightPanelBreakpoint = 1000,
}: {
  pageCount?: number;
  rightPanelBreakpoint?: number;
}) {
  const reader = useQDocReaderRuntime({ pageCount, rightPanelBreakpoint });

  return (
    <section>
      <div data-testid="current-page">{reader.currentPageLabel}</div>
      <div data-testid="right-panel">{reader.rightPanelOpen ? "open" : "closed"}</div>
      <button type="button" onClick={() => reader.setPage(2)}>
        Go to page 3
      </button>
      <main data-testid="reader-stage" ref={reader.stageRef}>
        {Array.from({ length: pageCount }, (_, pageIndex) => (
          <article
            data-qdoc-page-index={pageIndex}
            data-testid={`reader-page-${pageIndex}`}
            key={pageIndex}
            ref={reader.registerPage(pageIndex)}
          >
            Page {pageIndex + 1}
          </article>
        ))}
      </main>
    </section>
  );
}
