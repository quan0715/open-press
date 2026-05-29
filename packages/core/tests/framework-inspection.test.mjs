import { test } from "node:test";
import assert from "node:assert/strict";
import { overflowIssuesFromMeasurements } from "../engine/runtime/inspection.mjs";

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
