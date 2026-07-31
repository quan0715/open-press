import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { diagnose } from "../engine/commands/doctor.mjs";
import { rmWithRetry } from "./_temp.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const CLI = path.join(ROOT, "packages", "core", "engine", "cli.mjs");
const FRAMEWORK_SKILLS = [
  "chinese-ai-writing-polish",
  "openpress",
  "openpress-apply-comments",
  "openpress-collaborate",
  "openpress-create-pages",
  "openpress-create-slide",
  "openpress-deploy",
  "openpress-diagram-drawing",
  "openpress-upgrade",
];

async function makeWorkspace() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-skills-sync-"));
  const pressRoot = path.join(root, "press", "fixture");
  await fs.mkdir(pressRoot, { recursive: true });
  await fs.writeFile(
    path.join(pressRoot, "press.tsx"),
    `export default function Fixture() { return null; }\n`,
    "utf8",
  );
  return root;
}

async function writeLock(root, skills, version = 1) {
  await fs.writeFile(
    path.join(root, "skills-lock.json"),
    `${JSON.stringify({ version, skills }, null, 2)}\n`,
    "utf8",
  );
}

function runCli(root, args, env = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", ...env },
  });
}

async function makeFakeNpx(root) {
  const bin = path.join(root, "test-bin");
  const executable = path.join(bin, "npx");
  await fs.mkdir(bin, { recursive: true });
  await fs.writeFile(
    executable,
    `#!/usr/bin/env node
import fs from "node:fs";
fs.appendFileSync(
  process.env.OPENPRESS_TEST_COMMAND_LOG,
  JSON.stringify(process.argv.slice(2)) + "\\n",
);
for (const skillName of (process.env.OPENPRESS_TEST_INSTALLED_SKILLS ?? "").split(",").filter(Boolean)) {
  const canonical = new URL("../.agents/skills/" + skillName + "/", import.meta.url);
  const claude = new URL("../.claude/skills/" + skillName + "/", import.meta.url);
  fs.mkdirSync(canonical, { recursive: true });
  fs.mkdirSync(claude, { recursive: true });
  fs.writeFileSync(new URL("SKILL.md", canonical), "# " + skillName + "\\n");
  fs.writeFileSync(new URL("SKILL.md", claude), "# " + skillName + "\\n");
}
process.exit(Number(process.env.OPENPRESS_TEST_NPX_EXIT ?? 0));
`,
    "utf8",
  );
  await fs.chmod(executable, 0o755);
  return bin;
}

test("skills:sync plans modern lock entries by exact source and skill", async () => {
  const root = await makeWorkspace();
  try {
    await writeLock(root, {
      openpress: {
        source: "quan0715/open-press",
        sourceType: "github",
        skillPath: "skills/openpress/SKILL.md",
        computedHash: "framework-hash",
      },
      "brand-tone": {
        source: "acme/writing-skills",
        ref: "v2",
        sourceType: "github",
        skillPath: "skills/brand-tone/SKILL.md",
        computedHash: "brand-hash",
      },
      "data-helper": {
        source: "@acme/data-helper",
        sourceType: "node_modules",
        skillPath: "skills/data-helper/SKILL.md",
        computedHash: "package-hash",
      },
    });

    const result = runCli(root, ["skills:sync", root, "--dry-run"]);

    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.equal(
      result.stdout,
      [
        "Command: npx --yes skills@1.5.18 add quan0715/open-press --skill '*' --agent universal claude-code --yes",
        "Command: npx --yes skills@1.5.18 add 'acme/writing-skills#v2' --skill brand-tone --agent universal claude-code --yes",
        "Command: npx --yes skills@1.5.18 experimental_sync --agent universal claude-code --force --yes",
        "",
      ].join("\n"),
    );
  } finally {
    await rmWithRetry(root);
  }
});

test("skills:sync rejects unsupported lock versions instead of replacing their sources", async () => {
  const root = await makeWorkspace();
  try {
    await writeLock(root, {}, 2);

    const result = runCli(root, ["skills:sync", root, "--dry-run"]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unsupported skills-lock\.json version 2/);
    assert.doesNotMatch(result.stdout, /quan0715\/open-press/);
  } finally {
    await rmWithRetry(root);
  }
});

test("skills:sync passes non-interactive agent targets to the pinned upstream CLI", async () => {
  const root = await makeWorkspace();
  try {
    const bin = await makeFakeNpx(root);
    const logPath = path.join(root, "commands.jsonl");
    await writeLock(root, {
      openpress: {
        source: "quan0715/open-press",
        sourceType: "github",
        skillPath: "skills/openpress/SKILL.md",
        computedHash: "framework-hash",
      },
    });

    const result = runCli(root, ["skills:sync", root], {
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      OPENPRESS_TEST_COMMAND_LOG: logPath,
      OPENPRESS_TEST_INSTALLED_SKILLS: FRAMEWORK_SKILLS.join(","),
    });

    assert.equal(result.status, 0, result.stderr + result.stdout);
    const calls = (await fs.readFile(logPath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.deepEqual(calls, [[
      "--yes",
      "skills@1.5.18",
      "add",
      "quan0715/open-press",
      "--skill",
      "*",
      "--agent",
      "universal",
      "claude-code",
      "--yes",
    ]]);
  } finally {
    await rmWithRetry(root);
  }
});

test("skills:sync fails when upstream exits zero without installing required skills", async () => {
  const root = await makeWorkspace();
  try {
    const bin = await makeFakeNpx(root);
    const logPath = path.join(root, "commands.jsonl");
    await writeLock(root, {
      openpress: {
        source: "quan0715/open-press",
        sourceType: "github",
        skillPath: "skills/openpress/SKILL.md",
        computedHash: "framework-hash",
      },
    });

    const result = runCli(root, ["skills:sync", root], {
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      OPENPRESS_TEST_COMMAND_LOG: logPath,
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Skill sync verification failed/);
    assert.match(result.stderr, /missing canonical \.agents\/skills directory/);
  } finally {
    await rmWithRetry(root);
  }
});

test("skills:sync reconstructs well-known lock sources as HTTPS endpoints", async () => {
  const root = await makeWorkspace();
  try {
    await writeLock(root, {
      "remote-helper": {
        source: "wellknown/skills.example.com",
        sourceType: "well-known",
        skillPath: "remote-helper",
        computedHash: "remote-hash",
      },
    });

    const result = runCli(root, ["skills:sync", root, "--dry-run"]);

    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.match(
      result.stdout,
      /add https:\/\/skills\.example\.com --skill remote-helper --agent universal claude-code --yes/,
    );
    assert.doesNotMatch(result.stdout, /add wellknown\/skills\.example\.com/);
  } finally {
    await rmWithRetry(root);
  }
});

test("upgrade syncs skills when no framework update is pending and propagates failures", async () => {
  const root = await makeWorkspace();
  try {
    const bin = await makeFakeNpx(root);
    const logPath = path.join(root, "commands.jsonl");
    await fs.writeFile(
      path.join(root, "package.json"),
      `${JSON.stringify({ name: "fixture", private: true }, null, 2)}\n`,
      "utf8",
    );
    await writeLock(root, {
      openpress: {
        source: "quan0715/open-press",
        sourceType: "github",
        skillPath: "skills/openpress/SKILL.md",
        computedHash: "framework-hash",
      },
    });

    const result = runCli(root, ["upgrade", root], {
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      OPENPRESS_TEST_COMMAND_LOG: logPath,
      OPENPRESS_TEST_NPX_EXIT: "9",
    });

    assert.equal(result.status, 9, result.stderr + result.stdout);
    const calls = (await fs.readFile(logPath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.equal(calls.length, 1);
    assert.equal(calls[0][1], "skills@1.5.18");
  } finally {
    await rmWithRetry(root);
  }
});

test("upgrade dry-run JSON contains the skill plan without text before the JSON document", async () => {
  const root = await makeWorkspace();
  try {
    await writeLock(root, {
      openpress: {
        source: "quan0715/open-press",
        sourceType: "github",
        skillPath: "skills/openpress/SKILL.md",
        computedHash: "framework-hash",
      },
    });

    const result = runCli(root, ["upgrade", root, "--dry-run", "--json"]);

    assert.equal(result.status, 0, result.stderr + result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.status, "dry-run");
    assert.deepEqual(output.skillsPlan, [
      "npx --yes skills@1.5.18 add quan0715/open-press --skill '*' --agent universal claude-code --yes",
    ]);
  } finally {
    await rmWithRetry(root);
  }
});

test("upgrade apply JSON suppresses command chatter and remains one JSON document", async () => {
  const root = await makeWorkspace();
  try {
    const bin = await makeFakeNpx(root);
    const logPath = path.join(root, "commands.jsonl");
    await writeLock(root, {
      openpress: {
        source: "quan0715/open-press",
        sourceType: "github",
        skillPath: "skills/openpress/SKILL.md",
        computedHash: "framework-hash",
      },
    });

    const result = runCli(root, ["upgrade", root, "--no-deps", "--json"], {
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      OPENPRESS_TEST_COMMAND_LOG: logPath,
      OPENPRESS_TEST_INSTALLED_SKILLS: FRAMEWORK_SKILLS.join(","),
    });

    assert.equal(result.status, 0, result.stderr + result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.status, "applied");
    assert.equal(output.after.stale, false);
  } finally {
    await rmWithRetry(root);
  }
});

test("upgrade JSON reports an upstream skill failure as structured output", async () => {
  const root = await makeWorkspace();
  try {
    const bin = await makeFakeNpx(root);
    const logPath = path.join(root, "commands.jsonl");
    await writeLock(root, {
      openpress: {
        source: "quan0715/open-press",
        sourceType: "github",
        skillPath: "skills/openpress/SKILL.md",
        computedHash: "framework-hash",
      },
    });

    const result = runCli(root, ["upgrade", root, "--no-deps", "--json"], {
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      OPENPRESS_TEST_COMMAND_LOG: logPath,
      OPENPRESS_TEST_NPX_EXIT: "9",
    });

    assert.equal(result.status, 9);
    const output = JSON.parse(result.stdout);
    assert.equal(output.status, "failed");
    assert.equal(output.stage, "skills");
    assert.equal(output.exitCode, 9);
  } finally {
    await rmWithRetry(root);
  }
});

test("upgrade JSON reports a malformed skill lock as structured output", async () => {
  const root = await makeWorkspace();
  try {
    await fs.writeFile(path.join(root, "skills-lock.json"), "{ invalid", "utf8");

    const result = runCli(root, ["upgrade", root, "--dry-run", "--json"]);

    assert.equal(result.status, 1);
    const output = JSON.parse(result.stdout);
    assert.equal(output.status, "failed");
    assert.equal(output.stage, "skills-plan");
    assert.match(output.error, /Malformed skills-lock\.json/);
  } finally {
    await rmWithRetry(root);
  }
});

test("doctor reports tracked sources, missing canonical skills, and missing Claude links", async () => {
  const root = await makeWorkspace();
  try {
    await fs.mkdir(path.join(root, ".agents", "skills", "openpress"), { recursive: true });
    await fs.writeFile(
      path.join(root, ".agents", "skills", "openpress", "SKILL.md"),
      "# openpress\n",
      "utf8",
    );
    await writeLock(root, {
      openpress: {
        source: "quan0715/open-press",
        sourceType: "github",
        skillPath: "skills/openpress/SKILL.md",
        computedHash: "framework-hash",
      },
      "brand-tone": {
        source: "acme/writing-skills",
        sourceType: "github",
        skillPath: "skills/brand-tone/SKILL.md",
        computedHash: "brand-hash",
      },
    });

    const report = await diagnose(root, { noCache: true });

    assert.deepEqual(report.skillsInstalled, ["openpress"]);
    assert.deepEqual(report.skillsTracked, ["brand-tone", "openpress"]);
    assert.deepEqual(report.skillsLockSources, ["acme/writing-skills", "quan0715/open-press"]);
    assert.ok(report.skillsMissing.includes("brand-tone"));
    assert.ok(report.skillsLinkIssues.includes(
      "brand-tone: missing canonical .agents/skills directory",
    ));
    assert.ok(report.skillsLinkIssues.includes("openpress: missing .claude/skills link"));
    assert.equal(report.stale, true);
  } finally {
    await rmWithRetry(root);
  }
});

test("doctor ignores fresh caches written before skill lock and link diagnostics existed", async () => {
  const root = await makeWorkspace();
  try {
    await fs.mkdir(path.join(root, ".openpress", "cache"), { recursive: true });
    await fs.writeFile(
      path.join(root, ".openpress", "cache", "doctor.json"),
      `${JSON.stringify({
        coreVersion: null,
        coreLatest: null,
        coreUpdateAvailable: false,
        skillsInstalled: [],
        skillsLockSource: null,
        stale: false,
        cachedAt: new Date().toISOString(),
      }, null, 2)}\n`,
      "utf8",
    );
    await writeLock(root, {
      openpress: {
        source: "quan0715/open-press",
        sourceType: "github",
        skillPath: "skills/openpress/SKILL.md",
        computedHash: "framework-hash",
      },
    });

    const report = await diagnose(root);

    assert.deepEqual(report.skillsTracked, ["openpress"]);
    assert.ok(report.skillsMissing.includes("openpress"));
    assert.equal(report.stale, true);
  } finally {
    await rmWithRetry(root);
  }
});

test("doctor always refreshes local skill and link state while reusing a fresh core cache", async () => {
  const root = await makeWorkspace();
  try {
    await fs.mkdir(path.join(root, ".openpress", "cache"), { recursive: true });
    await fs.writeFile(
      path.join(root, ".openpress", "cache", "doctor.json"),
      `${JSON.stringify({
        coreVersion: null,
        coreLatest: null,
        coreUpdateAvailable: false,
        skillsInstalled: ["openpress"],
        skillsTracked: [],
        skillsLockVersion: null,
        skillsLockSources: [],
        skillsLockSource: null,
        skillsMissing: [],
        skillsLinkIssues: [],
        skillsLockIssue: null,
        stale: false,
        cachedAt: new Date().toISOString(),
      }, null, 2)}\n`,
      "utf8",
    );
    await writeLock(root, {
      openpress: {
        source: "quan0715/open-press",
        sourceType: "github",
        skillPath: "skills/openpress/SKILL.md",
        computedHash: "framework-hash",
      },
    });

    const report = await diagnose(root);

    assert.deepEqual(report.skillsTracked, ["openpress"]);
    assert.deepEqual(report.skillsMissing, ["openpress"]);
    assert.equal(report.stale, true);
  } finally {
    await rmWithRetry(root);
  }
});

test("doctor treats a workspace without the framework routing skill as stale", async () => {
  const root = await makeWorkspace();
  try {
    const report = await diagnose(root, { noCache: true });

    assert.deepEqual(report.skillsTracked, []);
    assert.deepEqual(report.skillsMissing, ["openpress"]);
    assert.equal(report.skillsLinkIssues.length, 1);
    assert.equal(report.stale, true);
  } finally {
    await rmWithRetry(root);
  }
});
