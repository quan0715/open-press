import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

import { handleWorkspaceSettingsRequest } from "../engine/runtime/workspace-settings-endpoint.mjs";
import { workspaceSettingsPath } from "../engine/runtime/workspace-settings.mjs";
import { rmWithRetry } from "./_temp.mjs";

async function withTempWorkspace(fn) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-settings-endpoint-"));
  try {
    await fs.writeFile(
      path.join(root, "package.json"),
      `${JSON.stringify({ name: "settings-endpoint-fixture", private: true }, null, 2)}\n`,
      "utf8",
    );
    return await fn(root);
  } finally {
    await rmWithRetry(root);
  }
}

test("settings endpoint GET returns normalized settings and source metadata", async () => {
  await withTempWorkspace(async (root) => {
    const res = responseRecorder();
    await handleWorkspaceSettingsRequest(request("GET"), res, { root, writable: true });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.source, "defaults");
    assert.equal(res.body.writable, true);
    assert.equal(res.body.settings.version, 1);
    assert.deepEqual(res.body.settings.appearance, {
      colorMode: "dark",
      accent: "amber",
    });
  });
});

test("settings endpoint PUT validates and atomically persists workspace settings", async () => {
  await withTempWorkspace(async (root) => {
    const res = responseRecorder();
    await handleWorkspaceSettingsRequest(request("PUT", {
      settings: {
        version: 1,
        appearance: { colorMode: "system", accent: "violet" },
        pdf: { filename: "book.pdf" },
      },
    }), res, { root, writable: true });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.source, "settings");
    assert.equal(res.body.settings.appearance.colorMode, "system");
    const stored = JSON.parse(await fs.readFile(workspaceSettingsPath(root), "utf8"));
    assert.equal(stored.appearance.accent, "violet");
    assert.equal(stored.pdf.filename, "book.pdf");
  });
});

test("settings endpoint rejects invalid settings without changing the source", async () => {
  await withTempWorkspace(async (root) => {
    const res = responseRecorder();
    await handleWorkspaceSettingsRequest(request("PUT", {
      settings: {
        version: 1,
        appearance: { colorMode: "sepia", accent: "amber" },
      },
    }), res, { root, writable: true });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.message, /appearance\.colorMode/);
    await assert.rejects(fs.access(workspaceSettingsPath(root)));
  });
});

test("public settings endpoint returns only the safe Appearance projection", async () => {
  await withTempWorkspace(async (root) => {
    const put = responseRecorder();
    await handleWorkspaceSettingsRequest(request("PUT", {
      settings: {
        version: 1,
        appearance: { colorMode: "light", accent: "blue" },
        pdf: { filename: "private.pdf" },
        deploy: { projectName: "private-project" },
      },
    }), put, { root, writable: true });

    const res = responseRecorder();
    await handleWorkspaceSettingsRequest(request("GET"), res, {
      root,
      writable: false,
      publicOnly: true,
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      version: 1,
      appearance: {
        colorMode: "light",
        accent: "blue",
      },
    });
    assert.equal(JSON.stringify(res.body).includes("private"), false);
  });
});

test("read-only settings endpoint refuses PUT", async () => {
  await withTempWorkspace(async (root) => {
    const res = responseRecorder();
    await handleWorkspaceSettingsRequest(request("PUT", {
      settings: {
        version: 1,
        appearance: { colorMode: "light", accent: "rose" },
      },
    }), res, { root, writable: false });

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.ok, false);
    await assert.rejects(fs.access(workspaceSettingsPath(root)));
  });
});

function request(method, body) {
  const req = Readable.from(body === undefined ? [] : [JSON.stringify(body)]);
  req.method = method;
  return req;
}

function responseRecorder() {
  return {
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
      this.body = this.rawBody ? JSON.parse(this.rawBody) : null;
    },
  };
}
