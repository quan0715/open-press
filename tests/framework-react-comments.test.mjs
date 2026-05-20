import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { handleQDocCommentRequest } from "../engine/react/comment-endpoint.mjs";
import {
  clearQDocCommentMarkers,
  decodeQDocCommentMarkerText,
  insertQDocCommentMarker,
  listQDocCommentMarkers,
  updateQDocCommentMarker,
} from "../engine/react/comment-marker.mjs";

async function withTempWorkspace(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "qdoc-react-comments-"));
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

test("insertQDocCommentMarker writes a JSX marker before the selected MDX block line", async () => {
  await withTempWorkspace(async (workspace) => {
    const filePath = path.join(workspace, "document/chapters/01-intro/content/01-start.mdx");
    await writeFile(
      filePath,
      [
        "## Intro",
        "",
        "Selected paragraph.",
        "",
      ].join("\n"),
    );

    const result = await insertQDocCommentMarker({
      root: workspace,
      path: "document/chapters/01-intro/content/01-start.mdx",
      source: { line: 3, column: 1 },
      note: "把這段改得更口語",
      hint: "reader inspector",
      id: "c-1234abcd",
      timestamp: "2026-05-20T00:00:00.000Z",
    });

    const updated = await fs.readFile(filePath, "utf8");
    assert.equal(result.path, "document/chapters/01-intro/content/01-start.mdx");
    assert.equal(result.line, 3);
    assert.match(updated, /^\s*## Intro\n\n\{\/\* @qdoc-comment id="c-1234abcd" ts="2026-05-20T00:00:00.000Z" text="[^"]+" \*\/\}\nSelected paragraph\./);
    assert.deepEqual(decodeQDocCommentMarkerText(result.marker), {
      note: "把這段改得更口語",
      hint: "reader inspector",
    });
  });
});

test("insertQDocCommentMarker rejects paths outside editable React document sources", async () => {
  await withTempWorkspace(async (workspace) => {
    await assert.rejects(
      () => insertQDocCommentMarker({
        root: workspace,
        path: "src/qdoc/workbench.tsx",
        source: { line: 1, column: 1 },
        note: "不應該寫到系統檔",
        id: "c-1234abcd",
        timestamp: "2026-05-20T00:00:00.000Z",
      }),
      /not an editable QDoc document source/,
    );
  });
});

test("listQDocCommentMarkers returns decoded pending comments from editable React sources", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeReactCommentWorkspace(workspace);
    const filePath = path.join(workspace, "document/chapters/01-intro/content/01-start.mdx");
    await insertQDocCommentMarker({
      root: workspace,
      path: "document/chapters/01-intro/content/01-start.mdx",
      source: { line: 3, column: 1 },
      note: "第一個註解",
      hint: "reader",
      id: "c-11111111",
      timestamp: "2026-05-20T00:00:00.000Z",
    });
    await insertQDocCommentMarker({
      root: workspace,
      path: "document/chapters/01-intro/content/01-start.mdx",
      source: { line: 5, column: 1 },
      note: "第二個註解",
      id: "c-22222222",
      timestamp: "2026-05-20T00:01:00.000Z",
    });

    const comments = await listQDocCommentMarkers({ root: workspace });

    assert.deepEqual(comments.map((comment) => ({
      id: comment.id,
      path: comment.path,
      line: comment.line,
      note: comment.note,
      hint: comment.hint,
    })), [
      {
        id: "c-11111111",
        path: "document/chapters/01-intro/content/01-start.mdx",
        line: 3,
        note: "第一個註解",
        hint: "reader",
      },
      {
        id: "c-22222222",
        path: "document/chapters/01-intro/content/01-start.mdx",
        line: 5,
        note: "第二個註解",
        hint: undefined,
      },
    ]);
    assert.match(await fs.readFile(filePath, "utf8"), /c-11111111/);
  });
});

test("clearQDocCommentMarkers removes one or all pending comments", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeReactCommentWorkspace(workspace);
    const target = {
      root: workspace,
      path: "document/chapters/01-intro/content/01-start.mdx",
      source: { line: 3, column: 1 },
      timestamp: "2026-05-20T00:00:00.000Z",
    };
    await insertQDocCommentMarker({ ...target, note: "第一個註解", id: "c-11111111" });
    await insertQDocCommentMarker({ ...target, note: "第二個註解", id: "c-22222222" });

    const one = await clearQDocCommentMarkers({ root: workspace, id: "c-11111111" });
    assert.equal(one.removedCount, 1);
    assert.deepEqual((await listQDocCommentMarkers({ root: workspace })).map((comment) => comment.id), ["c-22222222"]);

    const all = await clearQDocCommentMarkers({ root: workspace, all: true });
    assert.equal(all.removedCount, 1);
    assert.deepEqual(await listQDocCommentMarkers({ root: workspace }), []);
  });
});

test("updateQDocCommentMarker updates an existing source marker without duplicating it", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeReactCommentWorkspace(workspace);
    const filePath = path.join(workspace, "document/chapters/01-intro/content/01-start.mdx");
    await insertQDocCommentMarker({
      root: workspace,
      path: "document/chapters/01-intro/content/01-start.mdx",
      source: { line: 3, column: 1 },
      note: "原本註解",
      hint: "qdoc-react-inspector intent=edit placement=block",
      id: "c-feedcafe",
      timestamp: "2026-05-20T01:00:00.000Z",
    });

    const result = await updateQDocCommentMarker({
      root: workspace,
      id: "c-feedcafe",
      note: "更新後註解",
      hint: "qdoc-react-inspector intent=edit placement=block",
      timestamp: "2026-05-20T01:10:00.000Z",
    });

    const updated = await fs.readFile(filePath, "utf8");
    const comments = await listQDocCommentMarkers({ root: workspace });
    assert.equal(result.id, "c-feedcafe");
    assert.equal(result.note, "更新後註解");
    assert.equal((updated.match(/@qdoc-comment/g) ?? []).length, 1);
    assert.deepEqual(comments.map((comment) => ({
      id: comment.id,
      timestamp: comment.timestamp,
      note: comment.note,
      hint: comment.hint,
    })), [
      {
        id: "c-feedcafe",
        timestamp: "2026-05-20T01:10:00.000Z",
        note: "更新後註解",
        hint: "qdoc-react-inspector intent=edit placement=block",
      },
    ]);
  });
});

test("handleQDocCommentRequest accepts React inspector targets and writes source markers", async () => {
  await withTempWorkspace(async (workspace) => {
    const filePath = path.join(workspace, "document/chapters/01-intro/content/01-start.mdx");
    await writeFile(filePath, "## Intro\n\nSelected paragraph.\n");
    const req = jsonRequest("POST", {
      target: {
        path: "document/chapters/01-intro/content/01-start.mdx",
        source: { line: 3, column: 1 },
      },
      note: "請補一個更清楚的例子",
      hint: "manual inspector note",
    });
    const res = responseRecorder();

    await handleQDocCommentRequest(req, res, {
      root: workspace,
      id: "c-feedcafe",
      timestamp: "2026-05-20T01:00:00.000Z",
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.comment.id, "c-feedcafe");
    assert.equal(res.body.comment.path, "document/chapters/01-intro/content/01-start.mdx");
    assert.match(await fs.readFile(filePath, "utf8"), /@qdoc-comment id="c-feedcafe"/);
  });
});

test("handleQDocCommentRequest updates pending comments through PATCH", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeReactCommentWorkspace(workspace);
    await insertQDocCommentMarker({
      root: workspace,
      path: "document/chapters/01-intro/content/01-start.mdx",
      source: { line: 3, column: 1 },
      note: "待修改註解",
      hint: "qdoc-react-inspector intent=edit placement=block",
      id: "c-feedcafe",
      timestamp: "2026-05-20T01:00:00.000Z",
    });

    const res = responseRecorder();
    await handleQDocCommentRequest(jsonRequest("PATCH", {
      id: "c-feedcafe",
      note: "修改後註解",
      hint: "qdoc-react-inspector intent=edit placement=block",
    }), res, {
      root: workspace,
      timestamp: "2026-05-20T01:10:00.000Z",
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.comment.id, "c-feedcafe");
    assert.equal(res.body.comment.note, "修改後註解");
    assert.equal(res.body.comment.timestamp, "2026-05-20T01:10:00.000Z");
    assert.deepEqual((await listQDocCommentMarkers({ root: workspace })).map((comment) => comment.note), ["修改後註解"]);
  });
});

test("handleQDocCommentRequest lists and clears pending comments", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeReactCommentWorkspace(workspace);
    await insertQDocCommentMarker({
      root: workspace,
      path: "document/chapters/01-intro/content/01-start.mdx",
      source: { line: 3, column: 1 },
      note: "待處理註解",
      id: "c-feedcafe",
      timestamp: "2026-05-20T01:00:00.000Z",
    });

    const getRes = responseRecorder();
    await handleQDocCommentRequest(jsonRequest("GET", {}), getRes, { root: workspace });
    assert.equal(getRes.statusCode, 200);
    assert.deepEqual(getRes.body.comments.map((comment) => comment.id), ["c-feedcafe"]);

    const deleteRes = responseRecorder();
    await handleQDocCommentRequest(jsonRequest("DELETE", { id: "c-feedcafe" }), deleteRes, { root: workspace });
    assert.equal(deleteRes.statusCode, 200);
    assert.equal(deleteRes.body.removedCount, 1);
    assert.deepEqual(await listQDocCommentMarkers({ root: workspace }), []);
  });
});

test("handleQDocCommentRequest rejects unsupported methods", async () => {
  const req = jsonRequest("PUT", {});
  const res = responseRecorder();

  await handleQDocCommentRequest(req, res, { root: "/" });

  assert.equal(res.statusCode, 405);
  assert.equal(res.body.ok, false);
});

function jsonRequest(method, body) {
  const req = Readable.from([JSON.stringify(body)]);
  req.method = method;
  return req;
}

async function writeReactCommentWorkspace(workspace) {
  await writeFile(
    path.join(workspace, "qdoc.config.mjs"),
    `export default {
  title: "Comment Fixture",
  documentDir: "document",
  sourceDir: "content",
  mediaDir: "media",
  themeDir: "theme",
  designDoc: "design.md",
  componentsDir: "components",
  publicDir: "public/qdoc",
  outputDir: "dist"
};
`,
  );
  await writeFile(
    path.join(workspace, "document/index.tsx"),
    `export const config = {
  title: "Comment Fixture",
  sourceDir: "chapters",
};
`,
  );
  await writeFile(path.join(workspace, "document/design.md"), "# Design\n");
  await writeFile(path.join(workspace, "document/components/Page.tsx"), "export default function Page({ children }) { return children; }\n");
  await writeFile(
    path.join(workspace, "document/chapters/01-intro/content/01-start.mdx"),
    [
      "## Intro",
      "",
      "First paragraph.",
      "",
      "Second paragraph.",
      "",
    ].join("\n"),
  );
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
