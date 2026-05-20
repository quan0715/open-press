import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { exportQDocDocument } from "../engine/document-export.mjs";
import { exportReactQDocDocument } from "../engine/react/document-export.mjs";

async function withTempWorkspace(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "qdoc-react-export-"));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function writeFile(filePath, source) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, source, "utf8");
}

async function writeMinimalTheme(workspace) {
  await writeFile(path.join(workspace, "document/theme/tokens.css"), ":root { --fixture: 1; }\n");
  for (const cssFile of [
    "base/page-contract.css",
    "base/typography.css",
    "page-surfaces/cover.css",
    "page-surfaces/back-cover.css",
    "page-surfaces/toc.css",
    "shell/reader-controls.css",
    "base/print.css",
  ]) {
    await writeFile(path.join(workspace, "document/theme", cssFile), `/* ${cssFile} */\n`);
  }
  await fs.mkdir(path.join(workspace, "document/media"), { recursive: true });
}

test("exportReactQDocDocument writes a reader document from React shell pages and MDX chapters", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "document/index.tsx"),
      `import { BaseBackCoverPage, BaseCoverPage, BaseTocPage } from "@qdoc/core";
import type { QDocManifest } from "@qdoc/core";

export const config: QDocManifest = {
  title: "Fixture React Doc",
  subtitle: "MDX export",
  publicDir: "public/qdoc",
  outputDir: "dist",
};

export const cover = (
  <BaseCoverPage data-page-title="Cover" id="cover">
    <h1>Fixture React Doc</h1>
  </BaseCoverPage>
);
export const toc = (
  <BaseTocPage data-page-title="Table of Contents" id="toc">
    <h1>Contents</h1>
  </BaseTocPage>
);
export const backCover = (
  <BaseBackCoverPage data-page-title="Back Cover" id="back-cover">
    <p>Done</p>
  </BaseBackCoverPage>
);
`,
    );

    await writeFile(
      path.join(workspace, "document/components/Page.tsx"),
      `import { BaseReportPage } from "@qdoc/core";
import type { PageProps } from "@qdoc/core";

export default function Page({
  pageIndex,
  totalPages,
  chapterSlug,
  chapterTone,
  children,
}: PageProps) {
  return (
    <BaseReportPage
      pageIndex={pageIndex}
      totalPages={totalPages}
      chapterSlug={chapterSlug}
      chapterTone={chapterTone}
      data-page-title={chapterSlug}
    >
      <main data-page-shell={chapterSlug}>{children}</main>
    </BaseReportPage>
  );
}
`,
    );

    await writeFile(
      path.join(workspace, "document/components/Diagram.tsx"),
      `export default function Diagram({ label }: { label: string }) {
  return <figure data-global-diagram>{label}</figure>;
}
`,
    );

    await writeFile(
      path.join(workspace, "document/chapters/04-linked-list/chapter.tsx"),
      `import { BasePage } from "@qdoc/core";

export const meta = {
  slug: "linked-list",
  title: "Linked List",
  tone: "green",
};

export const opener = (
  <BasePage kind="report" data-page-title="Linked List Opener" id="linked-list-opener">
    <h1>Linked List</h1>
  </BasePage>
);
`,
    );

    await writeFile(
      path.join(workspace, "document/chapters/04-linked-list/content/01-list-and-node.mdx"),
      [
        "## Node model",
        "",
        "A node stores data and a next pointer.",
        "",
        '<Diagram label="Pointer diagram" />',
      ].join("\n"),
    );
    await writeFile(
      path.join(workspace, "document/chapters/04-linked-list/styles/chapter.css"),
      "h2 { color: var(--linked-list-accent); }\n",
    );

    await writeFile(
      path.join(workspace, "document/chapters/05-tree/components/Diagram.tsx"),
      `export default function Diagram({ label }: { label: string }) {
  return <aside data-local-diagram>{label}</aside>;
}
`,
    );

    await writeFile(
      path.join(workspace, "document/chapters/05-tree/content/01-tree.mdx"),
      [
        "## Tree basics",
        "",
        "Trees organize nodes hierarchically.",
        "",
        '<Diagram label="Tree diagram" />',
      ].join("\n"),
    );

    const result = await exportReactQDocDocument(workspace, { syncAssets: false });
    const exported = JSON.parse(await fs.readFile(result.documentPath, "utf8"));
    const chapterCss = await fs.readFile(path.join(workspace, "public/qdoc/chapter-scoped.css"), "utf8");

    assert.equal(result.pageCount, 6);
    assert.equal(result.documentPath, path.join(workspace, "public/qdoc/document.json"));
    assert.equal(exported.meta.title, "Fixture React Doc");
    assert.equal(exported.meta.version, "qdoc-react-export-v1");
    assert.equal(exported.source.type, "qdoc-react-mdx");
    assert.equal(exported.source.editMode, "source-mdx");
    assert.deepEqual(exported.source.styles, [
      {
        kind: "chapter-scoped-css",
        href: "/qdoc/chapter-scoped.css",
        path: "chapter-scoped.css",
      },
    ]);
    assert.match(chapterCss, /\[data-chapter-slug="linked-list"\] :where\(h2\)/);
    assert.deepEqual(
      exported.blocks.map((block) => [block.title, block.source.kind, block.source.slug]),
      [
        ["Cover", "cover", "cover"],
        ["Table of Contents", "toc", "toc"],
        ["Linked List Opener", "chapter-opener", "linked-list"],
        ["linked-list", "chapter", "linked-list"],
        ["tree", "chapter", "tree"],
        ["Back Cover", "back-cover", "back-cover"],
      ],
    );

    const linkedListPage = exported.blocks[3];
    assert.equal(linkedListPage.pageNumber, 4);
    assert.match(linkedListPage.html, /data-page-index="3"/);
    assert.match(linkedListPage.html, /data-total-pages="6"/);
    assert.match(linkedListPage.html, /data-chapter-slug="linked-list"/);
    assert.match(linkedListPage.html, /data-chapter-tone="green"/);
    assert.match(linkedListPage.html, /data-page-shell="linked-list"/);
    assert.match(linkedListPage.html, /data-qdoc-block-id="b-linked-list-01-list-and-node-0"/);
    assert.match(linkedListPage.html, /data-qdoc-component-block="Diagram"/);
    assert.match(linkedListPage.html, /data-global-diagram="true"/);
    assert.deepEqual(exported.source.blockMap["b-linked-list-01-list-and-node-0"], {
      id: "b-linked-list-01-list-and-node-0",
      kind: "element",
      name: "h2",
      chapterSlug: "linked-list",
      path: "document/chapters/04-linked-list/content/01-list-and-node.mdx",
      pageIndex: 3,
      pageNumber: 4,
      source: { line: 1, column: 1, endLine: 1, endColumn: 14 },
    });

    const treePage = exported.blocks[4];
    assert.match(treePage.html, /data-page-shell="tree"/);
    assert.match(treePage.html, /data-qdoc-block-id="b-tree-01-tree-0"/);
    assert.match(treePage.html, /data-local-diagram="true"/);
    assert.doesNotMatch(treePage.html, /data-global-diagram="true"/);
  });
});

test("exportReactQDocDocument returns null when the workspace has no React document entry", async () => {
  await withTempWorkspace(async (workspace) => {
    const result = await exportReactQDocDocument(workspace);

    assert.equal(result, null);
  });
});

test("exportReactQDocDocument paginates MDX by measured block groups and rerenders page subtrees", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeFile(
      path.join(workspace, "document/index.tsx"),
      `export const config = { title: "Paginated Fixture", publicDir: "public/qdoc" };\n`,
    );
    await writeFile(
      path.join(workspace, "document/components/Page.tsx"),
      `import { BaseReportPage } from "@qdoc/core";

export default function Page({ pageIndex, totalPages, chapterSlug, children }) {
  return (
    <BaseReportPage
      pageIndex={pageIndex}
      totalPages={totalPages}
      chapterSlug={chapterSlug}
      data-page-title={\`\${chapterSlug}:\${pageIndex}\`}
    >
      {children}
    </BaseReportPage>
  );
}
`,
    );
    await writeFile(
      path.join(workspace, "document/chapters/01-intro/content/01-start.mdx"),
      [
        "## Intro",
        "",
        "First paragraph.",
        "",
        "Second paragraph.",
        "",
        "Third paragraph.",
      ].join("\n"),
    );

    const measuredInputs = [];
    const result = await exportReactQDocDocument(workspace, {
      syncAssets: false,
      pagination: {
        enabled: true,
        pageSafeHeightPx: 100,
        async measureBlocks(input) {
          measuredInputs.push({
            blockIds: input.blockIds,
            html: input.html,
            pageSafeHeightPx: input.pageSafeHeightPx,
          });
          return {
            pages: [
              {
                pageIndex: 0,
                blockIds: ["b-intro-01-start-0", "b-intro-01-start-1"],
                breakAfter: "b-intro-01-start-1",
              },
              {
                pageIndex: 1,
                blockIds: ["b-intro-01-start-2", "b-intro-01-start-3"],
                breakAfter: "b-intro-01-start-3",
              },
            ],
            warnings: [
              {
                code: "block-overflows-page",
                blockId: "b-intro-01-start-3",
                height: 120,
                pageSafeHeightPx: 100,
              },
            ],
          };
        },
      },
    });
    const exported = JSON.parse(await fs.readFile(result.documentPath, "utf8"));

    assert.equal(result.pageCount, 2);
    assert.deepEqual(measuredInputs[0].blockIds, [
      "b-intro-01-start-0",
      "b-intro-01-start-1",
      "b-intro-01-start-2",
      "b-intro-01-start-3",
    ]);
    assert.equal(measuredInputs[0].pageSafeHeightPx, 100);
    assert.match(measuredInputs[0].html, /First paragraph/);
    assert.match(measuredInputs[0].html, /Third paragraph/);

    assert.match(exported.blocks[0].html, /Intro/);
    assert.match(exported.blocks[0].html, /First paragraph/);
    assert.doesNotMatch(exported.blocks[0].html, /Second paragraph/);
    assert.doesNotMatch(exported.blocks[0].html, /Third paragraph/);
    assert.match(exported.blocks[1].html, /Second paragraph/);
    assert.match(exported.blocks[1].html, /Third paragraph/);
    assert.doesNotMatch(exported.blocks[1].html, /First paragraph/);

    assert.equal(exported.source.pagination.mode, "build-time-block-measurement");
    assert.equal(exported.source.pagination.pageSafeHeightPx, 100);
    assert.deepEqual(exported.source.pagination.warnings, [
      {
        code: "block-overflows-page",
        blockId: "b-intro-01-start-3",
        height: 120,
        pageSafeHeightPx: 100,
        path: "document/chapters/01-intro/content/01-start.mdx",
        source: { line: 7, column: 1, endLine: 7, endColumn: 17 },
      },
    ]);
    assert.equal(exported.source.blockMap["b-intro-01-start-0"].pageIndex, 0);
    assert.equal(exported.source.blockMap["b-intro-01-start-1"].pageIndex, 0);
    assert.equal(exported.source.blockMap["b-intro-01-start-2"].pageIndex, 1);
    assert.equal(exported.source.blockMap["b-intro-01-start-3"].pageIndex, 1);
  });
});

test("exportReactQDocDocument injects static table-of-contents entries from rendered headings", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeFile(
      path.join(workspace, "document/index.tsx"),
      `export const config = { title: "TOC Fixture", publicDir: "public/qdoc" };
export const toc = (
  <section className="reader-page toc no-footer" data-page-kind="toc" data-page-footer="false" data-page-title="目錄">
    <div className="page-frame">
      <main className="page-body"><h2 id="toc-title" className="toc-heading">目錄</h2></main>
    </div>
  </section>
);
`,
    );
    await writeFile(
      path.join(workspace, "document/components/Page.tsx"),
      `export default function Page({ children }) {
  return <section className="reader-page report-page" data-page-kind="chapter" data-page-footer="true">{children}</section>;
}
`,
    );
    await writeFile(
      path.join(workspace, "document/chapters/01-intro/content/01-start.mdx"),
      ["## Intro", "", "### First topic", "", "Body."].join("\n"),
    );

    const result = await exportReactQDocDocument(workspace, { syncAssets: false });
    const exported = JSON.parse(await fs.readFile(result.documentPath, "utf8"));

    assert.match(exported.blocks[0].html, /class="toc-list"/);
    assert.match(exported.blocks[0].html, /Intro/);
    assert.match(exported.blocks[0].html, /First topic/);
    assert.equal(exported.blocks[0].source.kind, "toc");
    assert.equal(exported.blocks[1].source.kind, "chapter");
  });
});

test("exportQDocDocument delegates to React export when document/index.tsx is present", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalTheme(workspace);
    await writeFile(
      path.join(workspace, "document/index.tsx"),
      `export const config = { title: "React Preferred", publicDir: "public/qdoc" };\n`,
    );
    await writeFile(
      path.join(workspace, "document/chapters/01-intro/content/01-start.mdx"),
      "## Intro\n\nReact body.\n",
    );

    const result = await exportQDocDocument(workspace);
    const exported = JSON.parse(await fs.readFile(result.documentPath, "utf8"));

    assert.equal(exported.source.type, "qdoc-react-mdx");
    assert.equal(exported.meta.version, "qdoc-react-export-v1");
    assert.equal(exported.source.pagination, undefined);
  });
});
