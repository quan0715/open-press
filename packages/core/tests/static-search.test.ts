import { describe, expect, it } from "vitest";
import { searchCorpus, searchPages, type SearchCorpus, type SearchablePage } from "../src/openpress/shared/staticSearch";

function fixtureCorpus(): SearchCorpus {
  return {
    kind: "search-corpus",
    version: 1,
    files: [
      {
        scope: "content",
        file: "01-intro.mdx",
        path: "press/userstory/chapters/01-intro/content/01-intro.mdx",
        text: [
          "# Introduction",
          "",
          "OpenPress is a content framework.",
          "It compiles content into print-safe pages.",
        ].join("\n"),
      },
      {
        scope: "content",
        file: "02-pipeline.mdx",
        path: "press/userstory/chapters/02-pipeline/content/02-pipeline.mdx",
        text: [
          "## Pipeline",
          "",
          "The OpenPress pipeline runs section folders through MDX.",
          "Each section becomes one chapter.",
          "OPENPRESS uppercase appears here.",
        ].join("\n"),
      },
    ],
  };
}

describe("searchCorpus", () => {
  it("returns an empty report when the query is empty", () => {
    const report = searchCorpus(fixtureCorpus(), { query: "" });
    expect(report.kind).toBe("search");
    expect(report.query).toBe("");
    expect(report.matchCount).toBe(0);
    expect(report.files).toEqual([]);
    expect(report.matches).toEqual([]);
  });

  it("matches a literal token across files (case-insensitive by default)", () => {
    const report = searchCorpus(fixtureCorpus(), { query: "OpenPress" });
    expect(report.matchCount).toBe(3);
    expect(report.files.length).toBe(2);
    const matchedPaths = report.matches.map((match) => match.path);
    expect(matchedPaths.some((path) => path.endsWith("01-intro.mdx"))).toBe(true);
    expect(matchedPaths.some((path) => path.endsWith("02-pipeline.mdx"))).toBe(true);
    const upperMatch = report.matches.find((match) => match.text === "OPENPRESS");
    expect(upperMatch).toBeDefined();
    expect(upperMatch?.line).toBe(5);
  });

  it("honors caseSensitive: true", () => {
    const report = searchCorpus(fixtureCorpus(), { query: "OpenPress", caseSensitive: true });
    expect(report.matchCount).toBe(2);
    for (const match of report.matches) expect(match.text).toBe("OpenPress");
  });

  it("reports line, column, and preview windows for each match", () => {
    const report = searchCorpus(fixtureCorpus(), { query: "pipeline" });
    expect(report.matchCount).toBe(2);
    const firstMatch = report.matches[0];
    expect(firstMatch.line).toBe(1);
    expect(firstMatch.column).toBe(4);
    expect(firstMatch.preview).toMatch(/Pipeline/i);
  });

  it("assigns ids and counts per file in the summary", () => {
    const report = searchCorpus(fixtureCorpus(), { query: "OpenPress" });
    expect(report.matches.map((match) => match.id)).toEqual(["match-0001", "match-0002", "match-0003"]);
    const introSummary = report.files.find((file) => file.path.endsWith("01-intro.mdx"));
    const pipelineSummary = report.files.find((file) => file.path.endsWith("02-pipeline.mdx"));
    expect(introSummary?.matchCount).toBe(1);
    expect(pipelineSummary?.matchCount).toBe(2);
  });

  it("produces a stable report shape for the SearchControl contract", () => {
    const report = searchCorpus(fixtureCorpus(), { query: "framework", scope: "content" });
    expect(report.kind).toBe("search");
    expect(report.scope).toBe("content");
    expect(report.caseSensitive).toBe(false);
    expect(typeof report.matchCount).toBe("number");
    expect(Array.isArray(report.files)).toBe(true);
    expect(Array.isArray(report.matches)).toBe(true);
  });
});

describe("searchPages", () => {
  const fixturePages: SearchablePage[] = [
    {
      pageNumber: 1,
      title: "cover",
      html: '<section class="reader-page"><h1>OpenPress 文件</h1><p>AI-first document framework</p></section>',
      anchors: ["frame:cover"],
    },
    {
      pageNumber: 12,
      title: "story:workbench:content:0",
      html: '<section class="reader-page"><h2>Workbench 操作</h2><p>open-press workbench 是一個本地端的 web app。</p></section>',
      anchors: ["story:workbench:content:0"],
    },
  ];

  it("resolves clean page titles and ignores internal frameKey noise", () => {
    const report = searchPages(fixturePages, { query: "workbench" });
    expect(report.matchCount).toBe(2); // 1 for "Workbench 操作", 1 for "open-press workbench..."
    expect(report.files.length).toBe(1);
    expect(report.files[0].file).toBe("Workbench 操作");
    expect(report.files[0].path).toBe("page:11");
    // Ensure internal ID "story:workbench:content:0" was not indexed as a match
    for (const match of report.matches) {
      expect(match.preview).not.toContain("story:workbench");
    }
  });

  it("resolves cover and toc titles cleanly", () => {
    const report = searchPages(fixturePages, { query: "OpenPress" });
    expect(report.files.some((f) => f.file === "封面")).toBe(true);
  });

  it.each(["openpress", "open-press", "open press"])(
    "treats hyphen and space variants as the same search term for %s",
    (query) => {
      const pages: SearchablePage[] = [{
        pageNumber: 1,
        title: "Search variants",
        html: "<p>OpenPress open-press open press</p>",
      }];

      const report = searchPages(pages, { query });

      expect(report.matchCount).toBe(1);
      expect(report.occurrenceCount).toBe(3);
      expect(report.matches[0]).toMatchObject({
        text: "OpenPress",
        occurrenceCount: 3,
        pageOccurrenceIndex: 0,
      });
      expect(report.matches[0].preview).toContain("OpenPress open-press open press");
    },
  );

  it("does not treat separators between every character as a normal word match", () => {
    const pages: SearchablePage[] = [{
      pageNumber: 1,
      title: "Search precision",
      html: "<p>o p e n p r e s s</p>",
    }];

    expect(searchPages(pages, { query: "openpress" }).matchCount).toBe(0);
  });

  it("groups repeated matches in one rendered context and preserves occurrence metadata", () => {
    const pages: SearchablePage[] = [{
      pageNumber: 12,
      title: "Workbench 操作",
      html: [
        "<table><tbody><tr>",
        "<td>行內編輯狀態</td>",
        "<td>行內 source 編輯啟動時，顯示編輯中狀態。</td>",
        "</tr></tbody></table>",
      ].join(""),
    }];

    const report = searchPages(pages, { query: "編輯" });

    expect(report.matchCount).toBe(1);
    expect(report.occurrenceCount).toBe(3);
    expect(report.files[0].matchCount).toBe(1);
    expect(report.matches[0]).toMatchObject({
      occurrenceCount: 3,
      pageOccurrenceIndex: 0,
      text: "編輯",
    });
    expect(report.matches[0].preview).toContain("編輯");
  });
});
