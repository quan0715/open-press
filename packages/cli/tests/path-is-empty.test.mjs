import { test } from "node:test";
import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const CLI_BIN = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const CLI_PACKAGE = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

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
  assert.match(stdout, /--no-skills/);
  assert.doesNotMatch(stdout, /--pack/);
});

test("help: exposes package-owned runtime commands", async () => {
  const { code, stdout } = await runCli(["--help"]);
  assert.equal(code, 0);
  for (const command of ["init", "dev", "render", "image", "pdf", "validate", "inspect", "skills"]) {
    assert.match(stdout, new RegExp(`\\b${command}\\b`), `help should list ${command}`);
  }
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

test("init: --pack is rejected as unknown flag", async () => {
  const dir = await tmp();
  try {
    await writeFile(path.join(dir, "README.md"), "# existing");
    const { code, stderr } = await runCli(["init", dir, "--pack", "editorial-monograph", "--no-install", "--no-git"]);
    assert.notEqual(code, 0);
    assert.match(stderr, /Unknown flag: --pack/);
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
    const { stderr } = await runCli(["init", dir, "--no-install", "--no-git", "--no-skills"]);
    assert.doesNotMatch(stderr, /not empty/, "harmless dotfiles should not block init");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("init: scaffolds a package-based workspace without vendoring framework runtime", async () => {
  const dir = await tmp();
  try {
    const { code, stdout, stderr } = await runCli(["init", dir, "--no-install", "--no-git", "--no-skills"]);
    assert.equal(code, 0, stderr + stdout);

    assert.equal(existsSync(path.join(dir, "engine")), false, "engine must come from @open-press/core package");
    assert.equal(existsSync(path.join(dir, "src", "openpress")), false, "OpenPress app runtime must not be vendored");
    assert.equal(existsSync(path.join(dir, "vite.config.ts")), false, "Vite config must come from @open-press/core package");

    const pkg = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8"));
    assert.equal(pkg.dependencies["@open-press/core"], CLI_PACKAGE.version);
    assert.equal(pkg.devDependencies["@open-press/cli"], CLI_PACKAGE.version);
    assert.equal(pkg.scripts.dev, "open-press dev . --renderer react");
    assert.equal(pkg.scripts.build, "open-press render . --renderer react");
    assert.equal(pkg.scripts["openpress:image"], "open-press image .");
    assert.equal(pkg.scripts["openpress:pdf"], "open-press pdf .");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("runtime commands are delegated to @open-press/core", async () => {
  const dir = await tmp();
  try {
    await writeFile(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "runtime-fixture", private: true }, null, 2),
      "utf8",
    );
    await mkdir(path.join(dir, "press"), { recursive: true });
    await writeFile(
      path.join(dir, "press", "index.tsx"),
      `import { Workspace, Press, Frame } from "@open-press/core";

export default function Fixture() {
  return (
    <Workspace>
      <Press title="Runtime Fixture">
        <Frame frameKey="cover">Hello</Frame>
      </Press>
    </Workspace>
  );
}
`,
      "utf8",
    );

    const { code, stdout, stderr } = await runCli(["dev", dir, "--renderer", "react", "--dry-run"]);
    assert.equal(code, 0, stderr + stdout);
    assert.match(stdout, /OpenPress dev URL:/);
    assert.match(stdout, /vite(?:\.js)? --force/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
