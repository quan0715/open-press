import { test } from "node:test";
import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const CLI_BIN = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const MONOREPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "../../../..");

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

function runCmd(cwd, cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, NO_COLOR: "1" },
      shell: process.platform === "win32",
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

async function makeWorkspace(dir) {
  await writeFile(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "test-ws", private: true, dependencies: { "@open-press/core": "*" } }, null, 2),
    "utf8",
  );
}

test("help: lists supported flags", async () => {
  const { code, stdout } = await runCli(["--help"]);
  assert.equal(code, 0);
  assert.match(stdout, /--type slides/);
  assert.doesNotMatch(stdout, /--type <pages\|slides>/);
  assert.doesNotMatch(stdout, /--no-git/);
  assert.doesNotMatch(stdout, /--no-install/);
  assert.doesNotMatch(stdout, /--no-skills/);
  assert.doesNotMatch(stdout, /--pack/);
});

test("help: exposes package-owned runtime commands", async () => {
  const { code, stdout } = await runCli(["--help"]);
  assert.equal(code, 0);
  for (const command of ["create", "dev", "render", "image", "pdf", "validate", "inspect", "skills"]) {
    assert.match(stdout, new RegExp(`\\b${command}\\b`), `help should list ${command}`);
  }
  assert.doesNotMatch(stdout, /\binit\b/, "init must not appear in help");
});

test("help: --force has been removed from the surface", async () => {
  const { stdout } = await runCli(["--help"]);
  assert.doesNotMatch(stdout, /--force/, "--force should no longer appear in CLI help");
});

test("create: requires --type", async () => {
  const dir = await tmp();
  try {
    await makeWorkspace(dir);
    const { code, stderr } = await runCli(["create", "my-slides"], { cwd: dir });
    assert.notEqual(code, 0);
    assert.match(stderr, /requires --type/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("create: rejects --type pages", async () => {
  const dir = await tmp();
  try {
    await makeWorkspace(dir);
    const { code, stderr } = await runCli(["create", "my-slides", "--type", "pages"], { cwd: dir });
    assert.notEqual(code, 0);
    assert.match(stderr, /not yet supported/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("create: fails outside a valid workspace", async () => {
  const dir = await tmp();
  try {
    const { code, stderr } = await runCli(["create", "my-slides", "--type", "slides"], { cwd: dir });
    assert.notEqual(code, 0);
    assert.match(stderr, /no package\.json found/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("create: requires @open-press/core dependency", async () => {
  const dir = await tmp();
  try {
    await writeFile(path.join(dir, "package.json"), JSON.stringify({ name: "not-openpress" }, null, 2), "utf8");
    const { code, stderr } = await runCli(["create", "my-slides", "--type", "slides"], { cwd: dir });
    assert.notEqual(code, 0);
    assert.match(stderr, /@open-press\/core/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("create: scaffolds slides press file tree", async () => {
  const dir = await tmp();
  try {
    await makeWorkspace(dir);
    const { code, stdout, stderr } = await runCli(
      ["create", "my-deck", "--type", "slides", "--title", "Test Deck"],
      { cwd: dir },
    );
    assert.equal(code, 0, stderr + stdout);

    assert.equal(existsSync(path.join(dir, "press", "my-deck", "press.tsx")), true);
    assert.equal(existsSync(path.join(dir, "press", "my-deck", "slide-style", "manifest.json")), true);
    assert.equal(existsSync(path.join(dir, "press", "my-deck", "slide-style", "templates", "blank", "slide.tsx")), true);
    assert.equal(existsSync(path.join(dir, "press", "my-deck", "slide-style", "templates", "title-image", "slide.tsx")), true);
    assert.equal(existsSync(path.join(dir, "press", "my-deck", "slide-style", "templates", "statement", "slide.tsx")), true);
    assert.equal(existsSync(path.join(dir, "press", "my-deck", "slide-style", "templates", "split-media", "slide.tsx")), true);
    assert.equal(existsSync(path.join(dir, "press", "my-deck", "slide-style", "templates", "card-grid", "slide.tsx")), true);
    assert.equal(existsSync(path.join(dir, "press", "my-deck", "slide-style", "theme", "default.css")), true);
    assert.equal(existsSync(path.join(dir, "press", "my-deck", "components", "DeckSlide.tsx")), false);
    assert.equal(existsSync(path.join(dir, "press", "my-deck", "layouts", "SlideProtocol.tsx")), false);
    assert.equal(existsSync(path.join(dir, "press", "my-deck", "slides", "intro", "slide.tsx")), true);
    assert.equal(existsSync(path.join(dir, "press", "my-deck", "theme", "default.css")), true);

    const source = await readFile(path.join(dir, "press", "my-deck", "press.tsx"), "utf8");
    assert.doesNotMatch(source, /import Slide0/);
    assert.match(source, /<Slide id="intro" \/>/);
    assert.match(source, /slug="my-deck"/);
    assert.match(source, /title="Test Deck"/);

    const slideSource = await readFile(path.join(dir, "press", "my-deck", "slides", "intro", "slide.tsx"), "utf8");
    assert.match(slideSource, /satisfies SlideMeta/);
    assert.doesNotMatch(slideSource, /SlideProtocol/);
    assert.match(slideSource, /from "@open-press\/core"/);
    assert.match(slideSource, /<Slide\s+id="intro"/);
    assert.doesNotMatch(slideSource, /<Slide\b(?:(?!>)[\s\S])*layout=\{\{/);
    assert.match(slideSource, /<Frame\s+frameKey="canvas"/);

    const manifest = JSON.parse(await readFile(path.join(dir, "press", "my-deck", "slide-style", "manifest.json"), "utf8"));
    for (const templateName of Object.keys(manifest.templates)) {
      const templateSource = await readFile(
        path.join(dir, "press", "my-deck", "slide-style", manifest.templates[templateName].source),
        "utf8",
      );
      assert.doesNotMatch(templateSource, /<Slide\b(?:(?!>)[\s\S])*layout=\{\{/);
      assert.match(templateSource, /<Frame\s+frameKey="canvas"/);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("create: generated slides press builds", { timeout: 180_000 }, async () => {
  const dir = await tmp();
  try {
    await writeFile(
      path.join(dir, "package.json"),
      JSON.stringify({
        name: "test-ws",
        private: true,
        type: "module",
        scripts: {
          build: "open-press render . --renderer react",
        },
        dependencies: {
          "@open-press/core": `file:${path.join(MONOREPO_ROOT, "packages/core")}`,
        },
        devDependencies: {
          "@open-press/cli": `file:${path.join(MONOREPO_ROOT, "packages/cli")}`,
          "@types/node": "^25.8.0",
          "@types/react": "^19.2.14",
          "@types/react-dom": "^19.2.3",
          typescript: "^6.0.3",
        },
      }, null, 2),
      "utf8",
    );

    const create = await runCli(["create", "my-deck", "--type", "slides", "--title", "Test Deck"], { cwd: dir });
    assert.equal(create.code, 0, create.stderr + create.stdout);

    const install = await runCmd(dir, "npm", ["install"]);
    assert.equal(install.code, 0, `npm install failed:\n${install.stderr}\n${install.stdout}`);

    const build = await runCmd(dir, "npm", ["run", "build"]);
    assert.equal(build.code, 0, `npm run build failed:\n${build.stderr}\n${build.stdout}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("create: rejects duplicate press name", async () => {
  const dir = await tmp();
  try {
    await makeWorkspace(dir);
    await runCli(["create", "my-deck", "--type", "slides"], { cwd: dir });
    const { code, stderr } = await runCli(["create", "my-deck", "--type", "slides"], { cwd: dir });
    assert.notEqual(code, 0);
    assert.match(stderr, /already exists/);
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
    await mkdir(path.join(dir, "press", "report"), { recursive: true });
    await writeFile(
      path.join(dir, "press", "report", "press.tsx"),
      `import { Press, Frame } from "@open-press/core";

export default function Fixture() {
  return (
    <Press slug="report" title="Runtime Fixture" type="pages">
      <Frame frameKey="cover">Hello</Frame>
    </Press>
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
