#!/usr/bin/env node
// Sync packages/core into packages/cli/template/ before publish.
// Run via `pnpm sync:template` (and automatically before publish via prepack).

import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(__dirname, "..");
const monorepoRoot = path.resolve(cliRoot, "..", "..");

const coreSrc = path.join(monorepoRoot, "packages", "core");

const templateDir = path.join(cliRoot, "template");
const templateCore = path.join(templateDir, "core");

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

async function main() {
  await clean();
  await syncCore();

  const coreEntries = (await readdir(templateCore)).length;
  process.stdout.write(`✓ template synced: ${coreEntries} core entries\n`);
}

main().catch((err) => {
  process.stderr.write(`sync-template failed: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
