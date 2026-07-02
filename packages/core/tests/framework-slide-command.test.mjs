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

async function writeSlideStyle(workspace, slug = "deck") {
  const styleRoot = path.join(workspace, "press", slug, "slide-style");
  await fs.mkdir(path.join(styleRoot, "templates", "statement"), { recursive: true });
  await fs.mkdir(path.join(workspace, "press", slug, "theme"), { recursive: true });
  await fs.writeFile(
    path.join(styleRoot, "manifest.json"),
    JSON.stringify({
      id: "test-style",
      version: "1.0.0",
      defaultTemplate: "statement",
      templates: {
        statement: {
          source: "templates/statement/slide.tsx",
          description: "Statement test slide",
        },
      },
      theme: {
        source: "theme/default.css",
        target: "theme/default.css",
      },
    }, null, 2),
    "utf8",
  );
  await fs.writeFile(
    path.join(styleRoot, "templates", "statement", "slide.tsx"),
    `import { Frame, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "statement",
  description: "Copied statement template for __SLIDE_ID__",
} satisfies SlideMeta;

export const notes = "Template notes for __SLIDE_ID__.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide
      id="__SLIDE_ID__"
      className="op-slide-page bg-bg text-text"
      layout={{ mode: "stack", padding: 96, width: "fill", height: "fill" }}
    >
      <Frame frameKey="copy" className="m-auto">
        <Text as="h1" className="op-display">__SLIDE_ID__ copied from template</Text>
      </Frame>
    </Slide>
  );
}
`,
    "utf8",
  );
  await fs.writeFile(path.join(styleRoot, "theme", "default.css"), "/* portable source */\n", "utf8").catch(async (error) => {
    if (error?.code !== "ENOENT") throw error;
    await fs.mkdir(path.join(styleRoot, "theme"), { recursive: true });
    await fs.writeFile(path.join(styleRoot, "theme", "default.css"), "/* portable source */\n", "utf8");
  });
  await fs.writeFile(path.join(workspace, "press", slug, "theme", "default.css"), "/* active theme */\n", "utf8");
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
      assert.match(result.stdout, /\| # +\| State +\| ID +\| Layout +\| Meta +\|/);
      assert.match(result.stdout, /\|-+\|-+\|-+\|-+\|-+\|/);
      assert.match(result.stdout, /\| 1 +\| active +\| cover +\| title-slide +\| Cover/);
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
  it("adds a slide from the registered default template without mutating active theme", async () => {
    await withTempWorkspace(async (workspace) => {
      await writeSlidesWorkspace(workspace);
      await writeSlideStyle(workspace);
      const themePath = path.join(workspace, "press", "deck", "theme", "default.css");
      const beforeTheme = await fs.readFile(themePath, "utf8");

      const result = spawnSync("node", [CLI, "slide", workspace, "add", "launch"], { cwd: ROOT, encoding: "utf8" });

      assert.equal(result.status, 0, result.stderr + result.stdout);
      const press = await fs.readFile(path.join(workspace, "press", "deck", "press.tsx"), "utf8");
      const slide = await fs.readFile(path.join(workspace, "press", "deck", "slides", "launch", "slide.tsx"), "utf8");
      assert.match(press, /<Slide id="launch" \/>/);
      assert.match(slide, /layout: "statement"/);
      assert.match(slide, /Copied statement template for launch/);
      assert.match(slide, /export default function LaunchSlide/);
      assert.doesNotMatch(slide, /__SLIDE_ID__|__SLIDE_COMPONENT__/);
      assert.equal(await fs.readFile(themePath, "utf8"), beforeTheme);
    });
  });

  it("adds a slide from an explicitly selected template", async () => {
    await withTempWorkspace(async (workspace) => {
      await writeSlidesWorkspace(workspace);
      await writeSlideStyle(workspace);
      const result = spawnSync("node", [CLI, "slide", workspace, "add", "closing", "--template", "statement"], {
        cwd: ROOT,
        encoding: "utf8",
      });
      assert.equal(result.status, 0, result.stderr + result.stdout);
      const slide = await fs.readFile(path.join(workspace, "press", "deck", "slides", "closing", "slide.tsx"), "utf8");
      assert.match(slide, /export default function ClosingSlide/);
      assert.match(slide, /Copied statement template for closing/);
    });
  });

  it("auto-suffixes an existing requested slide id when adding from a template", async () => {
    await withTempWorkspace(async (workspace) => {
      await writeSlidesWorkspace(workspace);
      await writeSlideStyle(workspace);

      const first = spawnSync("node", [CLI, "slide", workspace, "add", "closing", "--template", "statement"], {
        cwd: ROOT,
        encoding: "utf8",
      });
      const second = spawnSync("node", [CLI, "slide", workspace, "add", "closing", "--template", "statement"], {
        cwd: ROOT,
        encoding: "utf8",
      });
      const third = spawnSync("node", [CLI, "slide", workspace, "add", "closing", "--template", "statement"], {
        cwd: ROOT,
        encoding: "utf8",
      });

      assert.equal(first.status, 0, first.stderr + first.stdout);
      assert.equal(second.status, 0, second.stderr + second.stdout);
      assert.equal(third.status, 0, third.stderr + third.stdout);
      assert.match(second.stdout, /added slide closing-2/);
      assert.match(third.stdout, /added slide closing-3/);

      const press = await fs.readFile(path.join(workspace, "press", "deck", "press.tsx"), "utf8");
      assert.match(press, /<Slide id="closing" \/>/);
      assert.match(press, /<Slide id="closing-2" \/>/);
      assert.match(press, /<Slide id="closing-3" \/>/);

      const secondSlide = await fs.readFile(path.join(workspace, "press", "deck", "slides", "closing-2", "slide.tsx"), "utf8");
      const thirdSlide = await fs.readFile(path.join(workspace, "press", "deck", "slides", "closing-3", "slide.tsx"), "utf8");
      assert.match(secondSlide, /export default function Closing2Slide/);
      assert.match(secondSlide, /Copied statement template for closing-2/);
      assert.match(thirdSlide, /export default function Closing3Slide/);
      assert.match(thirdSlide, /Copied statement template for closing-3/);
    });
  });

  it("rejects slide template sources that escape slide-style", async () => {
    await withTempWorkspace(async (workspace) => {
      await writeSlidesWorkspace(workspace);
      const styleRoot = path.join(workspace, "press", "deck", "slide-style");
      await fs.mkdir(styleRoot, { recursive: true });
      await fs.writeFile(
        path.join(styleRoot, "manifest.json"),
        JSON.stringify({
          id: "bad-style",
          version: "1.0.0",
          defaultTemplate: "escape",
          templates: {
            escape: { source: "../slides/cover/slide.tsx" },
          },
        }, null, 2),
        "utf8",
      );

      const result = spawnSync("node", [CLI, "slide", workspace, "add", "bad"], { cwd: ROOT, encoding: "utf8" });

      assert.notEqual(result.status, 0);
      assert.match(result.stderr + result.stdout, /escapes slide-style/);
      assert.equal(await exists(path.join(workspace, "press", "deck", "slides", "bad", "slide.tsx")), false);
    });
  });

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
