import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { handleChangePreviewRequest } from "../engine/react/change-preview-endpoint.mjs";
import {
  CHANGE_PREVIEW_RELATIVE_PATH,
  readChangePreview,
} from "../engine/react/change-preview.mjs";
import {
  createChangePreviewSourceOverrides,
  renderChangePreview,
} from "../engine/react/change-preview-render.mjs";
import { rmWithRetry } from "./_temp.mjs";

async function withTempWorkspace(fn) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-change-preview-"));
  try {
    return await fn(workspace);
  } finally {
    await rmWithRetry(workspace);
  }
}

async function writeFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value, "utf8");
}

async function writePreview(workspace, proposals) {
  await writeFile(
    path.join(workspace, CHANGE_PREVIEW_RELATIVE_PATH),
    `${JSON.stringify({ proposals }, null, 2)}\n`,
  );
}

test("readChangePreview returns null when no current preview exists", async () => {
  await withTempWorkspace(async (workspace) => {
    assert.equal(await readChangePreview({ root: workspace }), null);
  });
});

test("readChangePreview resolves exact proposal matches and source lines", async () => {
  await withTempWorkspace(async (workspace) => {
    const sourcePath = "press/report/chapters/intro.mdx";
    await writeFile(
      path.join(workspace, sourcePath),
      "# Intro\n\nA repeated opening.\n\nA precise conclusion.\n",
    );
    await writePreview(workspace, [{
      path: sourcePath,
      before: "A precise conclusion.",
      after: "A shorter conclusion.",
      note: "Tighten the ending",
    }]);

    assert.deepEqual(await readChangePreview({ root: workspace }), {
      proposals: [{
        index: 0,
        path: sourcePath,
        before: "A precise conclusion.",
        after: "A shorter conclusion.",
        note: "Tighten the ending",
        matches: 1,
        line: 5,
      }],
    });
  });
});

test("readChangePreview reports missing and ambiguous before text without persisting state", async () => {
  await withTempWorkspace(async (workspace) => {
    const sourcePath = "press/report/chapters/intro.mdx";
    await writeFile(path.join(workspace, sourcePath), "Same text.\n\nSame text.\n");
    await writePreview(workspace, [
      { path: sourcePath, before: "Missing text.", after: "Replacement." },
      { path: sourcePath, before: "Same text.", after: "Different text." },
    ]);

    const preview = await readChangePreview({ root: workspace });
    assert.equal(preview.proposals[0].matches, 0);
    assert.equal(preview.proposals[0].line, undefined);
    assert.equal(preview.proposals[1].matches, 2);
    assert.equal(preview.proposals[1].line, 1);
  });
});

test("readChangePreview treats overlapping source occurrences as ambiguous", async () => {
  await withTempWorkspace(async (workspace) => {
    const sourcePath = "press/report/chapters/intro.mdx";
    await writeFile(path.join(workspace, sourcePath), "aaa\n");
    await writePreview(workspace, [{ path: sourcePath, before: "aa", after: "b" }]);

    const preview = await readChangePreview({ root: workspace });
    assert.equal(preview.proposals[0].matches, 2);
  });
});

test("readChangePreview rejects invalid proposal shape and source paths", async () => {
  await withTempWorkspace(async (workspace) => {
    await writePreview(workspace, [{ path: "../outside.mdx", before: "Before", after: "After" }]);
    await assert.rejects(
      () => readChangePreview({ root: workspace }),
      /invalid source path/,
    );

    await writePreview(workspace, [{
      path: "press/report/../../../outside.mdx",
      before: "Before",
      after: "After",
    }]);
    await assert.rejects(
      () => readChangePreview({ root: workspace }),
      /invalid source path/,
    );

    await writePreview(workspace, [{ path: "press/report/chapters/intro.mdx", before: "", after: "After" }]);
    await assert.rejects(
      () => readChangePreview({ root: workspace }),
      /requires non-empty `before` text/,
    );
  });
});

test("handleChangePreviewRequest returns the current preview and stores proposal-local feedback", async () => {
  await withTempWorkspace(async (workspace) => {
    const sourcePath = "press/report/chapters/intro.mdx";
    await writeFile(path.join(workspace, sourcePath), "Before\n");
    await writePreview(workspace, [{ path: sourcePath, before: "Before", after: "After" }]);

    const getRes = responseRecorder();
    await handleChangePreviewRequest(jsonRequest("GET"), getRes, { root: workspace });
    assert.equal(getRes.statusCode, 200);
    assert.equal(getRes.body.preview.proposals.length, 1);

    const patchRes = responseRecorder();
    await handleChangePreviewRequest(jsonRequest("PATCH", {
      index: 0,
      path: sourcePath,
      before: "Before",
      after: "After",
      feedback: { decision: "reject", comment: "Keep the product term." },
    }), patchRes, { root: workspace });
    assert.equal(patchRes.statusCode, 200);
    assert.deepEqual(patchRes.body.proposal, {
      index: 0,
      feedback: { decision: "reject", comment: "Keep the product term." },
    });
    assert.deepEqual((await readChangePreview({ root: workspace })).proposals[0].feedback, {
      decision: "reject",
      comment: "Keep the product term.",
    });

    const staleRes = responseRecorder();
    await handleChangePreviewRequest(jsonRequest("PATCH", {
      index: 0,
      path: sourcePath,
      before: "Before",
      after: "Stale after",
      feedback: { decision: "accept" },
    }), staleRes, { root: workspace });
    assert.equal(staleRes.statusCode, 400);
    assert.match(staleRes.body.message, /changed.*Refresh/i);

    const deleteRes = responseRecorder();
    await handleChangePreviewRequest(jsonRequest("DELETE"), deleteRes, { root: workspace });
    assert.equal(deleteRes.statusCode, 200);
    assert.equal(deleteRes.body.cleared, true);
    assert.equal(await readChangePreview({ root: workspace }), null);

    const postRes = responseRecorder();
    await handleChangePreviewRequest(jsonRequest("POST"), postRes, { root: workspace });
    assert.equal(postRes.statusCode, 405);
    assert.equal(postRes.body.ok, false);
  });
});

test("concurrent proposal feedback updates do not overwrite one another", async () => {
  await withTempWorkspace(async (workspace) => {
    const sourcePath = "press/report/chapters/intro.mdx";
    await writeFile(path.join(workspace, sourcePath), "Before A\n\nBefore B\n");
    await writePreview(workspace, [
      { path: sourcePath, before: "Before A", after: "After A" },
      { path: sourcePath, before: "Before B", after: "After B" },
    ]);

    const responses = [responseRecorder(), responseRecorder()];
    await Promise.all([
      handleChangePreviewRequest(jsonRequest("PATCH", {
        index: 0,
        path: sourcePath,
        before: "Before A",
        after: "After A",
        feedback: { decision: "accept" },
      }), responses[0], { root: workspace }),
      handleChangePreviewRequest(jsonRequest("PATCH", {
        index: 1,
        path: sourcePath,
        before: "Before B",
        after: "After B",
        feedback: { decision: "more-info", comment: "Explain B." },
      }), responses[1], { root: workspace }),
    ]);

    assert.deepEqual(responses.map((response) => response.statusCode), [200, 200]);
    const preview = await readChangePreview({ root: workspace });
    assert.deepEqual(preview.proposals.map((proposal) => proposal.feedback), [
      { decision: "accept" },
      { decision: "more-info", comment: "Explain B." },
    ]);
  });
});

test("createChangePreviewSourceOverrides applies non-overlapping proposals in memory", async () => {
  await withTempWorkspace(async (workspace) => {
    const sourcePath = "press/report/chapters/intro.mdx";
    await writeFile(path.join(workspace, sourcePath), "# Intro\n\nOld A\n\nOld B\n");
    const proposals = [
      { index: 0, path: sourcePath, before: "Old A", after: "New A\nExtra A", matches: 1, line: 3 },
      { index: 1, path: sourcePath, before: "Old B", after: "New B", matches: 1, line: 5 },
    ];

    const result = await createChangePreviewSourceOverrides({
      root: workspace,
      config: { root: workspace, paths: { documentRoot: path.join(workspace, "press") } },
      proposals,
    });

    assert.equal(result.sourceTextOverrides[sourcePath], "# Intro\n\nNew A\nExtra A\n\nNew B\n");
    assert.equal(result.sourceTextOverrides["report/chapters/intro.mdx"], result.sourceTextOverrides[sourcePath]);
    assert.deepEqual(
      result.proposals.map(({ afterLine, afterEndLine }) => ({ afterLine, afterEndLine })),
      [{ afterLine: 3, afterEndLine: 4 }, { afterLine: 6, afterEndLine: 6 }],
    );
    assert.equal(await fs.readFile(path.join(workspace, sourcePath), "utf8"), "# Intro\n\nOld A\n\nOld B\n");
  });
});

test("createChangePreviewSourceOverrides leaves deletions without a Proposed source range", async () => {
  await withTempWorkspace(async (workspace) => {
    const sourcePath = "press/report/chapters/intro.mdx";
    await writeFile(path.join(workspace, sourcePath), "Keep\n\nDelete this paragraph.\n");

    const result = await createChangePreviewSourceOverrides({
      root: workspace,
      config: { root: workspace, paths: { documentRoot: path.join(workspace, "press") } },
      proposals: [{
        index: 0,
        path: sourcePath,
        before: "Delete this paragraph.\n",
        after: "",
        matches: 1,
        line: 3,
      }],
    });

    assert.equal(result.sourceTextOverrides[sourcePath], "Keep\n\n");
    assert.equal(result.proposals[0].endLine, 3);
    assert.equal(result.proposals[0].afterLine, undefined);
    assert.equal(result.proposals[0].afterEndLine, undefined);
  });
});

test("createChangePreviewSourceOverrides keeps trailing newlines out of the next source line", async () => {
  await withTempWorkspace(async (workspace) => {
    const sourcePath = "press/report/chapters/intro.mdx";
    await writeFile(path.join(workspace, sourcePath), "First\nSecond\nThird\n");

    const result = await createChangePreviewSourceOverrides({
      root: workspace,
      config: { root: workspace, paths: { documentRoot: path.join(workspace, "press") } },
      proposals: [{
        index: 0,
        path: sourcePath,
        before: "Second\n",
        after: "Replacement\n",
        matches: 1,
        line: 2,
      }],
    });

    assert.equal(result.proposals[0].endLine, 2);
    assert.equal(result.proposals[0].afterLine, 2);
    assert.equal(result.proposals[0].afterEndLine, 2);
  });
});

test("renderChangePreview applies TSX proposals without changing authored source", async () => {
  await withTempWorkspace(async (workspace) => {
    const sourcePath = "press/report/press.tsx";
    const source = `import { Frame, Press, Text } from "@open-press/core";

export default function ReportPress() {
  return (
    <Press slug="report" title="Preview fixture">
      <Frame frameKey="cover" role="manuscript.cover"><Text label="title">Current TSX copy.</Text></Frame>
    </Press>
  );
}
`;
    await writeFile(path.join(workspace, sourcePath), source);
    await writePreview(workspace, [{
      path: sourcePath,
      before: "Current TSX copy.",
      after: "Proposed TSX copy.",
      note: "Verify TSX rendering",
    }]);

    const preview = await renderChangePreview({ root: workspace, pressSlug: "report" });

    assert.equal(preview.renderError, undefined);
    assert.match(preview.document.blocks[0].html, /Proposed TSX copy\./);
    assert.doesNotMatch(preview.document.blocks[0].html, /Current TSX copy\./);
    const textEntity = Object.values(preview.document.source.objectEntities)
      .find((entity) => entity.kind === "text" && entity.label === "title");
    assert.equal(textEntity.source.path, sourcePath);
    assert.equal(textEntity.source.source.line, 6);
    assert.equal(await fs.readFile(path.join(workspace, sourcePath), "utf8"), source);
  });
});

test("renderChangePreview skips unrelated Presses", async () => {
  await withTempWorkspace(async (workspace) => {
    const targetPath = "press/target/press.tsx";
    await writeFile(
      path.join(workspace, targetPath),
      `import { Frame, Press, Text } from "@open-press/core";

export default function TargetPress() {
  return (
    <Press slug="target" title="Target preview">
      <Frame frameKey="cover" role="manuscript.cover"><Text label="title">Current target copy.</Text></Frame>
    </Press>
  );
}
`,
    );
    await writeFile(
      path.join(workspace, "press/unrelated/press.tsx"),
      `import { Frame, Press } from "@open-press/core";

export default function UnrelatedPress() {
  return (
    <Press slug="unrelated" title="Unrelated preview">
      <Frame role="manuscript.cover"><p>This malformed frame must not be rendered for target previews.</p></Frame>
    </Press>
  );
}
`,
    );
    await writePreview(workspace, [{
      path: targetPath,
      before: "Current target copy.",
      after: "Proposed target copy.",
    }]);

    const preview = await renderChangePreview({ root: workspace, pressSlug: "target" });

    assert.equal(preview.renderError, undefined);
    assert.match(preview.document.blocks[0].html, /Proposed target copy\./);
  });
});

function jsonRequest(method, body) {
  const request = Readable.from(body === undefined ? [] : [JSON.stringify(body)]);
  request.method = method;
  return request;
}

function responseRecorder() {
  return {
    statusCode: 0,
    headers: {},
    body: null,
    writeHead(statusCode, headers = {}) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body = "") {
      this.body = JSON.parse(String(body));
    },
  };
}
