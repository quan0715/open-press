import { test } from "node:test";
import assert from "node:assert/strict";
import { overflowIssuesFromMeasurements } from "../engine/inspection.mjs";

test("overflow measurements become page warnings with source metadata", () => {
  const issues = overflowIssuesFromMeasurements([
    {
      pageNumber: 7,
      title: "Pointer table",
      source: {
        file: "04-single-linked-list.md",
        path: "document/content/04-single-linked-list.md",
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
      path: "document/content/04-single-linked-list.md",
      detail: {
        pageNumber: 7,
        title: "Pointer table",
        sourceFile: "04-single-linked-list.md",
        selector: ".page-body",
        tagName: "MAIN",
        text: "A long table row",
        overflowPx: 42,
      },
    },
  ]);
});
