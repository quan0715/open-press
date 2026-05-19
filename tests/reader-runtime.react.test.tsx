import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) =>
    window.setTimeout(() => callback(performance.now()), 0),
  );
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((handle) => window.clearTimeout(handle));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  scrollIntoView.mockReset();
});

describe("useQDocReaderRuntime", () => {
  it("turns bookmark navigation into route and scroll side effects", async () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    render(<ReaderRuntimeHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Go to page 3" }));

    await waitFor(() => expect(screen.getByTestId("current-page").textContent).toBe("03"));
    expect(window.location.hash).toBe("#page-03");
    expect(replaceState).toHaveBeenCalledWith(null, "", "#page-03");
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("syncs hash navigation into React state without writing the same route back", async () => {
    window.history.replaceState(null, "", "#page-04");
    const replaceState = vi.spyOn(window.history, "replaceState");
    replaceState.mockClear();

    render(<ReaderRuntimeHarness />);

    await waitFor(() => expect(screen.getByTestId("current-page").textContent).toBe("04"));
    expect(window.location.hash).toBe("#page-04");
    expect(replaceState).not.toHaveBeenCalled();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });

  it("keeps the routed page anchored across responsive resize", async () => {
    window.history.replaceState(null, "", "#page-02");
    render(<ReaderRuntimeHarness rightPanelBreakpoint={1000} />);

    await waitFor(() => expect(screen.getByTestId("current-page").textContent).toBe("02"));
    scrollIntoView.mockClear();

    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 700 });
    window.dispatchEvent(new Event("resize"));

    await waitFor(() => expect(screen.getByTestId("right-panel").textContent).toBe("closed"));
    expect(screen.getByTestId("current-page").textContent).toBe("02");
    expect(window.location.hash).toBe("#page-02");
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" }));
  });

  it("lets the intersection observer update route after programmatic scroll is released", async () => {
    render(<ReaderRuntimeHarness />);

    await waitFor(() => expect(MockIntersectionObserver.instances.at(-1)?.observed.length).toBe(4));
    fireEvent(screen.getByTestId("reader-stage"), new Event("scrollend"));

    MockIntersectionObserver.instances.at(-1)?.emit([
      {
        target: screen.getByTestId("reader-page-1"),
        isIntersecting: true,
        intersectionRatio: 0.9,
      },
    ]);

    await waitFor(() => expect(screen.getByTestId("current-page").textContent).toBe("02"));
    expect(window.location.hash).toBe("#page-02");
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
      <button type="button" onClick={() => reader.setPage(2, { behavior: "smooth", source: "bookmark" })}>
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
