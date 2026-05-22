import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "engine", "cli.mjs");
const STATIC_SERVER = path.join(ROOT, "engine", "static-server.mjs");

async function withTempWorkspace(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-test-"));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function writeMinimalWorkspaceConfig(workspace, overrides = {}) {
  const adapter = overrides.adapter ?? "cloudflare-pages";
  const requiresConfirmation = overrides.requiresConfirmation ?? true;
  await fs.writeFile(
    path.join(workspace, "openpress.config.mjs"),
    `export default {
  title: "Sample OpenPress",
  documentDir: ".",
  sourceDir: "custom-content",
  mediaDir: "custom-media",
  themeDir: "custom-assets",
  designDoc: "custom-design.md",
  componentsDir: "custom-components",
  publicDir: "custom-public/openpress",
  outputDir: "custom-dist",
  pdf: { filename: "sample-report.pdf" },
  deploy: {
    adapter: "${adapter}",
    source: ".deploy/sample-site",
    projectName: "sample-pages",
    requiresConfirmation: ${requiresConfirmation},
    commitDirty: false
  }
};
`,
    "utf8",
  );
  for (const dir of ["custom-content", "custom-media", "custom-assets", "custom-components"]) {
    await fs.mkdir(path.join(workspace, dir), { recursive: true });
  }
  await fs.writeFile(path.join(workspace, "custom-design.md"), "# Design\n", "utf8");
}

async function writeMinimalReactWorkspace(workspace, overrides = {}) {
  const adapter = overrides.adapter ?? "cloudflare-pages";
  const requiresConfirmation = overrides.requiresConfirmation ?? true;
  await fs.writeFile(
    path.join(workspace, "openpress.config.mjs"),
    `export default {
  title: "React Source Fixture",
  documentDir: "document",
  sourceDir: "content",
  mediaDir: "media",
  themeDir: "theme",
  designDoc: "design.md",
  componentsDir: "components",
  publicDir: "public/openpress",
  outputDir: "dist",
  deploy: {
    adapter: "${adapter}",
    source: ".deploy/react-fixture",
    projectName: "react-fixture-pages",
    requiresConfirmation: ${requiresConfirmation},
    commitDirty: false
  }
};
`,
    "utf8",
  );
  for (const dir of ["document/media", "document/theme", "document/components"]) {
    await fs.mkdir(path.join(workspace, dir), { recursive: true });
  }
  await fs.writeFile(path.join(workspace, "document", "design.md"), "# Design\n", "utf8");
  await fs.writeFile(
    path.join(workspace, "document", "index.tsx"),
    `import type { Manifest } from "@openpress/core";

export const config: Manifest = {
  title: "React Source Fixture",
  sourceDir: "chapters",
};
`,
    "utf8",
  );
  await fs.mkdir(path.join(workspace, "document", "chapters", "01-intro", "content"), { recursive: true });
  await fs.writeFile(
    path.join(workspace, "document", "chapters", "01-intro", "content", "01-start.mdx"),
    "## Intro\n\nReact MDX source.\n",
    "utf8",
  );
}

async function writeReactTheme(documentRoot) {
  await fs.mkdir(path.join(documentRoot, "media"), { recursive: true });
  await fs.mkdir(path.join(documentRoot, "theme"), { recursive: true });
  await fs.writeFile(path.join(documentRoot, "theme", "tokens.css"), ":root { --openpress-font-serif: serif; }\n", "utf8");
  for (const cssFile of [
    "base/page-contract.css",
    "base/typography.css",
    "page-surfaces/cover.css",
    "page-surfaces/back-cover.css",
    "page-surfaces/toc.css",
    "shell/reader-controls.css",
    "base/print.css",
  ]) {
    await fs.mkdir(path.dirname(path.join(documentRoot, "theme", cssFile)), { recursive: true });
    await fs.writeFile(path.join(documentRoot, "theme", cssFile), "/* test css */\n", "utf8");
  }
}

async function writeReactReportPage(documentRoot) {
  await fs.mkdir(path.join(documentRoot, "components"), { recursive: true });
  await fs.writeFile(
    path.join(documentRoot, "components", "Page.tsx"),
    `import { BaseContentPage } from "@openpress/core";

export default function Page({ pageIndex, totalPages, chapterSlug, children }) {
  return <BaseContentPage pageIndex={pageIndex} totalPages={totalPages} chapterSlug={chapterSlug}>{children}</BaseContentPage>;
}
`,
    "utf8",
  );
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

async function waitForServer(port, deadlineMs = 5000) {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(250) });
      await res.text();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  throw new Error(`Timed out waiting for static server on port ${port}`);
}

test("cli pdf and deploy dry runs use workspace config", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalWorkspaceConfig(workspace);

    const pdf = spawnSync("node", [CLI, "pdf", workspace, "--dry-run"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(pdf.status, 0, pdf.stderr + pdf.stdout);
    assert.ok(pdf.stdout.includes("custom-dist/sample-report.pdf"));
    assert.ok(pdf.stdout.includes("static-server.mjs custom-dist"));

    const deploy = spawnSync("node", [CLI, "deploy", workspace, "--confirm", "--dry-run"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(deploy.status, 0, deploy.stderr + deploy.stdout);
    assert.match(deploy.stdout, /deploy-sync \(copy custom-dist/);
    assert.ok(deploy.stdout.includes(".deploy/sample-site/sample-report.pdf"));
    assert.ok(deploy.stdout.includes("wrangler pages deploy .deploy/sample-site --project-name=sample-pages"));
  });
});

test("static server serves workspace pdf and exposes deployment status", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalWorkspaceConfig(workspace);
    await fs.mkdir(path.join(workspace, "custom-dist"), { recursive: true });
    await fs.writeFile(path.join(workspace, "custom-dist", "index.html"), "<!doctype html><title>OpenPress</title>", "utf8");
    await fs.writeFile(path.join(workspace, "custom-dist", "sample-report.pdf"), Buffer.from("%PDF-1.4\n% sample\n"));
    const deployInfoDir = path.join(workspace, ".deploy", "sample-site", "openpress");
    await fs.mkdir(deployInfoDir, { recursive: true });
    await fs.writeFile(
      path.join(deployInfoDir, "deploy.json"),
      JSON.stringify({
        pdf: "/sample-report.pdf",
        public_url: "https://sample-pages.pages.dev",
        deployed_at: "2026-05-18T00:00:00.000Z",
      }),
      "utf8",
    );

    const port = await freePort();
    const server = spawn(
      "node",
      [STATIC_SERVER, "custom-dist", "--host", "127.0.0.1", "--port", String(port), "--workspace", workspace],
      { cwd: workspace, stdio: ["ignore", "pipe", "pipe"] },
    );

    try {
      await waitForServer(port);

      const pdfRes = await fetch(`http://127.0.0.1:${port}/__openpress/local-pdf-file`);
      assert.equal(pdfRes.headers.get("content-type"), "application/pdf");
      assert.match(pdfRes.headers.get("content-disposition") ?? "", /filename="sample-report\.pdf"/);
      const buf = Buffer.from(await pdfRes.arrayBuffer());
      assert.ok(buf.includes("%PDF-1.4"));

      const statusRes = await fetch(`http://127.0.0.1:${port}/__openpress/status`);
      const status = await statusRes.json();
      assert.equal(status.pdf, "/sample-report.pdf");
      assert.equal(status.public_url, "https://sample-pages.pages.dev");
    } finally {
      server.kill();
      await new Promise((resolve) => {
        if (server.exitCode !== null) resolve();
        else server.on("exit", () => resolve());
        setTimeout(resolve, 2000);
      });
    }
  });
});

test("deploy gate validates public adapters require confirmation", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalReactWorkspace(workspace, { adapter: "cloudflare-pages", requiresConfirmation: false });

    const result = spawnSync("node", [CLI, "validate", workspace], { cwd: ROOT, encoding: "utf8" });
    assert.notEqual(result.status, 0, "validation should fail when a public adapter disables confirmation");
    assert.match(result.stdout + result.stderr, /deploy\.confirmation/);
  });
});

test("validate supports machine-readable issue report JSON", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalReactWorkspace(workspace, { adapter: "cloudflare-pages", requiresConfirmation: false });

    const result = spawnSync("node", [CLI, "validate", workspace, "--json"], { cwd: ROOT, encoding: "utf8" });
    assert.notEqual(result.status, 0, "validation should still fail when errors are present");

    const report = JSON.parse(result.stdout);
    assert.equal(report.kind, "validation");
    assert.equal(report.ok, false);
    assert.ok(report.checked.includes("deploy-gate"));
    assert.ok(report.issues.some((issue) => issue.level === "error" && issue.code === "deploy.confirmation"));
  });
});

test("validate warns when React source still contains pending openpress comments", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalReactWorkspace(workspace);
    await fs.writeFile(
      path.join(workspace, "document", "chapters", "01-intro", "content", "01-start.mdx"),
      [
        "## Intro",
        "",
        '{/* @openpress-comment id="c-feedcafe" ts="2026-05-20T00:00:00.000Z" text="eyJub3RlIjoi5L-u5pS5In0" */}',
        "React MDX source.",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = spawnSync("node", [CLI, "validate", workspace, "--json"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);

    const report = JSON.parse(result.stdout);
    assert.ok(report.checked.includes("react-comments"));
    assert.ok(report.issues.some((issue) => (
      issue.level === "warning"
      && issue.code === "react-comments.pending"
      && issue.path.endsWith("document/chapters/01-intro/content/01-start.mdx")
      && issue.detail.id === "c-feedcafe"
      && issue.detail.line === 3
    )));
  });
});

test("validate reports React pagination overflow warnings from exported document metadata", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalReactWorkspace(workspace);
    await fs.mkdir(path.join(workspace, "public", "openpress"), { recursive: true });
    await fs.writeFile(
      path.join(workspace, "public", "openpress", "document.json"),
      JSON.stringify({
        source: {
          type: "openpress-react-mdx",
          pagination: {
            warnings: [
              {
                code: "block-overflows-page",
                blockId: "b-intro-01-start-2",
                height: 120,
                pageSafeHeightPx: 80,
                path: "document/chapters/01-intro/content/01-start.mdx",
                source: { line: 7, column: 1, endLine: 7, endColumn: 17 },
              },
            ],
          },
        },
        blocks: [],
      }),
      "utf8",
    );

    const result = spawnSync("node", [CLI, "validate", workspace, "--json"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const report = JSON.parse(result.stdout);

    assert.ok(report.checked.includes("react-pagination"));
    assert.ok(report.issues.some((issue) => (
      issue.level === "warning"
      && issue.code === "react-pagination.block-overflows-page"
      && issue.path.endsWith("document/chapters/01-intro/content/01-start.mdx")
      && issue.detail.blockId === "b-intro-01-start-2"
    )));
  });
});

test("inspect dry run describes render and browser inspection steps", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalWorkspaceConfig(workspace);

    const result = spawnSync("node", [CLI, "inspect", workspace, "--dry-run"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.match(result.stdout, /Command: node engine\/cli\.mjs render \. --renderer react/);
    assert.ok(result.stdout.includes("static-server.mjs custom-dist"));
    assert.match(result.stdout, /Chrome inspection URL: http:\/\/127\.0\.0\.1:\d+\/\?print=1/);
  });
});

test("export copies theme font stylesheet and font files for nested workspaces", async () => {
  await withTempWorkspace(async (workspace) => {
    await fs.writeFile(
      path.join(workspace, "openpress.config.mjs"),
      `export default {
  documentDir: "document",
  config: "document/openpress.config.mjs"
};
`,
      "utf8",
    );

    const documentRoot = path.join(workspace, "document");
    await fs.mkdir(path.join(documentRoot, "media"), { recursive: true });
    await fs.writeFile(path.join(documentRoot, "design.md"), "# Design\n", "utf8");
    await fs.writeFile(
      path.join(documentRoot, "openpress.config.mjs"),
      `export default {
  title: "Nested Fonts",
  sourceDir: "content",
  mediaDir: "media",
  themeDir: "theme",
  designDoc: "design.md",
  componentsDir: "components",
  publicDir: "public/openpress",
  outputDir: "dist-react"
};
`,
      "utf8",
    );
    await fs.writeFile(
      path.join(documentRoot, "index.tsx"),
      `import { BaseCoverPage } from "@openpress/core";

export const config = {
  title: "Nested Fonts",
  publicDir: "public/openpress",
  outputDir: "dist-react",
};

export const cover = <BaseCoverPage data-page-title="Nested Fonts"><h1>Nested Fonts</h1></BaseCoverPage>;
`,
      "utf8",
    );
    await writeReactTheme(documentRoot);
    await writeReactReportPage(documentRoot);
    await fs.mkdir(path.join(documentRoot, "chapters", "01-intro", "content"), { recursive: true });
    await fs.writeFile(path.join(documentRoot, "chapters", "01-intro", "content", "01-start.mdx"), "## Intro\n\nBody.\n", "utf8");
    await fs.mkdir(path.join(documentRoot, "theme", "fonts"), { recursive: true });
    await fs.writeFile(
      path.join(documentRoot, "theme", "fonts.css"),
      '@font-face { font-family: "Nested Serif"; src: url("/openpress/fonts/nested-serif.woff2") format("woff2"); }\n',
      "utf8",
    );
    await fs.writeFile(path.join(documentRoot, "theme", "fonts", "nested-serif.woff2"), "font-bytes", "utf8");

    const result = spawnSync("node", [CLI, "export", workspace], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);

    const generatedFonts = await fs.readFile(path.join(workspace, "public", "openpress", "fonts.css"), "utf8");
    assert.match(generatedFonts, /Nested Serif/);
    const copiedFont = await fs.readFile(path.join(workspace, "public", "openpress", "fonts", "nested-serif.woff2"), "utf8");
    assert.equal(copiedFont, "font-bytes");
  });
});

test("export supports chapter-opener pages as no-footer page surfaces", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalWorkspaceConfig(workspace);
    const documentRoot = path.join(workspace, "document");
    await fs.mkdir(documentRoot, { recursive: true });
    await fs.writeFile(path.join(documentRoot, "design.md"), "# Design\n", "utf8");
    await fs.writeFile(
      path.join(documentRoot, "index.tsx"),
      `import { BaseTocPage } from "@openpress/core";

export const config = {
  title: "Tree",
  publicDir: "custom-public/openpress",
  outputDir: "custom-dist",
};

export const toc = <BaseTocPage data-page-title="目錄" id="toc"><h2>目錄</h2></BaseTocPage>;
`,
      "utf8",
    );
    await writeReactTheme(documentRoot);
    await writeReactReportPage(documentRoot);
    await fs.mkdir(path.join(documentRoot, "chapters", "01-tree"), { recursive: true });
    await fs.writeFile(
      path.join(documentRoot, "chapters", "01-tree", "chapter.tsx"),
      `export const meta = {
  slug: "tree",
  title: "Tree",
};

export const opener = (
  <section className="reader-page reader-page--chapter-opener no-footer" data-page-kind="chapter-opener" data-page-footer="false" data-page-title="Tree">
    <div className="page-frame">
      <main className="page-body">
        <h2 className="chapter-opener-title">Tree</h2>
      </main>
    </div>
  </section>
);
`,
      "utf8",
    );
    await fs.mkdir(path.join(documentRoot, "chapters", "01-tree", "content"), { recursive: true });
    await fs.writeFile(path.join(documentRoot, "chapters", "01-tree", "content", "01-tree.mdx"), "## Tree\nTree notes.\n", "utf8");

    const result = spawnSync("node", [CLI, "export", workspace], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);

    const documentJson = JSON.parse(await fs.readFile(path.join(workspace, "custom-public", "openpress", "document.json"), "utf8"));
    const toc = documentJson.blocks.find((block) => block.source?.kind === "toc");
    const opener = documentJson.blocks.find((block) => block.source?.kind === "chapter-opener");
    const chapter = documentJson.blocks.find((block) => block.source?.kind === "content");

    assert.ok(toc?.html.includes("reader-page--toc"));
    assert.ok(toc?.html.includes('data-page-kind="toc"'));
    assert.ok(toc?.html.includes('data-page-footer="false"'));
    assert.ok(!toc?.html.includes('class="page-footer"'));
    assert.ok(opener?.html.includes("reader-page--chapter-opener"));
    assert.ok(opener?.html.includes('data-page-kind="chapter-opener"'));
    assert.ok(opener?.html.includes('class="chapter-opener-title"'));
    assert.ok(!opener?.html.includes('class="page-footer"'));
    assert.ok(chapter?.html.includes("reader-page--content"));
    assert.ok(chapter?.html.includes('data-page-kind="content"'));
    assert.ok(chapter?.html.includes('data-page-footer="true"'));
  });
});

test("export includes katex stylesheet and font assets for latex math", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalWorkspaceConfig(workspace);
    const documentRoot = path.join(workspace, "document");
    await fs.mkdir(documentRoot, { recursive: true });
    await fs.writeFile(path.join(documentRoot, "design.md"), "# Design\n", "utf8");
    await fs.writeFile(
      path.join(documentRoot, "index.tsx"),
      `export const config = {
  title: "Math",
  publicDir: "custom-public/openpress",
  outputDir: "custom-dist",
};
`,
      "utf8",
    );
    await writeReactTheme(documentRoot);
    await writeReactReportPage(documentRoot);
    await fs.mkdir(path.join(documentRoot, "chapters", "01-math", "content"), { recursive: true });
    await fs.writeFile(path.join(documentRoot, "chapters", "01-math", "content", "01-math.mdx"), "## Math\nInline $x^2$.\n", "utf8");

    const result = spawnSync("node", [CLI, "export", workspace], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);

    const documentJson = await fs.readFile(path.join(workspace, "custom-public", "openpress", "document.json"), "utf8");
    assert.match(documentJson, /class=\\"katex/);
    const contentCss = await fs.readFile(path.join(workspace, "custom-public", "openpress", "content.css"), "utf8");
    assert.match(contentCss, /\.katex/);
    assert.match(contentCss, /url\("\/openpress\/katex-fonts\/KaTeX_Main-Regular\.woff2"\)/);
    const katexFont = await fs.stat(path.join(workspace, "custom-public", "openpress", "katex-fonts", "KaTeX_Main-Regular.woff2"));
    assert.ok(katexFont.size > 0);
  });
});
