import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { printUrlToPdf, waitForPrintReady } from "../engine/output/chrome-pdf.mjs";
import * as commandShared from "../engine/commands/_shared.mjs";
import * as deployOutput from "../engine/output/deploy-sync.mjs";
import { rmWithRetry } from "./_temp.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "engine", "cli.mjs");

function readChromePdfPageCount(pdfBody) {
  const source = pdfBody.toString("latin1");
  const catalog = source.match(/\/Type\s*\/Catalog\b[\s\S]*?\/Pages\s+(\d+)\s+(\d+)\s+R/);
  assert.ok(catalog, "Chrome PDF should reference a page tree from its catalog");
  const [, objectNumber, generation] = catalog;
  const pageTree = source.match(
    new RegExp(`(?:^|\\r?\\n)${objectNumber}\\s+${generation}\\s+obj\\b([\\s\\S]*?)endobj`),
  );
  assert.ok(pageTree, "Chrome PDF should contain its referenced page tree object");
  const count = pageTree[1].match(/\/Count\s+(\d+)/);
  assert.ok(count, "Chrome PDF page tree should declare its page count");
  return Number(count[1]);
}

async function withTempWorkspace(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-test-"));
  try {
    return await fn(dir);
  } finally {
    await rmWithRetry(dir);
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
  const pressTargets = overrides.pressTargets;
  const projectName = Object.hasOwn(overrides, "projectName") ? overrides.projectName : "sample-pages";
  await writeWorkspacePackageJson(workspace, {
    pdf: { filename: "sample-report.pdf" },
    deploy: {
      adapter,
      source: ".deploy/sample-site",
      projectName,
      requiresConfirmation,
      commitDirty: false,
      ...(pressTargets ? { presses: pressTargets } : {}),
    },
  });
  await fs.mkdir(path.join(workspace, "press", "report"), { recursive: true });
  // Minimal Press tree so discoverWorkspace recognizes this dir AND
  // pdf/deploy commands don't try to render anything heavy.
  await fs.writeFile(
    path.join(workspace, "press", "report", "press.tsx"),
    `import { Press, Frame } from "@open-press/core";

export default function FixturePress() {
  return (
    <Press slug="report" title="Sample OpenPress">
      <Frame frameKey="cover" role="manuscript.cover">Sample</Frame>
    </Press>
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
  for (const dir of ["press/shared/media", "press/shared/theme", "press/shared/components", "press/report/components"]) {
    await fs.mkdir(path.join(workspace, dir), { recursive: true });
  }
  await fs.writeFile(path.join(workspace, "press", "design.md"), "# Design\n", "utf8");
  await fs.writeFile(
    path.join(workspace, "press", "report", "press.tsx"),
    `import { Press, Frame } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections } from "@open-press/core/manuscript";

export default function FixturePress() {
  return (
    <Press
      slug="report"
      title="React Source Fixture"
      sources={[mdxSource({ id: "story", preset: "section-folders", root: "report/chapters" })]}
    >
      <Frame frameKey="cover" role="manuscript.cover">Cover</Frame>
      <Sections source="story" />
    </Press>
  );
}
`,
    "utf8",
  );
  await fs.mkdir(path.join(workspace, "press", "report", "chapters", "01-intro", "content"), { recursive: true });
  await fs.writeFile(
    path.join(workspace, "press", "report", "chapters", "01-intro", "content", "01-start.mdx"),
    "## Intro\n\nReact MDX source.\n",
    "utf8",
  );
}

async function writeReactTheme(documentRoot) {
  const sharedRoot = path.join(documentRoot, "shared");
  await fs.mkdir(path.join(sharedRoot, "media"), { recursive: true });
  await fs.mkdir(path.join(sharedRoot, "theme"), { recursive: true });
  await fs.writeFile(path.join(sharedRoot, "theme", "tokens.css"), ":root { --openpress-font-serif: serif; }\n", "utf8");
}

async function pathExists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
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
  throw new Error(`Timed out waiting for local preview on port ${port}`);
}

test("findAvailablePort returns a bindable local port", async () => {
  assert.equal(typeof commandShared.findAvailablePort, "function");
  const port = await commandShared.findAvailablePort("127.0.0.1");
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  await new Promise((resolve) => server.close(resolve));
});

test("waitForLocalHttpServer waits through a delayed cold start", async () => {
  const port = await freePort();
  const server = createServer((socket) => {
    socket.end("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 5\r\nConnection: close\r\n\r\nready");
  });
  const delayedListen = setTimeout(() => {
    server.listen(port, "127.0.0.1");
  }, 150);

  try {
    await commandShared.waitForLocalHttpServer("127.0.0.1", String(port), {
      timeoutMs: 1000,
      pollIntervalMs: 25,
    });
  } finally {
    clearTimeout(delayedListen);
    if (server.listening) {
      server.close();
    }
  }
});

test("Vite preview owns local APIs and preserves reserved namespace 404s", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalReactWorkspace(workspace);
    await writeReactTheme(path.join(workspace, "press"));
    await fs.writeFile(
      path.join(workspace, "press", "report", "chapters", "01-intro", "content", "01-start.mdx"),
      "## Search Fixture\n\nNeedle appears in MDX content.\n",
      "utf8",
    );

    const render = spawnSync("node", [CLI, "render", workspace, "--renderer", "react"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(render.status, 0, render.stderr + render.stdout);

    const port = await freePort();
    assert.equal(typeof commandShared.startVitePreview, "function");
    const server = await commandShared.startVitePreview(workspace, "127.0.0.1", String(port));

    try {
      const baseUrl = `http://127.0.0.1:${port}`;
      const routeRes = await fetch(`${baseUrl}/report/preview?print=1`);
      assert.equal(routeRes.status, 200);

      const documentRes = await fetch(`${baseUrl}/openpress/report/document.json`);
      assert.equal(documentRes.status, 200, "Vite preview must still serve rendered OpenPress documents");

      for (const pathname of ["/openpress/missing.json", "/__openpress/missing"]) {
        const response = await fetch(`${baseUrl}${pathname}`, { headers: { Accept: "text/html" } });
        assert.equal(response.status, 404, `${pathname} must not fall back to the SPA shell`);
      }

      const missingMedia = await fetch(`${baseUrl}/openpress/media/not-found`, { headers: { Accept: "text/html" } });
      assert.equal(missingMedia.status, 404);
      assert.equal((await missingMedia.json()).ok, false);

      const statusRes = await fetch(`${baseUrl}/__openpress/status`);
      assert.equal(statusRes.status, 200);
      assert.equal((await statusRes.json()).ok, true);

      const searchRes = await fetch(`${baseUrl}/__openpress/search?q=Needle`);
      assert.equal(searchRes.status, 200);
      assert.equal((await searchRes.json()).matchCount, 1);
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

test("Vite dev serves generated public documents before the next static build", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalReactWorkspace(workspace);
    await writeReactTheme(path.join(workspace, "press"));

    const render = spawnSync("node", [CLI, "render", workspace, "--renderer", "react"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(render.status, 0, render.stderr + render.stdout);

    await fs.rm(path.join(workspace, "dist-react", "openpress", "report", "document.json"));
    assert.equal(await pathExists(path.join(workspace, "public", "openpress", "report", "document.json")), true);

    const port = await freePort();
    const server = spawn(
      process.execPath,
      commandShared.viteCommandArgs(["--force", "--config", commandShared.VITE_CONFIG, "--host", "127.0.0.1", "--port", String(port), "--strictPort"]),
      {
        cwd: workspace,
        env: { ...process.env, ...commandShared.workspaceRuntimeEnv(workspace) },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    try {
      await waitForServer(port);
      const documentRes = await fetch(`http://127.0.0.1:${port}/openpress/report/document.json`);
      assert.equal(documentRes.status, 200);
      assert.equal((await documentRes.json()).meta.title, "React Source Fixture");
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

test("isolated document export writes a fresh reader document outside the dev process", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalReactWorkspace(workspace);

    assert.equal(typeof commandShared.runIsolatedDocumentExport, "function");
    const result = await commandShared.runIsolatedDocumentExport(workspace);

    assert.equal(result.code, 0, result.stderr + result.stdout);
    const documentPath = path.join(workspace, "public", "openpress", "report", "document.json");
    const document = JSON.parse(await fs.readFile(documentPath, "utf8"));
    assert.equal(document.meta.title, "React Source Fixture");
  });
});

test("staged public PDFs use download response headers", async () => {
  await withTempWorkspace(async (workspace) => {
    const config = { pdf: { filename: "sample-report.pdf" } };
    await commandShared.writePdfStageDeployConfig(workspace, ".deploy/site", config);

    const headers = await fs.readFile(path.join(workspace, ".deploy", "site", "_headers"), "utf8");
    const metadataPath = path.join(workspace, ".deploy", "site", "openpress", "deploy.json");
    const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));
    assert.match(headers, /Content-Disposition: attachment; filename="sample-report\.pdf"/);
    assert.equal(metadata.deployed_at, undefined);

    assert.equal(typeof commandShared.markStagedDeploymentComplete, "function");
    await commandShared.markStagedDeploymentComplete(workspace, ".deploy/site");
    const completedMetadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));
    assert.ok(typeof completedMetadata.deployed_at === "string");
  });
});

test("per-Press staging publishes only the selected document and its search corpus", async () => {
  await withTempWorkspace(async (workspace) => {
    const output = path.join(workspace, "dist-react");
    await fs.mkdir(path.join(output, "assets"), { recursive: true });
    await fs.mkdir(path.join(output, "openpress", "media"), { recursive: true });
    await fs.mkdir(path.join(output, "openpress", "resume"), { recursive: true });
    await fs.mkdir(path.join(output, "openpress", "thesis"), { recursive: true });
    await fs.writeFile(path.join(output, "index.html"), "<main>OpenPress</main>");
    await fs.writeFile(path.join(output, "assets", "app.js"), "export {};");
    await fs.writeFile(
      path.join(output, "openpress", "workspace.json"),
      JSON.stringify({
        version: 1,
        presses: [
          { slug: "resume", title: "Mina Chen", documentUrl: "/openpress/resume/document.json" },
          { slug: "thesis", title: "Urban Heat", documentUrl: "/openpress/thesis/document.json" },
        ],
      }),
    );
    await fs.writeFile(
      path.join(output, "openpress", "search-corpus.json"),
      JSON.stringify({
        kind: "search-corpus",
        version: 1,
        files: [
          { path: "press/resume/chapters/01-profile.mdx", text: "Mina Chen" },
          { path: "press/thesis/chapters/01-cover.mdx", text: "Urban Heat" },
        ],
      }),
    );
    await fs.writeFile(
      path.join(output, "openpress", "resume", "document.json"),
      '{"title":"Mina Chen","hero":"/openpress/media/resume.png"}',
    );
    await fs.writeFile(
      path.join(output, "openpress", "thesis", "document.json"),
      '{"title":"Urban Heat","hero":"/openpress/media/thesis.png"}',
    );
    await fs.writeFile(path.join(output, "openpress", "media", "resume.png"), "resume image");
    await fs.writeFile(path.join(output, "openpress", "media", "thesis.png"), "thesis image");

    assert.equal(typeof deployOutput.stagePressDeploy, "function");
    await deployOutput.stagePressDeploy(workspace, "dist-react", ".deploy/resume", "resume");

    const stagedManifest = JSON.parse(await fs.readFile(path.join(workspace, ".deploy", "resume", "openpress", "workspace.json"), "utf8"));
    const stagedCorpus = JSON.parse(await fs.readFile(path.join(workspace, ".deploy", "resume", "openpress", "search-corpus.json"), "utf8"));
    assert.deepEqual(stagedManifest.presses.map((press) => press.slug), ["resume"]);
    assert.deepEqual(stagedCorpus.files.map((file) => file.path), ["press/resume/chapters/01-profile.mdx"]);
    assert.equal(await pathExists(path.join(workspace, ".deploy", "resume", "openpress", "resume", "document.json")), true);
    assert.equal(await pathExists(path.join(workspace, ".deploy", "resume", "openpress", "thesis", "document.json")), false);
    assert.deepEqual(
      JSON.parse(await fs.readFile(path.join(workspace, ".deploy", "resume", "openpress", "document.json"), "utf8")),
      { title: "Mina Chen", hero: "/openpress/media/resume.png" },
    );
    assert.equal(await pathExists(path.join(workspace, ".deploy", "resume", "openpress", "media", "resume.png")), true);
    assert.equal(await pathExists(path.join(workspace, ".deploy", "resume", "openpress", "media", "thesis.png")), false);
  });
});

test("per-Press deploy requires an explicit target instead of publishing the workspace", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalWorkspaceConfig(workspace);

    const result = spawnSync("node", [CLI, "deploy", workspace, "--confirm", "--dry-run", "--press", "report", "--no-pdf"], {
      cwd: ROOT,
      encoding: "utf8",
    });

    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /deploy\.presses\.report/);
  });
});

test("per-Press deploy uses its own target and honours --no-pdf", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalWorkspaceConfig(workspace, {
      pressTargets: {
        report: {
          source: ".deploy/report",
          projectName: "report-pages",
        },
      },
    });

    const result = spawnSync("node", [CLI, "deploy", workspace, "--confirm", "--dry-run", "--press", "report", "--no-pdf"], {
      cwd: ROOT,
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.match(result.stdout, /Target:\s+Press report → report-pages/);
    assert.match(result.stdout, /stage only report into \.deploy\/report/);
    assert.match(result.stdout, /wrangler pages deploy \.deploy\/report --project-name=report-pages/);
    assert.doesNotMatch(result.stdout, /open-press pdf/);
  });
});

test("cli pdf and deploy dry runs use workspace config", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalWorkspaceConfig(workspace, {
      pressTargets: {
        slide: {
          source: ".deploy/sample-slide",
          projectName: "sample-slide-pages",
        },
      },
    });

    const pdf = spawnSync("node", [CLI, "pdf", workspace, "--dry-run"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(pdf.status, 0, pdf.stderr + pdf.stdout);
    assert.ok(pdf.stdout.includes("dist-react/sample-report.pdf"));
    assert.match(pdf.stdout, /vite(?:\.js)? preview .*--strictPort/);

    const pressPdf = spawnSync("node", [CLI, "pdf", workspace, "--press", "report", "--dry-run"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.equal(pressPdf.status, 0, pressPdf.stderr + pressPdf.stdout);
    assert.match(pressPdf.stdout, /http:\/\/127\.0\.0\.1:\d+\/report\/preview\?print=1/);

    const selectedPdf = spawnSync("node", [CLI, "pdf", workspace, "--pages", "0,2", "--dry-run"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.equal(selectedPdf.status, 0, selectedPdf.stderr + selectedPdf.stdout);
    assert.match(selectedPdf.stdout, /\?print=1&pages=0,2/);

    const invalidPageSelection = spawnSync("node", [CLI, "pdf", workspace, "--pages", "0,not-a-page", "--dry-run"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.notEqual(invalidPageSelection.status, 0);
    assert.match(`${invalidPageSelection.stderr}\n${invalidPageSelection.stdout}`, /Invalid PDF page index/);

    const oversizedPageIndex = spawnSync("node", [CLI, "pdf", workspace, "--pages", "9007199254740992", "--dry-run"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.notEqual(oversizedPageIndex.status, 0);
    assert.match(`${oversizedPageIndex.stderr}\n${oversizedPageIndex.stdout}`, /Invalid PDF page index/);

    const deploy = spawnSync("node", [CLI, "deploy", workspace, "--confirm", "--dry-run"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(deploy.status, 0, deploy.stderr + deploy.stdout);
    assert.match(deploy.stdout, /deploy-sync \(copy dist-react/);
    assert.ok(deploy.stdout.includes(".deploy/sample-site/sample-report.pdf"));
    assert.ok(deploy.stdout.includes("wrangler pages deploy .deploy/sample-site --project-name=sample-pages"));

    const pressDeploy = spawnSync("node", [CLI, "deploy", workspace, "--confirm", "--press", "slide", "--dry-run"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.equal(pressDeploy.status, 0, pressDeploy.stderr + pressDeploy.stdout);
    assert.match(pressDeploy.stdout, /Target:\s+Press slide → sample-slide-pages/);
    assert.ok(pressDeploy.stdout.includes(".deploy/sample-slide/sample-report-slide.pdf"));
    assert.ok(pressDeploy.stdout.includes("open-press pdf . --output .deploy/sample-slide/sample-report-slide.pdf --press slide"));
  });
});

test("cli image dry run describes per-page PNG export", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalWorkspaceConfig(workspace);

    const result = spawnSync("node", [CLI, "image", workspace, "--dry-run"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.match(result.stdout, /Command: open-press render \. --renderer react/);
    assert.match(result.stdout, /vite(?:\.js)? preview .*--strictPort/);
    assert.match(result.stdout, /Chrome image export URL: http:\/\/127\.0\.0\.1:\d+\/\?print=1/);
    assert.ok(result.stdout.includes("Output: dist-react/images/page-001.png"));

    const pressResult = spawnSync("node", [CLI, "image", workspace, "--press", "report", "--dry-run"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.equal(pressResult.status, 0, pressResult.stderr + pressResult.stdout);
    assert.match(pressResult.stdout, /Chrome image export URL: http:\/\/127\.0\.0\.1:\d+\/report\/preview\?print=1/);
  });
});

test("cli word dry run describes page Press DOCX export", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalWorkspaceConfig(workspace);

    const result = spawnSync("node", [CLI, "word", workspace, "--dry-run"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.match(result.stdout, /Command: open-press export \./);
    assert.ok(result.stdout.includes("Output: dist-react/sample-report.docx"));
  });
});

test("cli word visual dry run describes rendered snapshot DOCX export", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalWorkspaceConfig(workspace);

    const result = spawnSync("node", [CLI, "word", workspace, "--visual", "--pages", "1-2", "--dry-run"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.match(result.stdout, /Command: open-press render \. --renderer react/);
    assert.match(result.stdout, /Format: Word \.docx \(visual snapshot, page Press only\)/);
    assert.match(result.stdout, /Page selector: 1-2/);
    assert.ok(result.stdout.includes("Snapshots: dist-react/word-images/page-001.png"));
    assert.ok(result.stdout.includes("Output: dist-react/sample-report.docx"));
  });
});

test("cli word defaults to the first page Press in a multi-Press workspace", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalWorkspaceConfig(workspace);
    await fs.mkdir(path.join(workspace, "public", "openpress", "report"), { recursive: true });
    await fs.writeFile(
      path.join(workspace, "public", "openpress", "workspace.json"),
      JSON.stringify({
        version: 1,
        presses: [
          {
            slug: "slide",
            title: "Slides",
            type: "slides",
            documentUrl: "/openpress/slide/document.json",
          },
          {
            slug: "report",
            title: "Report",
            type: "pages",
            documentUrl: "/openpress/report/document.json",
          },
        ],
      }, null, 2),
      "utf8",
    );
    await fs.writeFile(
      path.join(workspace, "public", "openpress", "report", "document.json"),
      JSON.stringify({
        meta: { title: "Report", type: "pages" },
        blocks: [{ html: "<h1>Report</h1><p>DOCX body.</p>" }],
      }, null, 2),
      "utf8",
    );

    const result = spawnSync("node", [CLI, "word", workspace, "--no-build", "--output", "dist-react/report.docx"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.ok(await pathExists(path.join(workspace, "dist-react", "report.docx")));
  });
});

test("cli render uses package-owned Vite entry instead of workspace index.html", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalReactWorkspace(workspace);
    await writeReactTheme(path.join(workspace, "press"));

    assert.equal(await pathExists(path.join(workspace, "index.html")), false);
    assert.equal(await pathExists(path.join(workspace, "vite.config.ts")), false);

    const result = spawnSync("node", [CLI, "render", workspace, "--renderer", "react"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);

    const html = await fs.readFile(path.join(workspace, "dist-react", "index.html"), "utf8");
    assert.match(html, /src="\/assets\/.*openpress\.js"/);
    assert.match(html, /href="\/openpress\/fonts\.css"/);
  });
});

test("nested multi-Press preview routes load root assets and paginate in Chrome", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalReactWorkspace(workspace);
    await writeReactTheme(path.join(workspace, "press"));
    await fs.mkdir(path.join(workspace, "press", "appendix"), { recursive: true });
    await fs.writeFile(
      path.join(workspace, "press", "appendix", "press.tsx"),
      `import { Press, Frame } from "@open-press/core";

export default function AppendixPress() {
  return (
    <Press slug="appendix" title="Appendix">
      <Frame frameKey="cover" role="manuscript.cover">Appendix</Frame>
      <Frame frameKey="content" role="manuscript.content">Appendix content</Frame>
    </Press>
  );
}
`,
      "utf8",
    );

    const render = spawnSync("node", [CLI, "render", workspace, "--renderer", "react"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(render.status, 0, render.stderr + render.stdout);

    const html = await fs.readFile(path.join(workspace, "dist-react", "index.html"), "utf8");
    const assetPaths = [
      html.match(/src="([^"]*openpress\.js)"/)?.[1],
      html.match(/href="([^"]*fonts\.css)"/)?.[1],
    ];
    assert.ok(assetPaths.every(Boolean), "built entry should include the OpenPress script and font stylesheet");

    const port = await freePort();
    const server = await commandShared.startVitePreview(workspace, "127.0.0.1", String(port));

    try {
      await waitForServer(port);
      const baseUrl = `http://127.0.0.1:${port}`;
      const routeRes = await fetch(`${baseUrl}/appendix/preview?print=1`);
      assert.equal(routeRes.status, 200);
      assert.match(await routeRes.text(), /OpenPress/);

      for (const assetPath of assetPaths) {
        const assetRes = await fetch(new URL(assetPath, baseUrl));
        assert.equal(assetRes.status, 200, `expected ${assetPath} to load from Vite preview`);
      }

      const pdfPath = path.join(workspace, ".openpress", "tmp", "nested-route-export.pdf");
      const pdf = await printUrlToPdf({
        root: workspace,
        url: `${baseUrl}/appendix/preview?print=1`,
        outPath: pdfPath,
        waitForReady: (client) => waitForPrintReady(client, {
          totalTimeoutMs: 10000,
          idleTimeoutMs: 3000,
          pollIntervalMs: 100,
          stableMs: 300,
        }),
        debuggingPortBase: 9950,
        debuggingPortRange: 20,
        profilePrefix: "nested-route-pdf-test",
      });
      assert.ok(pdf.pageCount > 0);
      const pdfBody = await fs.readFile(pdfPath);
      assert.ok(pdfBody.includes(Buffer.from("%PDF-")));
      const printedPageCount = readChromePdfPageCount(pdfBody);
      assert.equal(printedPageCount, pdf.pageCount, "Chrome PDF page count should match the OpenPress page count");
    } finally {
      server.kill();
      await new Promise((resolve) => {
        if (server.exitCode !== null) resolve();
        else server.on("exit", () => resolve());
        setTimeout(resolve, 2000);
      });
    }

    const exportPort = await freePort();
    const exportedPdf = spawnSync("node", [CLI, "pdf", workspace, "--no-build", "--port", String(exportPort)], {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, OPENPRESS_PRINT_READY_IDLE_MS: "2000" },
    });
    assert.equal(exportedPdf.status, 0, exportedPdf.stderr + exportedPdf.stdout);
    assert.match(exportedPdf.stdout, /OpenPress PDF:/);
  });
});

test("cli typecheck generates a project config when workspace does not vendor tsconfig", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeWorkspacePackageJson(workspace, {});
    await fs.symlink(path.join(ROOT, "node_modules"), path.join(workspace, "node_modules"), "dir");
    await fs.mkdir(path.join(workspace, "press", "shared", "components"), { recursive: true });
    await fs.writeFile(
      path.join(workspace, "press", "shared", "components", "Badge.tsx"),
      `export default function Badge({ label }: { label: string }) {
  return <span>{label}</span>;
}
`,
      "utf8",
    );
    await fs.mkdir(path.join(workspace, "press", "report"), { recursive: true });
    await fs.writeFile(
      path.join(workspace, "press", "report", "press.tsx"),
      `import { Frame, Press } from "@open-press/core";
import Badge from "@/components/Badge";

export default function FixturePress() {
  return (
    <Press slug="report" title="Typecheck Fixture">
      <Frame frameKey="cover" role="manuscript.cover">
        <Badge label="Cover" />
      </Frame>
    </Press>
  );
}
`,
      "utf8",
    );

    assert.equal(await pathExists(path.join(workspace, "tsconfig.json")), false);

    const result = spawnSync("node", [CLI, "typecheck", workspace], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);

    const generated = JSON.parse(await fs.readFile(path.join(workspace, ".openpress", "typecheck.tsconfig.json"), "utf8"));
    assert.equal(generated.compilerOptions.paths["@/components/*"][0], "press/shared/components/*");
    assert.ok(
      generated.compilerOptions.paths["@open-press/core/mdx"][0].endsWith("src/openpress/mdx/index.ts"),
      "generated config should point @open-press/core/mdx at the package-owned runtime source",
    );
  });
});

test("cli dev dry run forces Vite dependency re-optimization", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalWorkspaceConfig(workspace);

    const result = spawnSync("node", [CLI, "dev", workspace, "--renderer", "react", "--dry-run"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.match(result.stdout, /OpenPress dev URL: http:\/\/127\.0\.0\.1:5173\/workspace/);
    assert.doesNotMatch(result.stdout, /\?dev=1/);
    assert.match(result.stdout, /node .*vite(?:\.js)? --force .*--config (?:.*packages\/core\/)?vite\.config\.ts/);
  });
});

test("cli preview dry run uses Vite preview instead of a separate static server", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalWorkspaceConfig(workspace);

    const result = spawnSync("node", [CLI, "preview", workspace, "--renderer", "react", "--dry-run"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.match(result.stdout, /node .*vite(?:\.js)? preview --host 127\.0\.0\.1 --port 5173 --strictPort --config/);
    assert.doesNotMatch(result.stdout, /static-server\.mjs/);
  });
});

test("framework uses Vite as its only local HTTP host", async () => {
  const staticServerPath = path.join(ROOT, "engine", "output", "static-server.mjs");
  await assert.rejects(fs.access(staticServerPath), { code: "ENOENT" });

  for (const relativePath of [
    "engine/commands/_shared.mjs",
    "engine/commands/preview.mjs",
    "engine/commands/render.mjs",
    "engine/commands/inspect.mjs",
    "engine/commands/pdf.mjs",
    "engine/commands/image.mjs",
  ]) {
    const source = await fs.readFile(path.join(ROOT, relativePath), "utf8");
    assert.equal(source.includes("static-server"), false, `${relativePath} must not start a second HTTP host`);
  }
});

test("Vite preview serves workspace pdf and exposes deployment status", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalWorkspaceConfig(workspace);
    await fs.mkdir(path.join(workspace, "dist-react"), { recursive: true });
    await fs.writeFile(path.join(workspace, "dist-react", "index.html"), "<!doctype html><title>OpenPress</title>", "utf8");
    await fs.writeFile(path.join(workspace, "dist-react", "sample-report.pdf"), Buffer.from("%PDF-1.4\n% sample\n"));
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
    const server = await commandShared.startVitePreview(workspace, "127.0.0.1", String(port));

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

test("Vite preview reports the selected Press deployment target", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalWorkspaceConfig(workspace, {
      projectName: null,
      pressTargets: {
        report: {
          source: ".deploy/report",
          projectName: "report-pages",
        },
      },
    });
    await fs.mkdir(path.join(workspace, "dist-react"), { recursive: true });
    await fs.writeFile(path.join(workspace, "dist-react", "index.html"), "<!doctype html><title>OpenPress</title>", "utf8");
    await fs.mkdir(path.join(workspace, ".deploy", "report", "openpress"), { recursive: true });
    await fs.writeFile(
      path.join(workspace, ".deploy", "report", "openpress", "deploy.json"),
      JSON.stringify({
        pdf: "/sample-report.pdf",
        public_url: "https://report-pages.pages.dev",
        deployed_at: "2026-05-18T00:00:00.000Z",
      }),
      "utf8",
    );

    const port = await freePort();
    const server = await commandShared.startVitePreview(workspace, "127.0.0.1", String(port));

    try {
      await waitForServer(port);
      const statusRes = await fetch(`http://127.0.0.1:${port}/__openpress/status?press=report`);
      const status = await statusRes.json();
      assert.equal(status.deploy_configured, true);
      assert.equal(status.deploy_source, ".deploy/report");
      assert.equal(status.deploy_project_name, "report-pages");
      assert.equal(status.public_url, "https://report-pages.pages.dev");
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

test("Vite preview local PDF export forwards selected page indexes", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalWorkspaceConfig(workspace);
    await fs.mkdir(path.join(workspace, "dist-react"), { recursive: true });
    await fs.writeFile(path.join(workspace, "dist-react", "index.html"), "<!doctype html><title>OpenPress</title>", "utf8");

    const fakeBin = path.join(workspace, "fake-bin");
    const fakeArgsFile = path.join(workspace, "fake-node-args.txt");
    await fs.mkdir(fakeBin, { recursive: true });
    await fs.writeFile(
      path.join(fakeBin, "node"),
      [
        "#!/bin/sh",
        "printf '%s\\n' \"$@\" > \"$OPENPRESS_FAKE_NODE_ARGS\"",
        "mkdir -p \"$PWD/dist-react\"",
        "printf '%s\\n' '%PDF-1.4 fake' > \"$PWD/dist-react/sample-report-report.pdf\"",
        "printf '%s\\n' 'fake pdf export'",
        "exit 0",
        "",
      ].join("\n"),
      "utf8",
    );
    await fs.chmod(path.join(fakeBin, "node"), 0o755);

    const port = await freePort();
    const server = await commandShared.startVitePreview(workspace, "127.0.0.1", String(port), {
      env: {
        OPENPRESS_FAKE_NODE_ARGS: fakeArgsFile,
        PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ""}`,
      },
    });

    try {
      await waitForServer(port);

      const untrusted = await fetch(`http://127.0.0.1:${port}/__openpress/local-pdf-export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OpenPress-Local-Request": "1",
          Origin: "https://attacker.invalid",
        },
        body: JSON.stringify({ press: "report", pages: [0, 2] }),
      });
      assert.equal(untrusted.status, 403);

      const res = await fetch(`http://127.0.0.1:${port}/__openpress/local-pdf-export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OpenPress-Local-Request": "1",
          Origin: `http://127.0.0.1:${port}`,
        },
        body: JSON.stringify({ press: "report", pages: [0, 2] }),
      });
      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.command, "open-press pdf . --press report --pages 0,2");

      const fakeArgs = await fs.readFile(fakeArgsFile, "utf8");
      assert.match(fakeArgs, /cli\.mjs\npdf\n\.\n--press\nreport\n--pages\n0,2/);
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

test("Vite preview exposes read-only source search", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalReactWorkspace(workspace);
    await fs.writeFile(
      path.join(workspace, "press", "report", "chapters", "01-intro", "content", "01-start.mdx"),
      "## Search Fixture\n\nNeedle appears in MDX content.\n",
      "utf8",
    );
    await fs.mkdir(path.join(workspace, "dist-react"), { recursive: true });
    await fs.writeFile(path.join(workspace, "dist-react", "index.html"), "<!doctype html><title>OpenPress</title>", "utf8");

    const port = await freePort();
    const server = await commandShared.startVitePreview(workspace, "127.0.0.1", String(port));

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
          path: "press/report/chapters/01-intro/content/01-start.mdx",
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
      path.join(workspace, "press", "report", "chapters", "01-intro", "content", "01-start.mdx"),
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
      && issue.path.endsWith("press/report/chapters/01-intro/content/01-start.mdx")
      && issue.detail.id === "c-feedcafe"
      && issue.detail.line === 3
    )));
  });
});

test("validate reports Press Tree source warnings from exported document metadata", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalReactWorkspace(workspace);
    await fs.mkdir(path.join(workspace, "public", "openpress", "report"), { recursive: true });
    await fs.writeFile(
      path.join(workspace, "public", "openpress", "workspace.json"),
      JSON.stringify({
        version: 1,
        name: null,
        presses: [
          {
            slug: "report",
            title: "React Source Fixture",
            type: "pages",
            page: null,
            pageCount: 0,
            documentUrl: "/openpress/report/document.json",
          },
        ],
      }),
      "utf8",
    );
    await fs.writeFile(
      path.join(workspace, "public", "openpress", "report", "document.json"),
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
    assert.match(result.stdout, /Command: open-press render \. --renderer react/);
    assert.match(result.stdout, /vite(?:\.js)? preview .*--strictPort/);
    assert.match(result.stdout, /Chrome inspection URL: http:\/\/127\.0\.0\.1:\d+\/\?print=1/);
  });
});

test("inspect dry run points at the requested Press route", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeMinimalWorkspaceConfig(workspace);

    const result = spawnSync("node", [CLI, "inspect", workspace, "--press", "report", "--dry-run"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.match(result.stdout, /Chrome inspection URL: http:\/\/127\.0\.0\.1:\d+\/report\/preview\?print=1/);
  });
});
