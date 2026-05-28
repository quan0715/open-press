import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const coreRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(coreRoot, "..", "..");

const starterSkills = await listStarterSkills();

test("starter-bearing skills remain independent skills", () => {
  assert.deepEqual(starterSkills, [
    "academic-paper",
    "claude-document",
    "editorial-monograph",
    "slide-deck",
    "social-post",
  ]);
});

async function listStarterSkills() {
  const skillsDir = path.join(repoRoot, "skills");
  const names = [];
  for (const entry of await fs.readdir(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    try {
      const stat = await fs.stat(path.join(skillsDir, entry.name, "starter", "document"));
      if (stat.isDirectory()) names.push(entry.name);
    } catch {
      // Skills without starter/document are workflow-only skills.
    }
  }
  return names.sort();
}
