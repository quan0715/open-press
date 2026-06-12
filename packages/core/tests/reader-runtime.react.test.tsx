import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReaderRuntime } from "../src/openpress/reader";
import { scrollToPage } from "../src/openpress/reader";

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

describe("useReaderRuntime", () => {
  it("scrollToPage scrolls the reader stage directly when a stage root is provided", () => {
    const stage = document.createElement("main");
    const firstPage = document.createElement("article");
    const targetPage = document.createElement("article");
    const scrollTo = vi.fn();
    stage.append(firstPage, targetPage);
    document.body.append(stage);

    Object.defineProperty(stage, "scrollTop", { configurable: true, writable: true, value: 250 });
    Object.defineProperty(stage, "scrollTo", { configurable: true, value: scrollTo });
    Object.defineProperty(stage, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 20, bottom: 620, left: 0, right: 800, width: 800, height: 600 }),
    });
    Object.defineProperty(targetPage, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 1020, bottom: 2020, left: 0, right: 800, width: 800, height: 1000 }),
    });

    const didScroll = scrollToPage([firstPage, targetPage], 1, "smooth", stage);

    expect(didScroll).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith({ top: 1250, behavior: "smooth" });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

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

  it("does not re-anchor to the active page when a drawer closes on resize", async () => {
    render(<ReaderRuntimeHarness leftPanelBreakpoint={1000} />);
    await waitFor(() => expect(latestObserver()?.observed.length).toBe(4));

    fireEvent.click(screen.getByRole("button", { name: "Toggle left panel" }));
    emitVisible(2);
    await flushDebounce();
    scrollIntoView.mockClear();

    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 700 });
    window.dispatchEvent(new Event("resize"));

    await waitFor(() => expect(screen.getByTestId("left-panel").textContent).toBe("closed"));
    expect(screen.getByTestId("current-page").textContent).toBe("03");
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("keeps optional panels closed by default and toggles them independently", () => {
    render(<ReaderRuntimeHarness />);

    expect(screen.getByTestId("left-panel").textContent).toBe("closed");
    expect(screen.getByTestId("right-panel").textContent).toBe("closed");

    fireEvent.click(screen.getByRole("button", { name: "Toggle left panel" }));

    expect(screen.getByTestId("left-panel").textContent).toBe("open");
    expect(screen.getByTestId("right-panel").textContent).toBe("closed");
  });

  it("opens a drawer-mode panel via toggle and keeps it open below the breakpoint", () => {
    // Reproduces the "drawer flickers open then immediately closes" bug:
    // toggling a panel re-ran the resize effect, which saw "open + below
    // breakpoint" and instantly closed the panel the user just opened.
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 720 });
    render(<ReaderRuntimeHarness leftPanelBreakpoint={1184} rightPanelBreakpoint={1184} />);

    expect(screen.getByTestId("left-panel").textContent).toBe("closed");
    fireEvent.click(screen.getByRole("button", { name: "Toggle left panel" }));
    expect(screen.getByTestId("left-panel").textContent).toBe("open");
  });

  it("does not change pages from arrow keys inside plaintext-only editable content", async () => {
    render(<ReaderRuntimeHarness />);
    await waitFor(() => expect(latestObserver()?.observed.length).toBe(4));

    const editable = screen.getByTestId("editable-text");
    editable.focus();
    fireEvent.keyDown(editable, { key: "ArrowRight" });

    expect(screen.getByTestId("current-page").textContent).toBe("01");
    expect(scrollIntoView).not.toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("does not change pages from arrow keys while text is selected", async () => {
    render(<ReaderRuntimeHarness />);
    await waitFor(() => expect(latestObserver()?.observed.length).toBe(4));

    const selectedText = screen.getByTestId("selectable-text").firstChild;
    if (!selectedText) throw new Error("Missing selectable text node");
    const range = document.createRange();
    range.setStart(selectedText, 0);
    range.setEnd(selectedText, 8);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(screen.getByTestId("current-page").textContent).toBe("01");
    expect(scrollIntoView).not.toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });
});

function ReaderRuntimeHarness({
  pageCount = 4,
  leftPanelBreakpoint,
  rightPanelBreakpoint = 1000,
}: {
  pageCount?: number;
  leftPanelBreakpoint?: number;
  rightPanelBreakpoint?: number;
}) {
  const reader = useReaderRuntime({ pageCount, leftPanelBreakpoint, rightPanelBreakpoint });

  return (
    <section>
      <div data-testid="current-page">{reader.currentPageLabel}</div>
      <div data-testid="left-panel">{reader.leftPanelOpen ? "open" : "closed"}</div>
      <div data-testid="right-panel">{reader.rightPanelOpen ? "open" : "closed"}</div>
      <button type="button" onClick={() => reader.toggleLeftPanel()}>
        Toggle left panel
      </button>
      <button type="button" onClick={() => reader.setPage(2)}>
        Go to page 3
      </button>
      <p contentEditable="plaintext-only" suppressContentEditableWarning data-testid="editable-text">Editable text</p>
      <p data-testid="selectable-text">Selectable reader text</p>
      <main data-testid="reader-stage" ref={reader.stageRef}>
        {Array.from({ length: pageCount }, (_, pageIndex) => (
          <article
            data-openpress-page-index={pageIndex}
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
