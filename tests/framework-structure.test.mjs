import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "engine", "cli.mjs");

const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const isFile = (rel) => fs.existsSync(path.join(ROOT, rel)) && fs.statSync(path.join(ROOT, rel)).isFile();
const isDir = (rel) => fs.existsSync(path.join(ROOT, rel)) && fs.statSync(path.join(ROOT, rel)).isDirectory();

test("CI surface includes typecheck, qdoc:validate, qdoc:render and points at node --test", () => {
  const pkg = JSON.parse(readText("package.json"));
  const scripts = pkg.scripts;
  assert.ok(scripts["test"], "test script must exist");
  assert.ok(scripts["test"].includes("node --test"), "test script must drive `node --test`");
  assert.ok(scripts["test:ci"]);
  assert.ok(scripts["test:ci"].includes("typecheck"));
  assert.ok(scripts["test:ci"].includes("qdoc:validate"));
  assert.ok(scripts["test:ci"].includes("qdoc:render"));
});

test("React workbench imports content / media / components via @workspace aliases", () => {
  const workspace = readText("src/qdoc/projectWorkspace.tsx");
  const indexes = readText("src/qdoc/indexes.ts");
  assert.ok(workspace.includes("@workspace/content/*.md"), "content glob must use @workspace alias");
  assert.ok(workspace.includes("@workspace/components/**/data*.json"), "data glob must use @workspace alias");
  assert.ok(indexes.includes("@workspace/media/*"), "media glob must use @workspace alias");
});

test("runtime CSS loads font faces before theme tokens set font variables", () => {
  const css = readText("src/styles/qdoc.css");
  const fontsImport = css.indexOf('@import url("/qdoc/fonts.css");');
  const tokensImport = css.indexOf('@import url("/qdoc/tokens.css");');
  assert.ok(fontsImport >= 0, "qdoc.css must import generated fonts.css");
  assert.ok(tokensImport >= 0, "qdoc.css must import generated tokens.css");
  assert.ok(fontsImport < tokensImport, "fonts.css must load before tokens.css so theme font tokens can override defaults");
});

test("vite.config.ts wires @workspace aliases and __QDOC_*_PATH__ defines from qdoc.config.mjs", () => {
  const viteConfig = readText("vite.config.ts");
  for (const alias of ['"@workspace/content"', '"@workspace/media"', '"@workspace/components"', '"@workspace/design-system"']) {
    assert.ok(viteConfig.includes(alias), `${alias} alias must be wired in vite.config.ts`);
  }
  for (const define of ["__QDOC_CONTENT_PATH__", "__QDOC_MEDIA_PATH__", "__QDOC_COMPONENTS_PATH__", "__QDOC_DESIGN_SYSTEM_PATH__"]) {
    assert.ok(viteConfig.includes(define), `${define} define must be exposed`);
  }
});

test("React design-system fallback reads workspace path from build-time defines", () => {
  const qdocApp = readText("src/qdoc/QDocApp.tsx");
  const renderer = readText("src/qdoc/renderer.tsx");
  const combined = `${qdocApp}\n${renderer}`;
  assert.ok(combined.includes("sourceDir: __QDOC_DESIGN_SYSTEM_PATH__"));
  assert.ok(!combined.includes('sourceDir: "design-system"'));
  assert.ok(!combined.includes('sourceDir: "document/design-system"'));
});

test("editorial-monograph is a complete style pack skill", () => {
  // Style-pack detection is structural, not metadata-driven: a skill is a
  // style pack iff it has a `starter/` subdirectory. Engine/init.mjs
  // discovers packs this way (listStylePackSkills), so the test mirrors
  // that contract instead of pinning frontmatter keys.
  const skillBase = "skills/editorial-monograph";
  assert.ok(isFile(`${skillBase}/SKILL.md`), "SKILL.md must exist");
  assert.ok(isDir(`${skillBase}/starter`), "starter/ must exist");
  assert.ok(isFile(`${skillBase}/starter/theme/fonts.css`), "starter must include a theme font stylesheet for browser-stable typography");
  assert.ok(!isDir(`${skillBase}/starter/.qdoc`), "style pack styling belongs in theme/, not .qdoc/");
  const fontCss = readText(`${skillBase}/starter/theme/fonts.css`);
  assert.match(fontCss, /Noto(\+|%20| )Serif(\+|%20| )TC/, "editorial-monograph must load its serif webfont");
  assert.match(fontCss, /IBM(\+|%20| )Plex(\+|%20| )Sans/, "editorial-monograph must load its body webfont");
  for (const sub of ["content", "design-system", "theme"]) {
    assert.ok(isDir(`${skillBase}/starter/${sub}`), `starter/${sub}/ must exist`);
  }
  assert.ok(
    isFile(`${skillBase}/starter/qdoc.config.mjs`),
    "starter/qdoc.config.mjs must exist so init produces a workspace marker",
  );
});

test("style pack contributor skill documents portable font contracts", () => {
  const skill = readText("skills/qdoc-style-pack-contributor/SKILL.md");
  assert.match(skill, /theme\/fonts\.css/);
  assert.doesNotMatch(skill, /\.qdoc\/fonts/);
  assert.match(skill, /theme\/tokens\.css/);
  assert.match(skill, /--qd-font/);
  assert.match(skill, /local\(\.\.\.\)/);
});

test("qdoc init produces a workspace that passes qdoc validate", async () => {
  // The real contract for a style pack starter is "init from it, then
  // validate passes". This is the functional truth — far more durable
  // than listing every file by name.
  const target = await fsp.mkdtemp(path.join(os.tmpdir(), "qdoc-init-smoke-"));
  try {
    await fsp.rmdir(target); // init expects target to not exist or be empty
    const init = spawnSync("node", [CLI, "init", target], { cwd: ROOT, encoding: "utf8" });
    assert.equal(init.status, 0, init.stderr + init.stdout);

    const validate = spawnSync("node", [CLI, "validate", target], { cwd: ROOT, encoding: "utf8" });
    assert.equal(validate.status, 0, validate.stderr + validate.stdout);
    assert.match(validate.stdout, /QDoc validation OK/);
  } finally {
    await fsp.rm(target, { recursive: true, force: true });
  }
});
