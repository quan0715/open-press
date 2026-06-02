import { describe, expect, it } from "vitest";
import { searchCorpus, type SearchCorpus } from "../src/openpress/shared/staticSearch";

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
