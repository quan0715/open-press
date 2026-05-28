import { test } from "node:test";
import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const CLI_BIN = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

function runCli(args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI_BIN, ...args], {
      cwd: options.cwd ?? process.cwd(),
      env: { ...process.env, NO_COLOR: "1" },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function tmp() {
  return mkdtemp(path.join(tmpdir(), "openpress-cli-test-"));
}

test("help: lists supported flags", async () => {
  const { code, stdout } = await runCli(["--help"]);
  assert.equal(code, 0);
  assert.match(stdout, /--no-git/);
  assert.match(stdout, /--no-install/);
  assert.match(stdout, /--pack/);
});

test("help: --force has been removed from the surface", async () => {
  const { stdout } = await runCli(["--help"]);
  assert.doesNotMatch(stdout, /--force/, "--force should no longer appear in CLI help");
});

test("init: --force is rejected as unknown flag", async () => {
  const dir = await tmp();
  try {
    const { code, stderr } = await runCli(["init", dir, "--force"], { cwd: dir });
    assert.notEqual(code, 0);
    assert.match(stderr, /Unknown flag: --force/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("init: refuses to scaffold into a non-empty target", async () => {
  const dir = await tmp();
  try {
    await writeFile(path.join(dir, "README.md"), "# existing");
    const { code, stderr } = await runCli(["init", dir, "--no-install", "--no-git"]);
    assert.notEqual(code, 0);
    assert.match(stderr, /not empty/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("init: target with only harmless dotfiles is treated as empty", async () => {
  // Don't actually run init to completion — that hits the network and npm.
  // We only need to confirm the empty-check passes; init will then fail later
  // for an unrelated reason (or succeed in a hermetic env). The fail mode we
  // are guarding against is the "Target is not empty" error.
  const dir = await tmp();
  try {
    await mkdir(path.join(dir, ".git"));
    await writeFile(path.join(dir, ".gitignore"), "node_modules\n");
    const { stderr } = await runCli(["init", dir, "--no-install", "--no-git"]);
    assert.doesNotMatch(stderr, /not empty/, "harmless dotfiles should not block init");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
