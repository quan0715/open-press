#!/usr/bin/env node
// Sync packages/core + skills into packages/cli/template/ before publish.
// Run via `pnpm sync:template` (and automatically before publish via prepack).

import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(__dirname, "..");
const monorepoRoot = path.resolve(cliRoot, "..", "..");

const coreSrc = path.join(monorepoRoot, "packages", "core");
const skillsSrc = path.join(monorepoRoot, "skills");

const templateDir = path.join(cliRoot, "template");
const templateCore = path.join(templateDir, "core");
// Style pack starters still ship in the cli bundle (init copies one into
// document/ when --pack is passed). Skill files do NOT — they install via the
// `skills` npm tool against the public github repo at runtime.
const templatePacks = path.join(templateDir, "packs");

// Top-level entries in packages/core/ to EXCLUDE from the workspace template.
// These are framework dev-only (tests, dogfood content, generated, configs that
// only matter when developing core itself).
const CORE_EXCLUDES = new Set([
  "node_modules",
  "dist",
  "dist-react",
  "public",
  ".openpress",
  "tests",
  "document",
  "memory",
  "vitest.config.ts",
  "playwright.reader.config.ts",
]);

async function clean() {
  await rm(templateDir, { recursive: true, force: true });
  await mkdir(templateDir, { recursive: true });
}

async function syncCore() {
  await mkdir(templateCore, { recursive: true });
  const entries = await readdir(coreSrc, { withFileTypes: true });
  for (const entry of entries) {
    if (CORE_EXCLUDES.has(entry.name)) continue;
    const from = path.join(coreSrc, entry.name);
    const to = path.join(templateCore, entry.name);
    await cp(from, to, { recursive: true });
  }
}

// Only style packs that have a starter/ directory get copied into the bundle.
// Their SKILL.md and other rules are fetched at runtime via `npx skills add`.
const STYLE_PACKS = ["editorial-monograph", "claude-document"];

async function syncPacks() {
  await mkdir(templatePacks, { recursive: true });
  for (const pack of STYLE_PACKS) {
    const starterSrc = path.join(skillsSrc, pack, "starter");
    const dest = path.join(templatePacks, pack);
    await cp(starterSrc, dest, { recursive: true });
  }
}

async function main() {
  await clean();
  await syncCore();
  await syncPacks();

  const coreEntries = (await readdir(templateCore)).length;
  const packEntries = (await readdir(templatePacks)).length;
  process.stdout.write(`✓ template synced: ${coreEntries} core entries, ${packEntries} style-pack starters\n`);
}

main().catch((err) => {
  process.stderr.write(`sync-template failed: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
