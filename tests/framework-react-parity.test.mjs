import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { exportQDocDocument } from "../engine/document-export.mjs";
import { exportReactQDocDocument } from "../engine/react/document-export.mjs";
import { compareQDocPaginationParity } from "../engine/react/pagination-parity.mjs";

async function writeFile(filePath, source) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, source, "utf8");
}

async function writeTheme(themeRoot) {
  await writeFile(path.join(themeRoot, "tokens.css"), ":root { --qd-font-serif: serif; }\n");
  for (const cssFile of [
    "base/page-contract.css",
    "base/typography.css",
    "page-surfaces/cover.css",
    "page-surfaces/back-cover.css",
    "page-surfaces/toc.css",
    "shell/reader-controls.css",
    "base/print.css",
  ]) {
    await writeFile(path.join(themeRoot, cssFile), "/* parity fixture */\n");
  }
}

test("compareQDocPaginationParity accepts matching legacy and React page counts", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "qdoc-react-parity-"));
  try {
    await writeFile(
      path.join(root, "qdoc.config.mjs"),
      `export default {
  title: "Parity Fixture",
  documentDir: ".",
  sourceDir: "content",
  mediaDir: "media",
  themeDir: "theme",
  designDoc: "design.md",
  componentsDir: "components",
  publicDir: "public/legacy-qdoc",
  outputDir: "dist"
};
`,
    );
    await writeFile(path.join(root, "design.md"), "# Design\n");
    await fs.mkdir(path.join(root, "media"), { recursive: true });
    await fs.mkdir(path.join(root, "components"), { recursive: true });
    await writeTheme(path.join(root, "theme"));
    await writeFile(path.join(root, "content/01-intro.md"), "## Intro\n\nIntro paragraph.\n");

    const legacyResult = await exportQDocDocument(root);
    const legacyDocument = JSON.parse(await fs.readFile(legacyResult.documentPath, "utf8"));

    await writeFile(
      path.join(root, "document/index.tsx"),
      `export const config = {
  title: "Parity Fixture",
  publicDir: "public/react-qdoc",
  outputDir: "react-dist"
};\n`,
    );
    await writeFile(
      path.join(root, "document/components/Page.tsx"),
      `import { BaseReportPage } from "@qdoc/core";

export default function Page({ pageIndex, totalPages, chapterSlug, children }) {
  return <BaseReportPage pageIndex={pageIndex} totalPages={totalPages} chapterSlug={chapterSlug}>{children}</BaseReportPage>;
}
`,
    );
    await writeFile(path.join(root, "document/chapters/01-intro/content/01-start.mdx"), "## Intro\n\nIntro paragraph.\n");
    await writeTheme(path.join(root, "document/theme"));

    const reactResult = await exportReactQDocDocument(root, {
      syncAssets: false,
      pagination: {
        enabled: true,
        async measureBlocks(input) {
          return {
            pages: [{ pageIndex: 0, blockIds: input.blockIds, breakAfter: input.blockIds.at(-1) }],
            warnings: [],
          };
        },
      },
    });

    const parity = compareQDocPaginationParity({
      legacyDocument,
      reactDocument: reactResult.document,
      label: "parity fixture",
    });

    assert.equal(parity.ok, true);
    assert.equal(parity.legacyPageCount, 1);
    assert.equal(parity.reactPageCount, 1);
    assert.deepEqual(parity.issues, []);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("compareQDocPaginationParity fails when page counts diverge beyond tolerance", () => {
  const parity = compareQDocPaginationParity({
    legacyDocument: { blocks: [{ kind: "htmlPage" }, { kind: "htmlPage" }] },
    reactDocument: { blocks: [{ kind: "htmlPage" }] },
    label: "mismatch fixture",
  });

  assert.equal(parity.ok, false);
  assert.deepEqual(parity.issues, [
    {
      code: "pagination-parity.page-count",
      message: "mismatch fixture page count changed from 2 to 1.",
      legacyPageCount: 2,
      reactPageCount: 1,
      delta: -1,
    },
  ]);
});
