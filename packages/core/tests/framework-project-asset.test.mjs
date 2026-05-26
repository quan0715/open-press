import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { handleProjectAssetRequest } from "../engine/react/project-asset-endpoint.mjs";
import { listCommentMarkers } from "../engine/react/comment-marker.mjs";

async function withTempWorkspace(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-project-asset-"));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test("project asset endpoint renames media and updates document references", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeProjectAssetWorkspace(workspace);

    const res = responseRecorder();
    await handleProjectAssetRequest(jsonRequest({
      action: "rename",
      kind: "media",
      name: "old-chart.png",
      nextName: "new-chart.png",
    }), res, { root: workspace });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.referenceCount, 1);
    await assert.rejects(() => fs.access(path.join(workspace, "document/media/old-chart.png")));
    await fs.access(path.join(workspace, "document/media/new-chart.png"));
    assert.match(
      await fs.readFile(path.join(workspace, "document/chapters/01-intro/content/01-start.mdx"), "utf8"),
      /new-chart\.png/,
    );
  });
});

test("project asset endpoint refuses to delete referenced media", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeProjectAssetWorkspace(workspace);

    const res = responseRecorder();
    await handleProjectAssetRequest(jsonRequest({
      action: "delete",
      kind: "media",
      name: "old-chart.png",
    }), res, { root: workspace });

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.needsReferenceCleanup, true);
    assert.equal(res.body.referenceCount, 1);
    await fs.access(path.join(workspace, "document/media/old-chart.png"));
  });
});

test("project asset endpoint renames component support directory and literal references", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeProjectAssetWorkspace(workspace);

    const res = responseRecorder();
    await handleProjectAssetRequest(jsonRequest({
      action: "rename",
      kind: "component",
      name: "demo-widget",
      nextName: "better-widget",
    }), res, { root: workspace });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    await assert.rejects(() => fs.access(path.join(workspace, "document/components/demo-widget")));
    await fs.access(path.join(workspace, "document/components/better-widget"));
    const componentSource = await fs.readFile(path.join(workspace, "document/components/DemoWidget.tsx"), "utf8");
    assert.match(componentSource, /better-widget/);
    assert.doesNotMatch(componentSource, /demo-widget/);
  });
});

test("project asset endpoint creates a source comment from the asset dialog", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeProjectAssetWorkspace(workspace);

    const res = responseRecorder();
    await handleProjectAssetRequest(jsonRequest({
      action: "comment",
      kind: "media",
      name: "old-chart.png",
      note: "請加入目前頁面並補一句說明。",
      commentTarget: "current-page",
      currentSource: {
        path: "document/chapters/01-intro/content/01-start.mdx",
        line: 1,
      },
    }), res, {
      root: workspace,
      timestamp: "2026-05-22T00:00:00.000Z",
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.comment.path, "document/chapters/01-intro/content/01-start.mdx");
    const comments = await listCommentMarkers({ root: workspace });
    assert.deepEqual(comments.map((comment) => comment.note), ["Media old-chart.png：請加入目前頁面並補一句說明。"]);
  });
});

test("project asset endpoint preserves rendered object metadata in comment hints", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeProjectAssetWorkspace(workspace);

    const res = responseRecorder();
    await handleProjectAssetRequest(jsonRequest({
      action: "comment",
      kind: "component",
      name: "demo-widget",
      note: "請調整間距。",
      commentTarget: "asset-source",
      objectEntity: {
        id: "component:demo-widget",
        kind: "component",
        label: "demo-widget",
      },
    }), res, {
      root: workspace,
      timestamp: "2026-05-22T00:00:00.000Z",
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    const comments = await listCommentMarkers({ root: workspace });
    assert.equal(comments.length, 1);
    assert.match(comments[0].hint, /object=component:demo-widget/);
  });
});

async function writeProjectAssetWorkspace(workspace) {
  await writeFile(
    path.join(workspace, "openpress.config.mjs"),
    `export default {
  title: "Project Asset Fixture",
  documentDir: "document",
  sourceDir: "content",
  mediaDir: "media",
  themeDir: "theme",
  designDoc: "design.md",
  componentsDir: "components",
  publicDir: "public/openpress",
  outputDir: "dist"
};
`,
  );
  await writeFile(
    path.join(workspace, "document/index.tsx"),
    `export const config = {
  title: "Project Asset Fixture",
  sourceDir: "chapters",
};
`,
  );
  await writeFile(path.join(workspace, "document/design.md"), "# Design\n");
  await writeFile(path.join(workspace, "document/media/old-chart.png"), "fake-png");
  await writeFile(path.join(workspace, "document/components/demo-widget/data.json"), "{}\n");
  await writeFile(
    path.join(workspace, "document/components/DemoWidget.tsx"),
    [
      'import data from "./demo-widget/data.json";',
      "",
      "export default function DemoWidget() {",
      '  return <figure data-openpress-component="demo-widget">{JSON.stringify(data)}</figure>;',
      "}",
      "",
    ].join("\n"),
  );
  await writeFile(
    path.join(workspace, "document/chapters/01-intro/content/01-start.mdx"),
    [
      "## Intro",
      "",
      "![Chart](../../../media/old-chart.png)",
      "",
      "<DemoWidget />",
      "",
    ].join("\n"),
  );
}

async function writeFile(filePath, source) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, source);
}

function jsonRequest(body) {
  const req = Readable.from([JSON.stringify(body)]);
  req.method = "POST";
  return req;
}

function responseRecorder() {
  const res = {
    statusCode: 0,
    headers: {},
    rawBody: "",
    body: null,
    writeHead(statusCode, headers = {}) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body = "") {
      this.rawBody = String(body);
      this.body = JSON.parse(this.rawBody);
    },
  };
  return res;
}
