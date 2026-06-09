import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { extractSlideMetaFromSource } from "../engine/react/slides-folder-meta.mjs";
import { rmWithRetry } from "./_temp.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "engine", "cli.mjs");

async function withTempWorkspace(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-slide-command-"));
  try {
    return await fn(dir);
  } finally {
    await rmWithRetry(dir);
  }
}

describe("slide metadata extraction", () => {
  it("extracts literal SlideMeta without executing source", () => {
    const source = `import "./style.css";
export const meta = {
  layout: "title-slide",
  description: "Cover slide",
  keypoints: ["A", "B"],
  visuals: ["hero.png"],
} satisfies SlideMeta;
export default function Slide() { return null }
`;
    assert.deepEqual(extractSlideMetaFromSource(source, "slide.tsx"), {
      layout: "title-slide",
      description: "Cover slide",
      keypoints: ["A", "B"],
      visuals: ["hero.png"],
    });
  });

  it("rejects computed metadata", () => {
    assert.throws(
      () => extractSlideMetaFromSource("export const meta = buildMeta()", "slide.tsx"),
      /literal object expression/,
    );
    assert.throws(
      () => extractSlideMetaFromSource("export const meta = { ...baseMeta }", "slide.tsx"),
      /spread/i,
    );
    assert.throws(
      () => extractSlideMetaFromSource('export { meta } from "./meta"', "slide.tsx"),
      /re-exported meta/,
    );
  });
});

async function writeSlidesWorkspace(workspace, presses = ["deck"]) {
  await fs.writeFile(
    path.join(workspace, "package.json"),
    JSON.stringify({ name: "fixture", private: true, openpress: {} }, null, 2),
    "utf8",
  );
  for (const slug of presses) {
    await fs.mkdir(path.join(workspace, "press", slug, "slides", "cover"), { recursive: true });
    await fs.writeFile(
      path.join(workspace, "press", slug, "press.tsx"),
      `import { Press, Slide } from "@open-press/core";
export default function Deck() { return <Press slug="${slug}" type="slides" title="${slug}"><Slide id="cover" /></Press> }
`,
      "utf8",
    );
    await fs.writeFile(
      path.join(workspace, "press", slug, "slides", "cover", "slide.tsx"),
      `export const meta = { layout: "title-slide", description: "Cover" } satisfies SlideMeta;
export default function Cover() { return null }
`,
      "utf8",
    );
  }
}

describe("open-press slide status", () => {
  it("prints active slides and metadata", async () => {
    await withTempWorkspace(async (workspace) => {
      await writeSlidesWorkspace(workspace);
      const result = spawnSync("node", [CLI, "slide", workspace, "status"], { cwd: ROOT, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr + result.stdout);
      assert.match(result.stdout, /Slide press: deck/);
      assert.match(result.stdout, /Slides: 1 total, 1 active, 0 skipped/);
      assert.match(result.stdout, /cover/);
      assert.match(result.stdout, /title-slide/);
      assert.match(result.stdout, /Cover/);
      assert.match(result.stdout, /Keypoints: —/);
    });
  });

  it("supports cwd-local slide status without an explicit path", async () => {
    await withTempWorkspace(async (workspace) => {
      await writeSlidesWorkspace(workspace);
      const result = spawnSync("node", [CLI, "slide", "status"], { cwd: workspace, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr + result.stdout);
      assert.match(result.stdout, /Slide press: deck/);
    });
  });

  it("requires --press when multiple slides presses exist", async () => {
    await withTempWorkspace(async (workspace) => {
      await writeSlidesWorkspace(workspace, ["deck-a", "deck-b"]);
      const result = spawnSync("node", [CLI, "slide", workspace, "status"], { cwd: ROOT, encoding: "utf8" });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr + result.stdout, /multiple presses found/);
      assert.match(result.stderr + result.stdout, /deck-a/);
      assert.match(result.stderr + result.stdout, /deck-b/);
    });
  });
});

describe("open-press slide mutations", () => {
  it("adds a slide folder and appends the index marker", async () => {
    await withTempWorkspace(async (workspace) => {
      await writeSlidesWorkspace(workspace);
      const result = spawnSync("node", [CLI, "slide", workspace, "add", "pricing"], { cwd: ROOT, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr + result.stdout);
      const press = await fs.readFile(path.join(workspace, "press", "deck", "press.tsx"), "utf8");
      const slide = await fs.readFile(path.join(workspace, "press", "deck", "slides", "pricing", "slide.tsx"), "utf8");
      assert.match(press, /<Slide id="pricing" \/>/);
      assert.match(slide, /layout: "blank"/);
      assert.match(slide, /New slide placeholder for pricing/);
      assert.match(slide, /"Run validate"/);
      assert.match(slide, /export default function PricingSlide/);
    });
  });

  it("skips and unskips a slide", async () => {
    await withTempWorkspace(async (workspace) => {
      await writeSlidesWorkspace(workspace);
      assert.equal(spawnSync("node", [CLI, "slide", workspace, "skip", "cover"], { cwd: ROOT, encoding: "utf8" }).status, 0);
      assert.match(await fs.readFile(path.join(workspace, "press", "deck", "press.tsx"), "utf8"), /<Slide id="cover" skip \/>/);
      assert.equal(spawnSync("node", [CLI, "slide", workspace, "unskip", "cover"], { cwd: ROOT, encoding: "utf8" }).status, 0);
      assert.match(await fs.readFile(path.join(workspace, "press", "deck", "press.tsx"), "utf8"), /<Slide id="cover" \/>/);
    });
  });

  it("renames folder and press marker atomically", async () => {
    await withTempWorkspace(async (workspace) => {
      await writeSlidesWorkspace(workspace);
      const result = spawnSync("node", [CLI, "slide", workspace, "rename", "cover", "intro"], { cwd: ROOT, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr + result.stdout);
      assert.match(await fs.readFile(path.join(workspace, "press", "deck", "press.tsx"), "utf8"), /id="intro"/);
      assert.equal(await exists(path.join(workspace, "press", "deck", "slides", "intro", "slide.tsx")), true);
      assert.equal(await exists(path.join(workspace, "press", "deck", "slides", "cover", "slide.tsx")), false);
    });
  });

  it("reorders by --after and by full --order", async () => {
    await withTempWorkspace(async (workspace) => {
      await writeSlidesWorkspace(workspace);
      assert.equal(spawnSync("node", [CLI, "slide", workspace, "add", "agenda"], { cwd: ROOT, encoding: "utf8" }).status, 0);
      assert.equal(spawnSync("node", [CLI, "slide", workspace, "add", "closing"], { cwd: ROOT, encoding: "utf8" }).status, 0);
      assert.equal(spawnSync("node", [CLI, "slide", workspace, "reorder", "closing", "--after", "cover"], { cwd: ROOT, encoding: "utf8" }).status, 0);
      let press = await fs.readFile(path.join(workspace, "press", "deck", "press.tsx"), "utf8");
      assert.ok(press.indexOf('id="cover"') < press.indexOf('id="closing"'));
      assert.ok(press.indexOf('id="closing"') < press.indexOf('id="agenda"'));

      assert.equal(spawnSync("node", [CLI, "slide", workspace, "reorder", "--order", "agenda", "cover", "closing"], { cwd: ROOT, encoding: "utf8" }).status, 0);
      press = await fs.readFile(path.join(workspace, "press", "deck", "press.tsx"), "utf8");
      assert.ok(press.indexOf('id="agenda"') < press.indexOf('id="cover"'));
      assert.ok(press.indexOf('id="cover"') < press.indexOf('id="closing"'));
    });
  });
});

async function exists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}
