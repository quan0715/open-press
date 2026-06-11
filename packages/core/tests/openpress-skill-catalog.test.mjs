import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");
const skillsRoot = path.join(repoRoot, "skills");

const deletedSkills = [
  "openpress-init",
  "openpress-writing",
  "openpress-design",
  "openpress-create-theme",
  "academic-paper",
  "claude-document",
  "editorial-monograph",
];

const requiredSkills = [
  "openpress",
  "openpress-create-pages",
  "openpress-create-slide",
  "openpress-apply-comments",
  "openpress-deploy",
];

const historicalPathPatterns = [
  /^CHANGELOG\.md$/,
  /^docs\/migrations\//,
  /^docs\/superpowers\/specs\//,
  /^docs\/superpowers\/plans\//,
  /^packages\/cli\/CHANGELOG\.md$/,
  /^packages\/cli\/template\/core\/CHANGELOG\.md$/,
  /^packages\/core\/CHANGELOG\.md$/,
  /^packages\/core\/tests\/openpress-skill-catalog\.test\.mjs$/,
];

const migrateCommandSurfacePaths = [
  "apps/web/src/content/docs/en/reference/cli-tools.mdx",
  "apps/web/src/content/docs/ja/reference/cli-tools.mdx",
  "apps/web/src/content/docs/zh-tw/reference/cli-tools.mdx",
  "docs/cli.md",
  "docs/skills.md",
  "packages/cli/src/cli.ts",
  "packages/core/engine/cli.mjs",
  "packages/core/engine/commands/dev.mjs",
  "packages/core/engine/commands/doctor.mjs",
  "packages/core/engine/commands/upgrade.mjs",
  "packages/core/tests/openpress-engine-runtime.test.mjs",
  "skills/openpress/SKILL.md",
  "skills/openpress/references/upgrade.md",
  "skills/openpress-create-pages/SKILL.md",
  "skills/openpress-create-slide/SKILL.md",
];

test("active skill catalog exposes create pages and create slide", async () => {
  const skillDirs = await readdir(skillsRoot);

  for (const skill of requiredSkills) {
    assert.ok(skillDirs.includes(skill), `missing required skill directory: ${skill}`);
    assert.ok(existsSync(path.join(skillsRoot, skill, "SKILL.md")), `missing SKILL.md for ${skill}`);
  }

  for (const skill of deletedSkills) {
    assert.equal(skillDirs.includes(skill), false, `deleted skill directory still exists: ${skill}`);
  }
});

test("active repository text does not route to deleted lifecycle skills", async () => {
  const matches = [];
  await scan(repoRoot, matches);

  const badMatches = matches.filter((match) => !historicalPathPatterns.some((pattern) => pattern.test(match.path)));
  assert.deepEqual(badMatches, []);
});

test("active lifecycle docs do not advertise migrate as a command", async () => {
  const matches = [];
  for (const relativePath of migrateCommandSurfacePaths) {
    const text = await readFile(path.join(repoRoot, relativePath), "utf8");
    if (/\bmigrate\b/i.test(text)) matches.push({ path: relativePath });
  }

  assert.deepEqual(matches, []);
});

async function scan(dir, matches) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist-react") continue;
    if (entry.name === "public" || entry.name === ".deploy" || entry.name === ".openpress") continue;
    if (entry.name === ".turbo" || entry.name === ".astro") continue;

    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await scan(absolute, matches);
      continue;
    }

    if (!/\.(md|mdx|ts|tsx|mjs|json)$/.test(entry.name)) continue;

    const relative = path.relative(repoRoot, absolute).replaceAll(path.sep, "/");
    const text = await readFile(absolute, "utf8");
    for (const skill of deletedSkills) {
      if (text.includes(skill)) matches.push({ path: relative, skill });
    }
  }
}
