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
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "qdoc-test-"));
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
    path.join(workspace, "qdoc.config.mjs"),
    `export default {
  title: "Sample QDoc",
  documentDir: ".",
  sourceDir: "custom-content",
  mediaDir: "custom-media",
  themeDir: "custom-assets",
  designSystemDir: "custom-design",
  componentsDir: "custom-components",
  publicDir: "custom-public/qdoc",
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
  for (const dir of ["custom-content", "custom-media", "custom-assets", "custom-design", "custom-components"]) {
    await fs.mkdir(path.join(workspace, dir), { recursive: true });
  }
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
    await fs.writeFile(path.join(workspace, "custom-dist", "index.html"), "<!doctype html><title>QDoc</title>", "utf8");
    await fs.writeFile(path.join(workspace, "custom-dist", "sample-report.pdf"), Buffer.from("%PDF-1.4\n% sample\n"));
    const deployInfoDir = path.join(workspace, ".deploy", "sample-site", "qdoc");
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

      const pdfRes = await fetch(`http://127.0.0.1:${port}/__qdoc/local-pdf-file`);
      assert.equal(pdfRes.headers.get("content-type"), "application/pdf");
      assert.match(pdfRes.headers.get("content-disposition") ?? "", /filename="sample-report\.pdf"/);
      const buf = Buffer.from(await pdfRes.arrayBuffer());
      assert.ok(buf.includes("%PDF-1.4"));

      const statusRes = await fetch(`http://127.0.0.1:${port}/__qdoc/status`);
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
    await writeMinimalWorkspaceConfig(workspace, { adapter: "cloudflare-pages", requiresConfirmation: false });

    const result = spawnSync("node", [CLI, "validate", workspace], { cwd: ROOT, encoding: "utf8" });
    assert.notEqual(result.status, 0, "validation should fail when a public adapter disables confirmation");
    assert.match(result.stdout + result.stderr, /deploy\.confirmation/);
  });
});

test("validate supports machine-readable issue report JSON", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalWorkspaceConfig(workspace, { adapter: "cloudflare-pages", requiresConfirmation: false });

    const result = spawnSync("node", [CLI, "validate", workspace, "--json"], { cwd: ROOT, encoding: "utf8" });
    assert.notEqual(result.status, 0, "validation should still fail when errors are present");

    const report = JSON.parse(result.stdout);
    assert.equal(report.kind, "validation");
    assert.equal(report.ok, false);
    assert.ok(report.checked.includes("deploy-gate"));
    assert.ok(report.issues.some((issue) => issue.level === "error" && issue.code === "deploy.confirmation"));
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
      path.join(workspace, "qdoc.config.mjs"),
      `export default {
  documentDir: "document",
  config: "document/qdoc.config.mjs"
};
`,
      "utf8",
    );

    const documentRoot = path.join(workspace, "document");
    await fs.mkdir(path.join(documentRoot, "content"), { recursive: true });
    await fs.mkdir(path.join(documentRoot, "media"), { recursive: true });
    await fs.mkdir(path.join(documentRoot, "theme"), { recursive: true });
    await fs.mkdir(path.join(documentRoot, "components"), { recursive: true });
    await fs.mkdir(path.join(documentRoot, "design-system"), { recursive: true });
    await fs.writeFile(
      path.join(documentRoot, "qdoc.config.mjs"),
      `export default {
  title: "Nested Fonts",
  sourceDir: "content",
  mediaDir: "media",
  themeDir: "theme",
  designSystemDir: "design-system",
  componentsDir: "components",
  publicDir: "public/qdoc",
  outputDir: "dist-react"
};
`,
      "utf8",
    );
    await fs.writeFile(path.join(documentRoot, "theme", "tokens.css"), ":root { --qd-font-serif: serif; }\n", "utf8");
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
    await fs.writeFile(path.join(documentRoot, "content", "00-cover.md"), "---\nkind: cover\ntitle: Nested Fonts\n---\n", "utf8");
    await fs.mkdir(path.join(documentRoot, "theme", "fonts"), { recursive: true });
    await fs.writeFile(
      path.join(documentRoot, "theme", "fonts.css"),
      '@font-face { font-family: "Nested Serif"; src: url("/qdoc/fonts/nested-serif.woff2") format("woff2"); }\n',
      "utf8",
    );
    await fs.writeFile(path.join(documentRoot, "theme", "fonts", "nested-serif.woff2"), "font-bytes", "utf8");

    const result = spawnSync("node", [CLI, "export", workspace], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);

    const generatedFonts = await fs.readFile(path.join(workspace, "public", "qdoc", "fonts.css"), "utf8");
    assert.match(generatedFonts, /Nested Serif/);
    const copiedFont = await fs.readFile(path.join(workspace, "public", "qdoc", "fonts", "nested-serif.woff2"), "utf8");
    assert.equal(copiedFont, "font-bytes");
  });
});

test("export supports chapter-opener pages as no-footer page surfaces", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalWorkspaceConfig(workspace);
    await fs.writeFile(path.join(workspace, "custom-assets", "tokens.css"), ":root { --qd-font-serif: serif; }\n", "utf8");
    for (const cssFile of [
      "base/page-contract.css",
      "base/typography.css",
      "page-surfaces/cover.css",
      "page-surfaces/back-cover.css",
      "page-surfaces/toc.css",
      "shell/reader-controls.css",
      "base/print.css",
    ]) {
      await fs.mkdir(path.dirname(path.join(workspace, "custom-assets", cssFile)), { recursive: true });
      await fs.writeFile(path.join(workspace, "custom-assets", cssFile), "/* test css */\n", "utf8");
    }
    await fs.writeFile(path.join(workspace, "custom-content", "00-toc.md"), "---\nkind: toc\ntitle: 目錄\n---\n", "utf8");
    await fs.writeFile(
      path.join(workspace, "custom-content", "01-tree-opener.md"),
      "---\nkind: chapter-opener\ntitle: Tree\nsubtitle: 樹狀結構\nsummary: 建立 traversal 與 binary search tree 的閱讀地圖。\n---\n\n本章你會學到 traversal model.\n",
      "utf8",
    );
    await fs.writeFile(path.join(workspace, "custom-content", "02-tree.md"), "---\nkind: chapter\ntitle: Tree\n---\n\n## Tree\nTree notes.\n", "utf8");

    const result = spawnSync("node", [CLI, "export", workspace], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);

    const documentJson = JSON.parse(await fs.readFile(path.join(workspace, "custom-public", "qdoc", "document.json"), "utf8"));
    const toc = documentJson.blocks.find((block) => block.source?.kind === "toc");
    const opener = documentJson.blocks.find((block) => block.source?.kind === "chapter-opener");
    const chapter = documentJson.blocks.find((block) => block.source?.kind === "chapter");

    assert.ok(toc?.html.includes('class="reader-page toc no-footer"'));
    assert.ok(toc?.html.includes('data-page-footer="false"'));
    assert.ok(!toc?.html.includes('class="page-footer"'));
    assert.ok(opener?.html.includes('class="reader-page chapter-opener no-footer"'));
    assert.ok(opener?.html.includes('data-page-kind="chapter-opener"'));
    assert.ok(opener?.html.includes('class="chapter-opener-title"'));
    assert.ok(!opener?.html.includes('class="page-footer"'));
    assert.ok(chapter?.html.includes('class="page-footer"'));
  });
});

test("export includes katex stylesheet and font assets for latex math", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalWorkspaceConfig(workspace);
    await fs.writeFile(path.join(workspace, "custom-assets", "tokens.css"), ":root { --qd-font-serif: serif; }\n", "utf8");
    for (const cssFile of [
      "base/page-contract.css",
      "base/typography.css",
      "page-surfaces/cover.css",
      "page-surfaces/back-cover.css",
      "page-surfaces/toc.css",
      "shell/reader-controls.css",
      "base/print.css",
    ]) {
      await fs.mkdir(path.dirname(path.join(workspace, "custom-assets", cssFile)), { recursive: true });
      await fs.writeFile(path.join(workspace, "custom-assets", cssFile), "/* test css */\n", "utf8");
    }
    await fs.writeFile(path.join(workspace, "custom-content", "01-math.md"), "## Math\nInline $x^2$.\n", "utf8");

    const result = spawnSync("node", [CLI, "export", workspace], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);

    const documentJson = await fs.readFile(path.join(workspace, "custom-public", "qdoc", "document.json"), "utf8");
    assert.match(documentJson, /class=\\"katex/);
    const reportCss = await fs.readFile(path.join(workspace, "custom-public", "qdoc", "report.css"), "utf8");
    assert.match(reportCss, /\.katex/);
    assert.match(reportCss, /url\("\/qdoc\/katex-fonts\/KaTeX_Main-Regular\.woff2"\)/);
    const katexFont = await fs.stat(path.join(workspace, "custom-public", "qdoc", "katex-fonts", "KaTeX_Main-Regular.woff2"));
    assert.ok(katexFont.size > 0);
  });
});
