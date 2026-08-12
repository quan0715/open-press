// The local /__openpress/status and /__openpress/deploy routes are served by
// two different hosts (the Vite dev middleware and the static preview server).
// They used to carry independent copies of this logic and drifted. These tests
// pin the shared factory's behavior and assert both hosts still delegate to it.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDeployEndpoints } from "../engine/output/deploy-endpoint.mjs";
import { normalizeConfig } from "../engine/runtime/config.mjs";
import { rmWithRetry } from "./_temp.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function withTempWorkspace(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-deploy-endpoint-"));
  try {
    return await fn(dir);
  } finally {
    await rmWithRetry(dir);
  }
}

function endpointsFor(workspace, deploy = {}, { frameworkRoot = ROOT } = {}) {
  const config = normalizeConfig(workspace, {
    version: 1,
    deploy: {
      adapter: "cloudflare-pages",
      source: ".deploy/sample-site",
      projectName: "sample-pages",
      ...deploy,
    },
  });
  return createDeployEndpoints({
    config,
    workspaceRoot: workspace,
    frameworkRoot,
    cliEntry: path.join(ROOT, "engine", "cli.mjs"),
  });
}

function fakeResponse() {
  return {
    statusCode: undefined,
    headers: undefined,
    body: undefined,
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers;
    },
    end(payload) {
      this.body = JSON.parse(payload);
    },
  };
}

function statusRequest(query = "") {
  return { method: "GET", url: `/__openpress/status${query}` };
}

test("status reports the workspace target when deploy is configured", async () => {
  await withTempWorkspace(async (workspace) => {
    const res = fakeResponse();
    await endpointsFor(workspace).handleStatusRequest(statusRequest(), res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.deploy_configured, true);
    assert.equal(res.body.deploy_adapter, "cloudflare-pages");
    assert.equal(res.body.deploy_source, ".deploy/sample-site");
    assert.equal(res.body.deploy_project_name, "sample-pages");
    assert.equal(res.body.deploy_setup_message, undefined);
  });
});

test("status reports an actionable setup message when projectName is missing", async () => {
  await withTempWorkspace(async (workspace) => {
    const res = fakeResponse();
    await endpointsFor(workspace, { projectName: null }).handleStatusRequest(statusRequest(), res);

    assert.equal(res.body.deploy_configured, false);
    assert.match(res.body.deploy_setup_message, /deploy\.projectName/);
  });
});

test("status surfaces the missing per-Press target instead of falling back to the workspace project", async () => {
  await withTempWorkspace(async (workspace) => {
    const res = fakeResponse();
    await endpointsFor(workspace).handleStatusRequest(statusRequest("?press=resume"), res);

    // resolveDeployTarget throws here; the endpoint must turn that into a
    // setup prompt rather than silently publishing to the workspace site.
    assert.equal(res.body.deploy_configured, false);
    assert.match(res.body.deploy_setup_message, /deploy\.presses\.resume/);
  });
});

test("status resolves a configured per-Press target", async () => {
  await withTempWorkspace(async (workspace) => {
    const res = fakeResponse();
    const endpoints = endpointsFor(workspace, {
      presses: { resume: { source: ".deploy/resume", projectName: "my-resume-pages" } },
    });
    await endpoints.handleStatusRequest(statusRequest("?press=resume"), res);

    assert.equal(res.body.deploy_configured, true);
    assert.equal(res.body.deploy_source, ".deploy/resume");
    assert.equal(res.body.deploy_project_name, "my-resume-pages");
  });
});

test("settings.json edits mark the deployment dirty", async () => {
  await withTempWorkspace(async (workspace) => {
    // An empty framework root isolates the assertion: every other watched path
    // (press/, package.json, framework src) is absent, so settings.json is the
    // only thing that can make this dirty.
    await withTempWorkspace(async (emptyFrameworkRoot) => {
      const metadataDir = path.join(workspace, ".deploy", "sample-site", "openpress");
      await fs.mkdir(metadataDir, { recursive: true });
      const deployedAt = new Date(Date.now() - 3600_000).toISOString();
      await fs.writeFile(path.join(metadataDir, "deploy.json"), JSON.stringify({ deployed_at: deployedAt }), "utf8");
      await fs.mkdir(path.join(workspace, "openpress"), { recursive: true });
      await fs.writeFile(path.join(workspace, "openpress", "settings.json"), '{"version":1}', "utf8");

      const res = fakeResponse();
      const endpoints = endpointsFor(workspace, {}, { frameworkRoot: emptyFrameworkRoot });
      await endpoints.handleStatusRequest(statusRequest(), res);

      assert.equal(res.body.deployed_at, deployedAt);
      assert.equal(res.body.dirty, true, "openpress/settings.json must count toward the dirty check");
    });
  });
});

test("an untouched workspace is not dirty", async () => {
  await withTempWorkspace(async (workspace) => {
    await withTempWorkspace(async (emptyFrameworkRoot) => {
      const metadataDir = path.join(workspace, ".deploy", "sample-site", "openpress");
      await fs.mkdir(metadataDir, { recursive: true });
      // Deployed after everything else was written.
      const deployedAt = new Date(Date.now() + 3600_000).toISOString();
      await fs.writeFile(path.join(metadataDir, "deploy.json"), JSON.stringify({ deployed_at: deployedAt }), "utf8");

      const res = fakeResponse();
      const endpoints = endpointsFor(workspace, {}, { frameworkRoot: emptyFrameworkRoot });
      await endpoints.handleStatusRequest(statusRequest(), res);

      assert.equal(res.body.dirty, false);
    });
  });
});

test("status and deploy reject the wrong HTTP method", async () => {
  await withTempWorkspace(async (workspace) => {
    const endpoints = endpointsFor(workspace);

    const statusRes = fakeResponse();
    await endpoints.handleStatusRequest({ method: "POST", url: "/__openpress/status" }, statusRes);
    assert.equal(statusRes.statusCode, 405);

    const deployRes = fakeResponse();
    await endpoints.handleDeployRequest({ method: "GET", url: "/__openpress/deploy" }, deployRes);
    assert.equal(deployRes.statusCode, 405);
  });
});

test("both local hosts delegate to the shared deploy endpoint factory", async () => {
  const hosts = ["engine/output/static-server.mjs", "vite.config.ts"];
  // Names that previously existed as private per-host copies. Re-introducing
  // any of them means the two hosts can drift again.
  const forbidden = [
    "function handleStatusRequest",
    "function handleDeployRequest",
    "function isDeployConfigured",
    "function deploySetupMessage",
    "function readDeploymentInfo",
    "function isDeploymentDirty",
    "function extractDeployUrl",
  ];

  for (const host of hosts) {
    const source = await fs.readFile(path.join(ROOT, host), "utf8");
    assert.match(source, /createDeployEndpoints/, `${host} must use the shared deploy endpoint factory`);
    for (const name of forbidden) {
      assert.equal(
        source.includes(name),
        false,
        `${host} must not reimplement \`${name}\` — extend engine/output/deploy-endpoint.mjs instead`,
      );
    }
  }
});
