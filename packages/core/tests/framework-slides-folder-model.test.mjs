import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  discoverSlideFiles,
  parseSlideIndexSource,
  validateSlidesFolderContract,
} from "../engine/react/slides-folder-model.mjs";
import { rmWithRetry } from "./_temp.mjs";

async function withTempDir(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-slides-model-"));
  try {
    return await fn(dir);
  } finally {
    await rmWithRetry(dir);
  }
}

async function writeSlide(root, id, body = "export default function Slide() { return null }\n") {
  await fs.mkdir(path.join(root, "slides", id), { recursive: true });
  await fs.writeFile(path.join(root, "slides", id, "slide.tsx"), body, "utf8");
}

describe("slides-folder model", () => {
  it("discovers slide.tsx files by folder id", async () => {
    await withTempDir(async (dir) => {
      await writeSlide(dir, "cover");
      await writeSlide(dir, "agenda");
      const slides = await discoverSlideFiles(dir);
      assert.deepEqual(slides.map((slide) => slide.id), ["agenda", "cover"]);
      assert.ok(slides.every((slide) => slide.absolutePath.endsWith("slide.tsx")));
    });
  });

  it("parses ordered <Slide id /> markers and skip props", () => {
    const source = `import { Press, Slide } from "@open-press/core";
export default function PressIndex() {
  return <Press type="slides"><Slide id="cover" /><Slide id="draft" skip /></Press>;
}`;
    assert.deepEqual(parseSlideIndexSource(source, "press.tsx"), [
      { id: "cover", skip: false },
      { id: "draft", skip: true },
    ]);
  });

  it("rejects unreferenced slide folders", async () => {
    await withTempDir(async (dir) => {
      await writeSlide(dir, "cover");
      await writeSlide(dir, "orphan");
      const result = await validateSlidesFolderContract({
        pressDir: dir,
        pressSource: `<Press type="slides"><Slide id="cover" /></Press>`,
      });
      assert.equal(result.ok, false);
      assert.match(result.errors.join("\n"), /orphan/);
    });
  });

  it("rejects missing slide files and duplicate markers", async () => {
    await withTempDir(async (dir) => {
      await writeSlide(dir, "cover");
      const result = await validateSlidesFolderContract({
        pressDir: dir,
        pressSource: `<Press type="slides"><Slide id="cover" /><Slide id="cover" /><Slide id="missing" /></Press>`,
      });
      assert.equal(result.ok, false);
      assert.match(result.errors.join("\n"), /duplicate|appears 2 times/i);
      assert.match(result.errors.join("\n"), /missing/);
    });
  });

  it("rejects non-Slide children and hand-authored object identity props", async () => {
    await withTempDir(async (dir) => {
      await writeSlide(dir, "cover", `export default function Slide() { return <h1 objectId="x">Hi</h1> }\n`);
      const result = await validateSlidesFolderContract({
        pressDir: dir,
        pressSource: `<Press type="slides"><div /><Slide id="cover" /></Press>`,
      });
      assert.equal(result.ok, false);
      assert.match(result.errors.join("\n"), /may only contain <Slide id \/> children/);
      assert.match(result.errors.join("\n"), /hand-authored objectId/);
    });
  });

  it("rejects non-literal slide metadata during contract validation", async () => {
    await withTempDir(async (dir) => {
      await writeSlide(dir, "cover", `export const meta = { ...baseMeta };
export default function Slide() { return null }
`);
      const result = await validateSlidesFolderContract({
        pressDir: dir,
        pressSource: `<Press type="slides"><Slide id="cover" /></Press>`,
      });
      assert.equal(result.ok, false);
      assert.match(result.errors.join("\n"), /meta must not use spread/);
    });
  });

  it("rejects non-literal slide notes during contract validation", async () => {
    await withTempDir(async (dir) => {
      await writeSlide(dir, "cover", `export const notes = buildNotes();
export default function Slide() { return null }
`);
      const result = await validateSlidesFolderContract({
        pressDir: dir,
        pressSource: `<Press type="slides"><Slide id="cover" /></Press>`,
      });
      assert.equal(result.ok, false);
      assert.match(result.errors.join("\n"), /notes must be a static string literal/);
    });
  });
});
