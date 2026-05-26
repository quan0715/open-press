import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Frame, MdxArea, PressContext } from "../src/openpress/core";

afterEach(() => cleanup());

describe("Frame", () => {
  it("renders a stable page-like surface with frame metadata", () => {
    render(
      <Frame frameKey="chapter.1" role="manuscript.content" chrome={false} className="custom-frame">
        <p>Body</p>
      </Frame>,
    );

    const frame = screen.getByText("Body").closest("section");
    expect(frame?.dataset.openpressFrameKey).toBe("chapter.1");
    expect(frame?.dataset.openpressObjectId).toBe("frame:chapter.1");
    expect(frame?.dataset.frameRole).toBe("manuscript.content");
    expect(frame?.dataset.pageKind).toBe("content");
    expect(frame?.dataset.frameChrome).toBe("false");
    expect(frame?.classList.contains("reader-page")).toBe(true);
    expect(frame?.classList.contains("custom-frame")).toBe(true);
  });

  it("rejects empty and extended frame keys", () => {
    expect(() => render(<Frame frameKey="">Empty</Frame>)).toThrow(/frameKey/);
    expect(() => render(<Frame frameKey="chapter.1:extended:1">Extended</Frame>)).toThrow(/extended/);
  });
});

describe("MdxArea", () => {
  it("renders measurement metadata and consumes allocated chain slots in order", () => {
    render(
      <PressContext.Provider
        value={{
          sources: {},
          hints: null,
          toc: null,
          allocation: {
            "chapter.1": {
              "chapter:intro": [
                [<p key="first">First slot</p>],
                [<p key="second">Second slot</p>],
              ],
            },
          },
        }}
      >
        <Frame frameKey="chapter.1">
          <MdxArea chainId="chapter:intro" data-testid="area-1" />
          <MdxArea chainId="chapter:intro" data-testid="area-2" />
        </Frame>
      </PressContext.Provider>,
    );

    const area1 = screen.getByTestId("area-1");
    const area2 = screen.getByTestId("area-2");
    expect(area1.dataset.openpressMdxArea).toBe("true");
    expect(area1.dataset.openpressMdxAreaChain).toBe("chapter:intro");
    expect(area1.dataset.openpressMdxAreaIndex).toBe("0");
    expect(area1.dataset.openpressObjectId).toBe("mdx-area:chapter.1:chapter%3Aintro:0");
    expect(area1.dataset.openpressMdxAreaEmpty).toBe("false");
    expect(area1.textContent).toContain("First slot");
    expect(area2.dataset.openpressMdxAreaIndex).toBe("1");
    expect(area2.dataset.openpressObjectId).toBe("mdx-area:chapter.1:chapter%3Aintro:1");
    expect(area2.textContent).toContain("Second slot");
  });
});
