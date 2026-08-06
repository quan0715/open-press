import { describe, expect, it, vi } from "vitest";
import { firstChangePageIndex } from "../src/openpress/workbench/changes/ChangePreviewComparison";
import {
  clearChangePreview,
  fetchChangePreview,
  saveChangeProposalFeedback,
} from "../src/openpress/workbench/changes/changePreviewModel";

describe("change preview model", () => {
  it("returns the current preview from the local endpoint", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      preview: {
        proposals: [{
          index: 0,
          path: "press/report/intro.mdx",
          before: "Before",
          after: "After",
          matches: 1,
          line: 4,
        }],
      },
    }), { status: 200 }));

    const preview = await fetchChangePreview({ pressSlug: "reader", fetchImpl: fetchImpl as typeof fetch });

    expect(preview?.proposals).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledWith("/__openpress/change-preview?press=reader");
  });

  it("distinguishes an absent preview from a malformed response", async () => {
    const emptyFetch = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      preview: null,
    }), { status: 200 }));
    const malformedFetch = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      preview: { proposals: "not-an-array" },
    }), { status: 200 }));

    await expect(fetchChangePreview({ fetchImpl: emptyFetch as typeof fetch })).resolves.toBeNull();
    await expect(fetchChangePreview({ fetchImpl: malformedFetch as typeof fetch })).rejects.toThrow(
      "OpenPress change preview returned an invalid format.",
    );
  });

  it("stores lightweight feedback on the current proposal", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      proposal: {
        index: 0,
        feedback: { decision: "more-info", comment: "Explain the new term." },
      },
    }), { status: 200 }));

    const feedback = await saveChangeProposalFeedback({
      proposal: {
        index: 0,
        path: "press/report/intro.mdx",
        before: "Before",
        after: "After",
      },
      feedback: { decision: "more-info", comment: "Explain the new term." },
      fetchImpl: fetchImpl as typeof fetch,
    });

    expect(feedback).toEqual({ decision: "more-info", comment: "Explain the new term." });
    expect(fetchImpl).toHaveBeenCalledWith(
      "/__openpress/change-preview",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          index: 0,
          path: "press/report/intro.mdx",
          before: "Before",
          after: "After",
          feedback: { decision: "more-info", comment: "Explain the new term." },
        }),
      }),
    );
  });

  it("clears the ephemeral preview handoff", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      cleared: true,
    }), { status: 200 }));

    await clearChangePreview({ fetchImpl: fetchImpl as typeof fetch });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/__openpress/change-preview",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

describe("rendered change navigation", () => {
  it("finds the first affected document page from source lines", () => {
    expect(firstChangePageIndex(
      [{
        index: 0,
        path: "press/report/chapters/intro.mdx",
        before: "Before",
        after: "After",
        matches: 1,
        line: 12,
        endLine: 12,
      }],
      {
        "report/chapters/intro.mdx": [{
          id: "intro-title",
          path: "report/chapters/intro.mdx",
          pageIndex: 4,
          source: { line: 12, column: 1, endLine: 12, endColumn: 7 },
        }],
      },
    )).toBe(4);
  });

  it("finds TSX Text targets from object entity source ranges", () => {
    expect(firstChangePageIndex(
      [{
        index: 0,
        path: "press/report/press.tsx",
        before: "Before",
        after: "After",
        matches: 1,
        line: 8,
        endLine: 8,
      }],
      {},
      {
        meta: { title: "Report" },
        blocks: [{
          id: "cover",
          type: "page",
          title: "Cover",
          pageIndex: 0,
          pageNumber: 1,
          frameKey: "cover",
          html: "<span>Before</span>",
        }],
        source: {
          type: "react",
          objectEntities: {
            "text:frame%3Acover:title": {
              id: "text:frame%3Acover:title",
              kind: "text",
              label: "title",
              frameKey: "cover",
              source: {
                path: "press/report/press.tsx",
                source: { line: 8, column: 28, endLine: 8, endColumn: 34 },
              },
            },
          },
        },
      },
    )).toBe(0);
  });
});
