import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { generateWorkspaceThumbnails } from "../engine/output/workspace-thumbnails.mjs";
import { rmWithRetry } from "./_temp.mjs";

async function withTempWorkspace(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-workspace-thumbnails-"));
  try {
    return await fn(dir);
  } finally {
    await rmWithRetry(dir);
  }
}

test("generateWorkspaceThumbnails captures each Press first page and patches public and built manifests", async () => {
  await withTempWorkspace(async (workspace) => {
    const publicDir = path.join(workspace, "public/openpress");
    const outputDir = path.join(workspace, "dist-react");
    const builtOpenpressDir = path.join(outputDir, "openpress");
    const manifest = {
      version: 1,
      name: "Fixture Workspace",
      presses: [
        {
          slug: "report",
          title: "Report",
          type: "pages",
          page: { pagePreset: "a4" },
          pageCount: 3,
          documentUrl: "/openpress/report/document.json",
        },
        {
          slug: "slide",
          title: "Slide",
          type: "slides",
          page: { pagePreset: "slide-16-9" },
          pageCount: 2,
          documentUrl: "/openpress/slide/document.json",
        },
      ],
    };
    await fs.mkdir(publicDir, { recursive: true });
    await fs.mkdir(builtOpenpressDir, { recursive: true });
    await fs.writeFile(path.join(publicDir, "workspace.json"), JSON.stringify(manifest, null, 2), "utf8");
    await fs.writeFile(path.join(builtOpenpressDir, "workspace.json"), JSON.stringify(manifest, null, 2), "utf8");

    const calls = [];
    const result = await generateWorkspaceThumbnails({
      root: workspace,
      config: {
        paths: {
          publicDir,
          outputDir,
        },
      },
      host: "127.0.0.1",
      port: "5999",
      startServer: async () => ({ pid: 123 }),
      stopServer: async () => undefined,
      capturePages: async ({ url, outDir, pageSelector }) => {
        calls.push({ url, outDir, pageSelector });
        await fs.mkdir(outDir, { recursive: true });
        const file = path.join(outDir, "page-001.png");
        await fs.writeFile(file, Buffer.from(`png:${url}`));
        return { files: [file], pageCount: 1, selectedPageNumbers: [1] };
      },
    });

    assert.deepEqual(calls.map((call) => call.url), [
      "http://127.0.0.1:5999/report?print=1",
      "http://127.0.0.1:5999/slide?print=1",
    ]);
    assert.deepEqual(calls.map((call) => call.pageSelector), [
      [{ kind: "single", value: 1 }],
      [{ kind: "single", value: 1 }],
    ]);
    assert.deepEqual(result.map((entry) => entry.thumbnailUrl), [
      "/openpress/report/thumbnail.png",
      "/openpress/slide/thumbnail.png",
    ]);

    assert.equal(await fs.readFile(path.join(publicDir, "report/thumbnail.png"), "utf8"), "png:http://127.0.0.1:5999/report?print=1");
    assert.equal(await fs.readFile(path.join(publicDir, "slide/thumbnail.png"), "utf8"), "png:http://127.0.0.1:5999/slide?print=1");
    assert.equal(await fs.readFile(path.join(builtOpenpressDir, "report/thumbnail.png"), "utf8"), "png:http://127.0.0.1:5999/report?print=1");
    assert.equal(await fs.readFile(path.join(builtOpenpressDir, "slide/thumbnail.png"), "utf8"), "png:http://127.0.0.1:5999/slide?print=1");

    const publicManifest = JSON.parse(await fs.readFile(path.join(publicDir, "workspace.json"), "utf8"));
    const builtManifest = JSON.parse(await fs.readFile(path.join(builtOpenpressDir, "workspace.json"), "utf8"));
    assert.deepEqual(publicManifest.presses.map((press) => press.thumbnailUrl), [
      "/openpress/report/thumbnail.png",
      "/openpress/slide/thumbnail.png",
    ]);
    assert.deepEqual(builtManifest.presses.map((press) => press.thumbnailUrl), [
      "/openpress/report/thumbnail.png",
      "/openpress/slide/thumbnail.png",
    ]);
  });
});
