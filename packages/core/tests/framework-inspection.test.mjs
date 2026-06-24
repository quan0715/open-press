import { test } from "node:test";
import assert from "node:assert/strict";
import { overflowIssuesFromMeasurements, selectInspectionPress } from "../engine/runtime/inspection.mjs";

test("overflow measurements become page warnings with source metadata", () => {
  const issues = overflowIssuesFromMeasurements([
    {
      pageNumber: 7,
      title: "Pointer table",
      source: {
        file: "01-single-linked-list.mdx",
        path: "press/chapters/04-linked-list/content/01-single-linked-list.mdx",
      },
      overflows: [
        {
          code: "page-body",
          selector: ".page-body",
          overflowPx: 42,
          tagName: "MAIN",
          text: "A long table row",
        },
      ],
    },
  ]);

  assert.deepEqual(issues, [
    {
      level: "warning",
      code: "overflow.page-body",
      message: "Page 07 exceeds page body by 42px.",
      path: "press/chapters/04-linked-list/content/01-single-linked-list.mdx",
      detail: {
        pageNumber: 7,
        title: "Pointer table",
        sourceFile: "01-single-linked-list.mdx",
        selector: ".page-body",
        tagName: "MAIN",
        text: "A long table row",
        overflowPx: 42,
      },
    },
  ]);
});

test("selectInspectionPress defaults to the first page Press in a multi-Press workspace", () => {
  const selection = selectInspectionPress([
    { slug: "slide", title: "Slide Deck", type: "slides" },
    { slug: "userstory", title: "User Story", type: "pages" },
  ]);

  assert.equal(selection.slug, "userstory");
  assert.equal(selection.title, "User Story");
});

test("selectInspectionPress honors an explicit press slug", () => {
  const selection = selectInspectionPress([
    { slug: "slide", title: "Slide Deck", type: "slides" },
    { slug: "userstory", title: "User Story", type: "pages" },
  ], "slide");

  assert.equal(selection.slug, "slide");
  assert.equal(selection.title, "Slide Deck");
});
