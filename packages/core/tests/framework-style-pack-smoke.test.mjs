import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exportDocument } from "../engine/document-export.mjs";
import { validateWorkspace } from "../engine/runtime/validation.mjs";

const coreRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(coreRoot, "..", "..");
const stylePacksPath = path.join(repoRoot, "packages", "cli", "style-packs.json");
const stylePacks = JSON.parse(await fs.readFile(stylePacksPath, "utf8"));

test("bundled style pack catalog matches starter directories and CI matrix", async () => {
  const starterDirs = [];
  const skillsDir = path.join(repoRoot, "skills");
  for (const entry of await fs.readdir(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    try {
      const stat = await fs.stat(path.join(skillsDir, entry.name, "starter", "document"));
      if (stat.isDirectory()) starterDirs.push(entry.name);
    } catch {
      // Skills without starter/document are workflow skills, not bundled packs.
    }
  }
  starterDirs.sort();
  assert.deepEqual([...stylePacks].sort(), starterDirs);

  const ci = await fs.readFile(path.join(repoRoot, ".github", "workflows", "ci.yml"), "utf8");
  const matrix = ci.match(/pack:\s*\[([^\]]+)\]/)?.[1]
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .sort();
  assert.deepEqual(matrix, [...stylePacks].sort());
});

for (const pack of stylePacks) {
  test(`bundled style pack exports: ${pack}`, async () => {
    await withTempPackWorkspace(pack, async (workspace) => {
      const report = await validateWorkspace(workspace);
      assert.equal(report.ok, true, report.format?.() ?? JSON.stringify(report, null, 2));

      const result = await exportDocument(workspace);
      assert.ok(result.pageCount > 0);
      assert.equal(result.document.blocks.length, result.pageCount);

      if (["editorial-monograph", "claude-document", "academic-paper"].includes(pack)) {
        assert.equal(result.document.theme.pagePreset, "a4");
        assert.equal(result.document.theme.pageLabel, "A4 Page");
        assert.equal(result.document.theme.pageWidth, "210mm");
        assert.equal(result.document.theme.pageHeight, "297mm");
      }

      if (pack === "social-post") {
        assert.equal(result.document.theme.pagePreset, "social-square");
        assert.equal(result.document.theme.pageLabel, "Social Square");
        assert.equal(result.document.theme.pageWidth, "1080px");
        assert.equal(result.document.theme.pageHeight, "1080px");
      }

      if (pack === "slide-deck") {
        assert.equal(result.document.theme.pagePreset, "slide-16-9");
        assert.equal(result.document.theme.pageLabel, "Slide 16:9");
        assert.equal(result.document.theme.pageWidth, "1920px");
        assert.equal(result.document.theme.pageHeight, "1080px");
      }
    });
  });
}

async function withTempPackWorkspace(pack, fn) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), `openpress-pack-${pack}-`));
  try {
    const workspace = path.join(tempRoot, pack);
    await fs.cp(path.join(repoRoot, "skills", pack, "starter"), workspace, { recursive: true });
    await linkWorkspaceNodeModules(workspace);
    return await fn(workspace);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

async function linkWorkspaceNodeModules(workspace) {
  try {
    await fs.symlink(path.join(repoRoot, "node_modules"), path.join(workspace, "node_modules"), "dir");
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
}
