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
const STATIC_SERVER = path.join(ROOT, "engine", "output", "static-server.mjs");

async function withTempWorkspace(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-test-"));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function writeWorkspacePackageJson(workspace, openpress) {
  await fs.writeFile(
    path.join(workspace, "package.json"),
    JSON.stringify({ name: "test-workspace", private: true, openpress }, null, 2),
    "utf8",
  );
}

async function writeMinimalWorkspaceConfig(workspace, overrides = {}) {
  const adapter = overrides.adapter ?? "cloudflare-pages";
  const requiresConfirmation = overrides.requiresConfirmation ?? true;
  await writeWorkspacePackageJson(workspace, {
    pdf: { filename: "sample-report.pdf" },
    deploy: {
      adapter,
      source: ".deploy/sample-site",
      projectName: "sample-pages",
      requiresConfirmation,
      commitDirty: false,
    },
  });
  await fs.mkdir(path.join(workspace, "press"), { recursive: true });
  // Minimal Press tree so discoverWorkspace recognizes this dir AND
  // pdf/deploy commands don't try to render anything heavy.
  await fs.writeFile(
    path.join(workspace, "press/index.tsx"),
    `import { Workspace, Press, Frame } from "@open-press/core";

export default function FixturePress() {
  return (
    <Workspace>
      <Press title="Sample OpenPress">
        <Frame frameKey="cover" role="manuscript.cover">Sample</Frame>
      </Press>
    </Workspace>
  );
}
`,
    "utf8",
  );
}

async function writeMinimalReactWorkspace(workspace, overrides = {}) {
  const adapter = overrides.adapter ?? "cloudflare-pages";
  const requiresConfirmation = overrides.requiresConfirmation ?? true;
  await writeWorkspacePackageJson(workspace, {
    deploy: {
      adapter,
      source: ".deploy/react-fixture",
      projectName: "react-fixture-pages",
      requiresConfirmation,
      commitDirty: false,
    },
  });
  for (const dir of ["press/media", "press/theme", "press/components"]) {
    await fs.mkdir(path.join(workspace, dir), { recursive: true });
  }
  await fs.writeFile(path.join(workspace, "press", "design.md"), "# Design\n", "utf8");
  await fs.writeFile(
    path.join(workspace, "press", "index.tsx"),
    `import { Workspace, Press, Frame } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections } from "@open-press/core/manuscript";

export default function FixturePress() {
  return (
    <Workspace>
      <Press
        title="React Source Fixture"
        sources={[mdxSource({ id: "story", preset: "section-folders", root: "chapters" })]}
      >
        <Frame frameKey="cover" role="manuscript.cover">Cover</Frame>
        <Sections source="story" />
      </Press>
    </Workspace>
  );
}
`,
    "utf8",
  );
  await fs.mkdir(path.join(workspace, "press", "chapters", "01-intro", "content"), { recursive: true });
  await fs.writeFile(
    path.join(workspace, "press", "chapters", "01-intro", "content", "01-start.mdx"),
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

test("cli dev dry run forces Vite dependency re-optimization", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalWorkspaceConfig(workspace);

    const result = spawnSync("node", [CLI, "dev", workspace, "--renderer", "react", "--dry-run"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.match(result.stdout, /npx vite --force --config vite\.config\.ts/);
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

test("static server exposes read-only source search", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalReactWorkspace(workspace);
    await fs.writeFile(
      path.join(workspace, "document", "chapters", "01-intro", "content", "01-start.mdx"),
      "## Search Fixture\n\nNeedle appears in MDX content.\n",
      "utf8",
    );
    await fs.mkdir(path.join(workspace, "dist"), { recursive: true });
    await fs.writeFile(path.join(workspace, "dist", "index.html"), "<!doctype html><title>OpenPress</title>", "utf8");

    const port = await freePort();
    const server = spawn(
      "node",
      [STATIC_SERVER, "dist", "--host", "127.0.0.1", "--port", String(port), "--workspace", workspace],
      { cwd: workspace, stdio: ["ignore", "pipe", "pipe"] },
    );

    try {
      await waitForServer(port);

      const searchRes = await fetch(`http://127.0.0.1:${port}/__openpress/search?q=Needle`);
      assert.equal(searchRes.status, 200);
      const report = await searchRes.json();
      assert.equal(report.ok, true);
      assert.equal(report.kind, "search");
      assert.equal(report.query, "Needle");
      assert.equal(report.scope, "content");
      assert.equal(report.matchCount, 1);
      assert.deepEqual(report.matches.map((match) => ({
        scope: match.scope,
        path: match.path,
        line: match.line,
        column: match.column,
        text: match.text,
      })), [
        {
          scope: "content",
          path: "press/chapters/01-intro/content/01-start.mdx",
          line: 3,
          column: 1,
          text: "Needle",
        },
      ]);

      const missingQueryRes = await fetch(`http://127.0.0.1:${port}/__openpress/search`);
      assert.equal(missingQueryRes.status, 400);
      assert.equal((await missingQueryRes.json()).ok, false);
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
      && issue.path.endsWith("press/chapters/01-intro/content/01-start.mdx")
      && issue.detail.id === "c-feedcafe"
      && issue.detail.line === 3
    )));
  });
});

test("validate reports Press Tree source warnings from exported document metadata", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalReactWorkspace(workspace);
    await fs.mkdir(path.join(workspace, "public", "openpress"), { recursive: true });
    await fs.writeFile(
      path.join(workspace, "public", "openpress", "document.json"),
      JSON.stringify({
        source: {
          type: "openpress-press-tree-mdx",
          warnings: [
            {
              code: "chain-overflowed",
              chainId: "story:intro",
              remainingBlocks: 2,
            },
          ],
        },
        blocks: [],
      }),
      "utf8",
    );

    const result = spawnSync("node", [CLI, "validate", workspace, "--json"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const report = JSON.parse(result.stdout);

    assert.ok(report.checked.includes("react-source"));
    assert.ok(report.issues.some((issue) => (
      issue.level === "warning"
      && issue.code === "react-source.chain-overflowed"
      && issue.detail.chainId === "story:intro"
      && issue.detail.remainingBlocks === 2
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
