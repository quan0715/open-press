import { test } from "node:test";
import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BIN = fileURLToPath(new URL("../dist/index.js", import.meta.url));
const MONOREPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "../../../..");

function runCreate(args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [BIN, ...args], {
      cwd: options.cwd ?? process.cwd(),
      env: { ...process.env, NO_COLOR: "1", ...(options.env ?? {}) },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => (stdout += c.toString()));
    child.stderr.on("data", (c) => (stderr += c.toString()));
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
    child.stdout.on("data", (c) => (stdout += c.toString()));
    child.stderr.on("data", (c) => (stderr += c.toString()));
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function tmp() {
  return mkdtemp(path.join(tmpdir(), "openpress-create-test-"));
}

async function makeFakeNpx(root) {
  const bin = path.join(root, "test-bin");
  const executable = path.join(bin, "npx");
  await mkdir(bin, { recursive: true });
  await writeFile(
    executable,
    `#!/usr/bin/env node
import fs from "node:fs";
fs.appendFileSync(
  process.env.OPENPRESS_TEST_COMMAND_LOG,
  JSON.stringify(process.argv.slice(2)) + "\\n",
);
`,
    "utf8",
  );
  await chmod(executable, 0o755);
  return bin;
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
    assert.equal(existsSync(path.join(target, "openpress", "settings.json")), true);
    assert.equal(existsSync(path.join(target, ".gitignore")), true);
    assert.equal(existsSync(path.join(target, "press", "design.md")), true);
    assert.equal(existsSync(path.join(target, "press", "my-deck", "press.tsx")), true);
    assert.equal(existsSync(path.join(target, "press", "my-deck", "slide-style", "manifest.json")), true);
    assert.equal(existsSync(path.join(target, "press", "my-deck", "slide-style", "templates", "blank", "slide.tsx")), true);
    assert.equal(existsSync(path.join(target, "press", "my-deck", "slide-style", "templates", "title-image", "slide.tsx")), true);
    assert.equal(existsSync(path.join(target, "press", "my-deck", "slide-style", "templates", "statement", "slide.tsx")), true);
    assert.equal(existsSync(path.join(target, "press", "my-deck", "slide-style", "templates", "split-media", "slide.tsx")), true);
    assert.equal(existsSync(path.join(target, "press", "my-deck", "slide-style", "templates", "card-grid", "slide.tsx")), true);
    assert.equal(existsSync(path.join(target, "press", "my-deck", "slide-style", "theme", "default.css")), true);
    assert.equal(existsSync(path.join(target, "press", "my-deck", "slides", "intro", "slide.tsx")), true);
    assert.equal(existsSync(path.join(target, "press", "my-deck", "theme", "default.css")), true);
    assert.equal(existsSync(path.join(target, "press", "my-deck", "layouts", "SlideProtocol.tsx")), false);
    assert.equal(existsSync(path.join(target, "press", "my-deck", "components", "DeckSlide.tsx")), false);
    assert.equal(existsSync(path.join(target, "press", "my-deck", "themes")), false);
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
    assert.equal(pkg.scripts["openpress:word"], "open-press word .");
    assert.equal(pkg.scripts.dev, "open-press dev . --renderer react");
    assert.ok(pkg.dependencies["@open-press/core"]);
    assert.ok(pkg.devDependencies["@open-press/cli"]);
    assert.equal("openpress" in pkg, false);
    const settings = JSON.parse(await readFile(path.join(target, "openpress", "settings.json"), "utf8"));
    assert.equal(settings.version, 1);
    assert.equal(settings.appearance.colorMode, "dark");
    assert.equal(settings.appearance.accent, "amber");
    assert.equal(settings.pdf.filename, "document.pdf");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("scaffolding installs skills non-interactively with canonical and Claude targets", async () => {
  const dir = await tmp();
  const target = path.join(dir, "my-deck");
  try {
    const bin = await makeFakeNpx(dir);
    const logPath = path.join(dir, "commands.jsonl");
    const { code, stdout, stderr } = await runCreate(
      [target, "--type", "slides", "--title", "My Deck", "--no-install", "--no-git"],
      {
        env: {
          PATH: `${bin}${path.delimiter}${process.env.PATH}`,
          OPENPRESS_TEST_COMMAND_LOG: logPath,
        },
      },
    );

    assert.equal(code, 0, stderr + stdout);
    const calls = (await readFile(logPath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.deepEqual(calls, [[
      "--yes",
      "skills@1.5.18",
      "add",
      "quan0715/open-press",
      "--skill",
      "openpress",
      "openpress-apply-comments",
      "openpress-collaborate",
      "openpress-create-pages",
      "openpress-create-slide",
      "openpress-deploy",
      "openpress-upgrade",
      "--agent",
      "universal",
      "claude-code",
      "--yes",
    ]]);
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
    assert.doesNotMatch(source, /SlideProtocol/);
    assert.match(source, /from "@open-press\/core"/);
    assert.match(source, /<Slide\s+id="intro"/);
    assert.doesNotMatch(source, /<Slide\b(?:(?!>)[\s\S])*layout=\{\{/);
    assert.match(source, /<Frame\s+frameKey="canvas"/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("scaffolds slides workspace: slide-style manifest registers default templates", async () => {
  const dir = await tmp();
  const target = path.join(dir, "my-deck");
  try {
    await runCreate([target, "--type", "slides", "--title", "My Deck", "--no-install", "--no-git", "--no-skills"]);
    const manifest = JSON.parse(await readFile(path.join(target, "press", "my-deck", "slide-style", "manifest.json"), "utf8"));
    assert.equal(manifest.defaultTemplate, "blank");
    assert.deepEqual(Object.keys(manifest.templates).sort(), ["blank", "card-grid", "split-media", "statement", "title-image"]);
    assert.equal(manifest.theme.source, "theme/default.css");
    assert.equal(manifest.theme.target, "theme/default.css");

    for (const templateName of Object.keys(manifest.templates)) {
      const templateSource = await readFile(
        path.join(target, "press", "my-deck", "slide-style", manifest.templates[templateName].source),
        "utf8",
      );
      assert.doesNotMatch(templateSource, /<Slide\b(?:(?!>)[\s\S])*layout=\{\{/);
      assert.match(templateSource, /<Frame\s+frameKey="canvas"/);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("scaffolds slides workspace: build succeeds", { timeout: 180_000 }, async (t) => {
  const cliDist = path.join(MONOREPO_ROOT, "packages/cli/dist/cli.js");
  if (!existsSync(cliDist)) {
    t.skip("packages/cli not built — run pnpm --filter @open-press/cli build first");
    return;
  }
  const dir = await tmp();
  const target = path.join(dir, "my-deck");
  try {
    await runCreate([target, "--type", "slides", "--title", "My Deck", "--no-install", "--no-git", "--no-skills"]);

    // Point to local monorepo packages so the test never hits the registry
    const pkgPath = path.join(target, "package.json");
    const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
    pkg.dependencies["@open-press/core"] = `file:${path.join(MONOREPO_ROOT, "packages/core")}`;
    pkg.devDependencies["@open-press/cli"] = `file:${path.join(MONOREPO_ROOT, "packages/cli")}`;
    await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

    const install = await runCmd(target, "npm", ["install"]);
    assert.equal(install.code, 0, `npm install failed:\n${install.stderr}\n${install.stdout}`);

    const build = await runCmd(target, "npm", ["run", "build"]);
    assert.equal(build.code, 0, `npm run build failed:\n${build.stderr}\n${build.stdout}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
