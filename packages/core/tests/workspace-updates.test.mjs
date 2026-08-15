import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

import {
  readCoreInfo,
  buildCoreUpdatePrompt,
  buildBuiltInSkillsSyncPrompt,
  buildExternalSkillCheckPrompt,
  buildExternalSkillUpdatePrompt,
  buildAllExternalSkillsUpdatePrompt,
  inspectWorkspaceUpdates,
} from "../engine/runtime/workspace-updates.mjs";
import { handleWorkspaceSettingsRequest } from "../engine/runtime/workspace-settings-endpoint.mjs";
import { DEFAULT_FRAMEWORK_SKILL_NAMES } from "../engine/runtime/skills-tool.mjs";
import { rmWithRetry } from "./_temp.mjs";

async function withTempWorkspace(fn) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-updates-test-"));
  try {
    await fs.writeFile(
      path.join(root, "package.json"),
      `${JSON.stringify({ name: "test-workspace", private: true }, null, 2)}\n`,
      "utf8",
    );
    return await fn(root);
  } finally {
    await rmWithRetry(root);
  }
}

function request(method, body) {
  if (body === undefined) {
    const stream = new Readable({ read() {} });
    stream.push(null);
    stream.method = method;
    return stream;
  }
  const payload = Buffer.from(JSON.stringify(body), "utf8");
  const stream = new Readable({
    read() {
      this.push(payload);
      this.push(null);
    },
  });
  stream.method = method;
  stream.headers = { "content-type": "application/json" };
  return stream;
}

function responseRecorder() {
  let statusCode = 200;
  let headers = {};
  let body = "";
  return {
    writeHead(code, nextHeaders = {}) {
      statusCode = code;
      headers = { ...headers, ...nextHeaders };
      return this;
    },
    end(chunk = "") {
      body += chunk;
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get headers() {
      return headers;
    },
    get body() {
      return body ? JSON.parse(body) : null;
    },
  };
}

test("readCoreInfo detects downstream @open-press/core and local dev source", async () => {
  await withTempWorkspace(async (root) => {
    // 1. Initially no package
    const initial = await readCoreInfo(root);
    assert.equal(initial.coreVersion, null);
    assert.equal(initial.isLocalDev, false);

    // 2. Downstream node_modules/@open-press/core
    const coreDir = path.join(root, "node_modules", "@open-press", "core");
    await fs.mkdir(coreDir, { recursive: true });
    await fs.writeFile(
      path.join(coreDir, "package.json"),
      JSON.stringify({ name: "@open-press/core", version: "3.2.0" }),
      "utf8",
    );

    const downstream = await readCoreInfo(root);
    assert.equal(downstream.coreVersion, "3.2.0");
    assert.equal(downstream.isLocalDev, false);

    // 3. Monorepo root package
    await rmWithRetry(path.join(root, "node_modules"));
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "open-press-monorepo", version: "3.2.0" }),
      "utf8",
    );

    const localDev = await readCoreInfo(root);
    assert.equal(localDev.coreVersion, "3.2.0");
    assert.equal(localDev.isLocalDev, true);
  });
});

test("prompt builders generate precise, safety-scoped prompts", () => {
  // Core update prompt
  const localDevPrompt = buildCoreUpdatePrompt({ coreVersion: "3.2.0", isLocalDev: true });
  assert.equal(localDevPrompt, "");

  const packagePrompt = buildCoreUpdatePrompt({ coreVersion: "3.1.0", isLocalDev: false });
  assert.match(packagePrompt, /@open-press\/core/);
  assert.match(packagePrompt, /3\.1\.0/);
  assert.match(packagePrompt, /npm run openpress:skills/);

  // Built-in skills sync prompt
  const syncPrompt = buildBuiltInSkillsSyncPrompt({ missing: ["openpress-plugins"] });
  assert.match(syncPrompt, /openpress-plugins/);
  assert.match(syncPrompt, /\.agents\/skills/);
  assert.match(syncPrompt, /canonical links/);

  // External skill check prompt
  const checkPrompt = buildExternalSkillCheckPrompt({
    name: "diagram-design",
    source: "custom/diagram-repo",
  });
  assert.match(checkPrompt, /diagram-design/);
  assert.match(checkPrompt, /custom\/diagram-repo/);
  assert.match(checkPrompt, /Do not apply an update yet/);

  // External skill update prompt
  const updatePrompt = buildExternalSkillUpdatePrompt({
    name: "diagram-design",
    source: "custom/diagram-repo",
  });
  assert.match(updatePrompt, /diagram-design/);
  assert.match(updatePrompt, /computedHash/);
  assert.match(updatePrompt, /Leave other skills and workspace settings unchanged/);

  // All external skills update prompt
  const allUpdatePrompt = buildAllExternalSkillsUpdatePrompt({
    skills: [
      { name: "diagram-design", source: "custom/diagram-repo" },
      { name: "brandkit", source: "custom/brandkit" },
    ],
  });
  assert.match(allUpdatePrompt, /2 total/);
  assert.match(allUpdatePrompt, /diagram-design/);
  assert.match(allUpdatePrompt, /brandkit/);
});

test("inspectWorkspaceUpdates inspects built-in skills and OpenPress companion plugins", async () => {
  await withTempWorkspace(async (root) => {
    // The companion list is owned by the installed OpenPress plugin skill, not core.
    const catalogDir = path.join(root, "skills", "openpress-plugins", "references");
    await fs.mkdir(catalogDir, { recursive: true });
    await fs.writeFile(
      path.join(catalogDir, "catalog.json"),
      JSON.stringify({
        plugins: {
          "diagram-design": {
            name: "Diagram Design",
            category: "Architecture",
            description: "Diagrams",
            source: "cathrynlavery/diagram-design",
          },
          "gc-minimal-zine-poster": {
            name: "Minimal Zine Poster",
            category: "Cover Art",
            description: "Covers",
            source: "LiamGvchi/gc-minimal-zine-poster",
          },
        },
      }),
      "utf8",
    );

    // Setup skills-lock.json with 1 companion plugin
    await fs.writeFile(
      path.join(root, "skills-lock.json"),
      JSON.stringify({
        version: 1,
        skills: {
          "diagram-design": {
            source: "cathrynlavery/diagram-design",
            sourceType: "github",
            skillPath: "skills/diagram-design/SKILL.md",
          },
        },
      }),
      "utf8",
    );

    // Setup .agents/skills with 2 built-in skills and 1 companion plugin
    const agentsSkillsDir = path.join(root, ".agents", "skills");
    await fs.mkdir(path.join(agentsSkillsDir, "openpress"), { recursive: true });
    await fs.writeFile(path.join(agentsSkillsDir, "openpress", "SKILL.md"), "name: openpress\n");

    await fs.mkdir(path.join(agentsSkillsDir, "openpress-create-pages"), { recursive: true });
    await fs.writeFile(path.join(agentsSkillsDir, "openpress-create-pages", "SKILL.md"), "name: openpress-create-pages\n");

    await fs.mkdir(path.join(agentsSkillsDir, "diagram-design"), { recursive: true });
    await fs.writeFile(path.join(agentsSkillsDir, "diagram-design", "SKILL.md"), "name: diagram-design\n");

    // Setup .claude/skills links so inspectProjectSkills succeeds
    const claudeDir = path.join(root, ".claude", "skills");
    await fs.mkdir(claudeDir, { recursive: true });
    for (const name of ["openpress", "openpress-create-pages", "diagram-design"]) {
      await fs.symlink(path.join(agentsSkillsDir, name), path.join(claudeDir, name));
    }

    const updates = await inspectWorkspaceUpdates(root);

    // Built-in skills checks
    assert.equal(updates.builtInSkills.expected.length, DEFAULT_FRAMEWORK_SKILL_NAMES.length);
    assert.equal(updates.builtInSkills.installedCount, 2);
    assert.ok(updates.builtInSkills.missing.includes("openpress-deploy"));
    assert.ok(updates.builtInSkills.missing.includes("openpress-plugins"));

    // Companion plugins checks
    assert.ok(updates.plugins);
    assert.equal(updates.plugins.installedCount, 1);
    assert.equal(updates.plugins.totalCatalogCount, 2);

    const diagram = updates.plugins.items.find((p) => p.name === "diagram-design");
    assert.ok(diagram);
    assert.equal(diagram.isInstalled, true);
    assert.ok(diagram.prompts.check);
    assert.ok(diagram.prompts.update);

    const zine = updates.plugins.items.find((p) => p.name === "gc-minimal-zine-poster");
    assert.ok(zine);
    assert.equal(zine.isInstalled, false);
    assert.equal(zine.prompts.install, undefined);
  });
});

test("workspace settings endpoint includes updates in GET response", async () => {
  await withTempWorkspace(async (root) => {
    const res = responseRecorder();
    await handleWorkspaceSettingsRequest(request("GET"), res, { root, writable: true });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.ok(res.body.updates);
    assert.ok(res.body.updates.builtInSkills);
    assert.ok(res.body.updates.plugins);
    assert.ok(res.body.updates.openpress);
  });
});
