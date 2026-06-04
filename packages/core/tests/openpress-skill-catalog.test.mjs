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

async function scan(dir, matches) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist-react") continue;
    if (entry.name === "public" || entry.name === ".deploy" || entry.name === ".openpress") continue;

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
