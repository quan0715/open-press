import { test } from "node:test";
import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BIN = fileURLToPath(new URL("../dist/index.js", import.meta.url));

function runCreate(args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [BIN, ...args], {
      cwd: options.cwd ?? process.cwd(),
      env: { ...process.env, NO_COLOR: "1" },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => (stdout += c.toString()));
    child.stderr.on("data", (c) => (stderr += c.toString()));
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function tmp() {
  return mkdtemp(path.join(tmpdir(), "openpress-create-test-"));
}

test("help: shows --type slides flag", async () => {
  const { code, stdout } = await runCreate(["--help"]);
  assert.equal(code, 0);
  assert.match(stdout, /--type slides/);
  assert.match(stdout, /--no-install/);
  assert.match(stdout, /--no-skills/);
  assert.match(stdout, /--no-git/);
});

test("--type pages exits with error", async () => {
  const dir = await tmp();
  const target = path.join(dir, "report");
  try {
    const { code, stderr } = await runCreate([target, "--type", "pages", "--no-install", "--no-git", "--no-skills"]);
    assert.notEqual(code, 0);
    assert.match(stderr, /not yet supported/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("refuses non-empty target", async () => {
  const dir = await tmp();
  const target = path.join(dir, "workspace");
  try {
    await import("node:fs/promises").then((fs) =>
      fs.mkdir(target).then(() => fs.writeFile(path.join(target, "README.md"), "# existing")),
    );
    const { code, stderr } = await runCreate([target, "--type", "slides", "--no-install", "--no-git", "--no-skills"]);
    assert.notEqual(code, 0);
    assert.match(stderr, /not empty/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("scaffolds slides workspace: file tree", async () => {
  const dir = await tmp();
  const target = path.join(dir, "my-deck");
  try {
    const { code, stdout, stderr } = await runCreate([
      target,
      "--type",
      "slides",
      "--title",
      "My Deck",
      "--no-install",
      "--no-git",
      "--no-skills",
    ]);
    assert.equal(code, 0, stderr + stdout);

    assert.equal(existsSync(path.join(target, "package.json")), true);
    assert.equal(existsSync(path.join(target, ".gitignore")), true);
    assert.equal(existsSync(path.join(target, "press", "design.md")), true);
    assert.equal(existsSync(path.join(target, "press", "my-deck", "press.tsx")), true);
    assert.equal(existsSync(path.join(target, "press", "my-deck", "slides", "intro", "slide.tsx")), true);
    assert.equal(existsSync(path.join(target, "press", "my-deck", "themes", "default.css")), true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("scaffolds slides workspace: press.tsx content", async () => {
  const dir = await tmp();
  const target = path.join(dir, "my-deck");
  try {
    await runCreate([target, "--type", "slides", "--title", "My Deck", "--no-install", "--no-git", "--no-skills"]);
    const source = await readFile(path.join(target, "press", "my-deck", "press.tsx"), "utf8");

    assert.doesNotMatch(source, /import Slide0/);
    assert.match(source, /<Press/);
    assert.match(source, /slug="my-deck"/);
    assert.match(source, /title="My Deck"/);
    assert.match(source, /type="slides"/);
    assert.match(source, /page="slide-16-9"/);
    assert.match(source, /<Slide id="intro" \/>/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("scaffolds slides workspace: package.json uses skills:sync script", async () => {
  const dir = await tmp();
  const target = path.join(dir, "my-deck");
  try {
    await runCreate([target, "--type", "slides", "--title", "My Deck", "--no-install", "--no-git", "--no-skills"]);
    const pkg = JSON.parse(await readFile(path.join(target, "package.json"), "utf8"));
    assert.equal(pkg.scripts["openpress:skills"], "open-press skills:sync");
    assert.equal(pkg.scripts.dev, "open-press dev . --renderer react");
    assert.ok(pkg.dependencies["@open-press/core"]);
    assert.ok(pkg.devDependencies["@open-press/cli"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("scaffolds slides workspace: design document describes marker-only slide order", async () => {
  const dir = await tmp();
  const target = path.join(dir, "my-deck");
  try {
    await runCreate([target, "--type", "slides", "--title", "My Deck", "--no-install", "--no-git", "--no-skills"]);
    const source = await readFile(path.join(target, "press", "design.md"), "utf8");
    assert.match(source, /source-based slide authoring/);
    assert.match(source, /self-closing `<Slide id \/>` markers/);
    assert.match(source, /press\/my-deck\/slides\/<id>\/slide\.tsx/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("scaffolds slides workspace: slide.tsx uses satisfies SlideMeta", async () => {
  const dir = await tmp();
  const target = path.join(dir, "my-deck");
  try {
    await runCreate([target, "--type", "slides", "--title", "My Deck", "--no-install", "--no-git", "--no-skills"]);
    const source = await readFile(path.join(target, "press", "my-deck", "slides", "intro", "slide.tsx"), "utf8");
    assert.match(source, /satisfies SlideMeta/);
    assert.match(source, /export const meta/);
    assert.match(source, /export default function Slide/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
