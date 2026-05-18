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
