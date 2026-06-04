import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { handleCommentRequest } from "../engine/react/comment-endpoint.mjs";
import {
  clearCommentMarkers,
  decodeCommentMarkerText,
  insertCommentMarker,
  listCommentMarkers,
  updateCommentMarker,
} from "../engine/react/comment-marker.mjs";
import { rmWithRetry } from "./_temp.mjs";

async function withTempWorkspace(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-react-comments-"));
  try {
    return await fn(dir);
  } finally {
    await rmWithRetry(dir);
  }
}

async function writeFile(filePath, source) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, source, "utf8");
}

test("insertCommentMarker writes a JSX marker before the selected MDX block line", async () => {
  await withTempWorkspace(async (workspace) => {
    const filePath = path.join(workspace, "press/report/chapters/01-intro/content/01-start.mdx");
    await writeFile(
      filePath,
      [
        "## Intro",
        "",
        "Selected paragraph.",
        "",
      ].join("\n"),
    );

    const result = await insertCommentMarker({
      root: workspace,
      path: "press/report/chapters/01-intro/content/01-start.mdx",
      source: { line: 3, column: 1 },
      note: "把這段改得更口語",
      hint: "reader inspector",
      id: "c-1234abcd",
      timestamp: "2026-05-20T00:00:00.000Z",
    });

    const updated = await fs.readFile(filePath, "utf8");
    assert.equal(result.path, "press/report/chapters/01-intro/content/01-start.mdx");
    assert.equal(result.line, 3);
    assert.match(updated, /^\s*## Intro\n\n\{\/\* @openpress-comment id="c-1234abcd" ts="2026-05-20T00:00:00.000Z" text="[^"]+" \*\/\}\nSelected paragraph\./);
    assert.deepEqual(decodeCommentMarkerText(result.marker), {
      note: "把這段改得更口語",
      hint: "reader inspector",
    });
  });
});

test("insertCommentMarker writes a block comment for TSX document entry top-level targets", async () => {
  await withTempWorkspace(async (workspace) => {
    const filePath = path.join(workspace, "press/report/press.tsx");
    await writeFile(
      filePath,
      [
        'import { Press } from "@open-press/core";',
        "",
        "export default function FixturePress() {",
        '  return <Press slug="report" title="Comment Target" />;',
        "}",
        "",
      ].join("\n"),
    );

    const result = await insertCommentMarker({
      root: workspace,
      path: "press/report/press.tsx",
      source: { line: 1, column: 1 },
      note: "請檢查 document entry",
      id: "c-entrytop",
      timestamp: "2026-05-20T00:00:00.000Z",
    });

    const updated = await fs.readFile(filePath, "utf8");
    const comments = await listCommentMarkers({ root: workspace });

    assert.match(updated, /^\/\* @openpress-comment id="c-entrytop" ts="2026-05-20T00:00:00.000Z" text="[^"]+" \*\/\nimport/);
    assert.deepEqual(decodeCommentMarkerText(result.marker), { note: "請檢查 document entry" });
    assert.equal(comments[0].id, "c-entrytop");
    assert.equal(comments[0].path, "press/report/press.tsx");
  });
});

test("insertCommentMarker rejects paths outside editable React document sources", async () => {
  await withTempWorkspace(async (workspace) => {
    await assert.rejects(
      () => insertCommentMarker({
        root: workspace,
        path: "engine/cli.mjs",
        source: { line: 1, column: 1 },
        note: "不應該寫到系統檔",
        id: "c-1234abcd",
        timestamp: "2026-05-20T00:00:00.000Z",
      }),
      /not an editable OpenPress document source/,
    );
  });
});

test("listCommentMarkers returns decoded pending comments from editable React sources", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeReactCommentWorkspace(workspace);
    const filePath = path.join(workspace, "press/report/chapters/01-intro/content/01-start.mdx");
    await insertCommentMarker({
      root: workspace,
      path: "press/report/chapters/01-intro/content/01-start.mdx",
      source: { line: 3, column: 1 },
      note: "第一個註解",
      hint: "reader",
      id: "c-11111111",
      timestamp: "2026-05-20T00:00:00.000Z",
    });
    await insertCommentMarker({
      root: workspace,
      path: "press/report/chapters/01-intro/content/01-start.mdx",
      source: { line: 5, column: 1 },
      note: "第二個註解",
      id: "c-22222222",
      timestamp: "2026-05-20T00:01:00.000Z",
    });

    const comments = await listCommentMarkers({ root: workspace });

    assert.deepEqual(comments.map((comment) => ({
      id: comment.id,
      path: comment.path,
      line: comment.line,
      note: comment.note,
      hint: comment.hint,
    })), [
      {
        id: "c-11111111",
        path: "press/report/chapters/01-intro/content/01-start.mdx",
        line: 3,
        note: "第一個註解",
        hint: "reader",
      },
      {
        id: "c-22222222",
        path: "press/report/chapters/01-intro/content/01-start.mdx",
        line: 5,
        note: "第二個註解",
        hint: undefined,
      },
    ]);
    assert.match(await fs.readFile(filePath, "utf8"), /c-11111111/);
  });
});

test("clearCommentMarkers removes one or all pending comments", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeReactCommentWorkspace(workspace);
    const target = {
      root: workspace,
      path: "press/report/chapters/01-intro/content/01-start.mdx",
      source: { line: 3, column: 1 },
      timestamp: "2026-05-20T00:00:00.000Z",
    };
    await insertCommentMarker({ ...target, note: "第一個註解", id: "c-11111111" });
    await insertCommentMarker({ ...target, note: "第二個註解", id: "c-22222222" });

    const one = await clearCommentMarkers({ root: workspace, id: "c-11111111" });
    assert.equal(one.removedCount, 1);
    assert.deepEqual((await listCommentMarkers({ root: workspace })).map((comment) => comment.id), ["c-22222222"]);

    const all = await clearCommentMarkers({ root: workspace, all: true });
    assert.equal(all.removedCount, 1);
    assert.deepEqual(await listCommentMarkers({ root: workspace }), []);
  });
});

test("updateCommentMarker updates an existing source marker without duplicating it", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeReactCommentWorkspace(workspace);
    const filePath = path.join(workspace, "press/report/chapters/01-intro/content/01-start.mdx");
    await insertCommentMarker({
      root: workspace,
      path: "press/report/chapters/01-intro/content/01-start.mdx",
      source: { line: 3, column: 1 },
      note: "原本註解",
      hint: "openpress-react-inspector intent=edit placement=block",
      id: "c-feedcafe",
      timestamp: "2026-05-20T01:00:00.000Z",
    });

    const result = await updateCommentMarker({
      root: workspace,
      id: "c-feedcafe",
      note: "更新後註解",
      hint: "openpress-react-inspector intent=edit placement=block",
      timestamp: "2026-05-20T01:10:00.000Z",
    });

    const updated = await fs.readFile(filePath, "utf8");
    const comments = await listCommentMarkers({ root: workspace });
    assert.equal(result.id, "c-feedcafe");
    assert.equal(result.note, "更新後註解");
    assert.equal((updated.match(/@openpress-comment/g) ?? []).length, 1);
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
        hint: "openpress-react-inspector intent=edit placement=block",
      },
    ]);
  });
});

test("handleCommentRequest accepts React inspector targets and writes source markers", async () => {
  await withTempWorkspace(async (workspace) => {
    const filePath = path.join(workspace, "press/report/chapters/01-intro/content/01-start.mdx");
    await writeFile(filePath, "## Intro\n\nSelected paragraph.\n");
    const req = jsonRequest("POST", {
      target: {
        path: "press/report/chapters/01-intro/content/01-start.mdx",
        source: { line: 3, column: 1 },
      },
      note: "請補一個更清楚的例子",
      hint: "manual inspector note",
    });
    const res = responseRecorder();

    await handleCommentRequest(req, res, {
      root: workspace,
      id: "c-feedcafe",
      timestamp: "2026-05-20T01:00:00.000Z",
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.comment.id, "c-feedcafe");
    assert.equal(res.body.comment.path, "press/report/chapters/01-intro/content/01-start.mdx");
    assert.match(await fs.readFile(filePath, "utf8"), /@openpress-comment id="c-feedcafe"/);
  });
});

test("handleCommentRequest updates pending comments through PATCH", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeReactCommentWorkspace(workspace);
    await insertCommentMarker({
      root: workspace,
      path: "press/report/chapters/01-intro/content/01-start.mdx",
      source: { line: 3, column: 1 },
      note: "待修改註解",
      hint: "openpress-react-inspector intent=edit placement=block",
      id: "c-feedcafe",
      timestamp: "2026-05-20T01:00:00.000Z",
    });

    const res = responseRecorder();
    await handleCommentRequest(jsonRequest("PATCH", {
      id: "c-feedcafe",
      note: "修改後註解",
      hint: "openpress-react-inspector intent=edit placement=block",
    }), res, {
      root: workspace,
      timestamp: "2026-05-20T01:10:00.000Z",
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.comment.id, "c-feedcafe");
    assert.equal(res.body.comment.note, "修改後註解");
    assert.equal(res.body.comment.timestamp, "2026-05-20T01:10:00.000Z");
    assert.deepEqual((await listCommentMarkers({ root: workspace })).map((comment) => comment.note), ["修改後註解"]);
  });
});

test("handleCommentRequest lists and clears pending comments", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeReactCommentWorkspace(workspace);
    await insertCommentMarker({
      root: workspace,
      path: "press/report/chapters/01-intro/content/01-start.mdx",
      source: { line: 3, column: 1 },
      note: "待處理註解",
      id: "c-feedcafe",
      timestamp: "2026-05-20T01:00:00.000Z",
    });

    const getRes = responseRecorder();
    await handleCommentRequest(jsonRequest("GET", {}), getRes, { root: workspace });
    assert.equal(getRes.statusCode, 200);
    assert.deepEqual(getRes.body.comments.map((comment) => comment.id), ["c-feedcafe"]);

    const deleteRes = responseRecorder();
    await handleCommentRequest(jsonRequest("DELETE", { id: "c-feedcafe" }), deleteRes, { root: workspace });
    assert.equal(deleteRes.statusCode, 200);
    assert.equal(deleteRes.body.removedCount, 1);
    assert.deepEqual(await listCommentMarkers({ root: workspace }), []);
  });
});

test("handleCommentRequest rejects unsupported methods", async () => {
  const req = jsonRequest("PUT", {});
  const res = responseRecorder();

  await handleCommentRequest(req, res, { root: "/" });

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
    path.join(workspace, "package.json"),
    JSON.stringify({ name: "comment-fixture", private: true, openpress: {} }, null, 2),
  );
  await writeFile(
    path.join(workspace, "press/report/press.tsx"),
    `import { Press, Frame } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";

export default function Fixture() {
  return (
    <Press
      slug="report"
      title="Comment Fixture"
      componentsDir="./components"
      sources={[mdxSource({ id: "story", preset: "section-folders", root: "report/chapters" })]}
    >
      <Frame frameKey="cover" role="manuscript.cover">Cover</Frame>
    </Press>
  );
}
`,
  );
  await writeFile(path.join(workspace, "press/design.md"), "# Design\n");
  await writeFile(path.join(workspace, "press/report/components/Page.tsx"), "export default function Page({ children }) { return children; }\n");
  await writeFile(
    path.join(workspace, "press/report/chapters/01-intro/content/01-start.mdx"),
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
