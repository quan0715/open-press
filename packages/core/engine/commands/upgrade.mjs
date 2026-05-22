import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { diagnose } from "./doctor.mjs";
import { runCommand } from "./_shared.mjs";

export async function run({ root, options }) {
  const dryRun = Boolean(options?.dryRun);
  const skipSkills = Boolean(options?.noSkills);
  const skipDeps = Boolean(options?.noDeps);
  const json = Boolean(options?.json);

  // 1. Fresh diagnose (force re-check, ignore cache).
  const before = await diagnose(root, { noCache: true });

  if (!before.stale) {
    const message = "open-press is already up to date.";
    if (json) {
      process.stdout.write(JSON.stringify({ status: "noop", before }, null, 2) + "\n");
    } else {
      process.stdout.write(`✓ ${message}\n`);
    }
    return 0;
  }

  if (!json) {
    process.stdout.write("○ open-press upgrade\n\n");
    if (before.coreUpdateAvailable) {
      process.stdout.write(
        `  @open-press/core: ${before.coreVersion} → ${before.coreLatest}\n`,
      );
    }
    if (before.pendingMigrations.length > 0) {
      process.stdout.write(`  migration notes: ${before.pendingMigrations.join(", ")}\n`);
    }
    process.stdout.write("\n");
  }

  if (dryRun) {
    if (!json) {
      process.stdout.write("dry run — nothing changed. The agent should:\n");
      process.stdout.write("  1. read each docs/migrations/<version>.md for document-level changes\n");
      process.stdout.write("  2. apply edits to document/ where needed\n");
      process.stdout.write("  3. re-run: npx open-press upgrade   (without --dry-run)\n");
    } else {
      process.stdout.write(JSON.stringify({ status: "dry-run", before }, null, 2) + "\n");
    }
    return 0;
  }

  // 2. Refresh framework dep (only when workspace declares @open-press/core).
  if (!skipDeps && (await hasCoreDep(root))) {
    if (!json) process.stdout.write("▸ updating @open-press/core via npm…\n");
    const code = runCommand("npm", ["update", "@open-press/core"], root);
    if (code !== 0) {
      if (!json) process.stdout.write("  ⚠ npm update returned non-zero; continuing\n");
    }
  }

  // 3. Refresh skills (npx skills upgrade respects skills-lock.json).
  if (!skipSkills) {
    if (!json) process.stdout.write("▸ refreshing skills via npx skills upgrade…\n");
    runCommand("npx", ["-y", "skills@latest", "upgrade"], root);
  }

  // 4. Surface migration notes for the agent to read.
  const migrationContents = await loadMigrations(root, before.pendingMigrations);

  // 5. Re-diagnose to confirm the move.
  const after = await diagnose(root, { noCache: true });

  if (json) {
    process.stdout.write(
      JSON.stringify(
        { status: "applied", before, after, migrationContents: migrationContents.map((m) => m.path) },
        null,
        2,
      ) + "\n",
    );
    return 0;
  }

  process.stdout.write("\n✓ upgrade applied. Now read these migration notes:\n\n");
  if (migrationContents.length === 0) {
    process.stdout.write("  (no migration docs in this version range)\n\n");
  } else {
    for (const m of migrationContents) {
      process.stdout.write(`  ─ ${m.path}\n`);
    }
    process.stdout.write(
      "\nAgent: open each file, identify document-level changes, grep document/ for affected patterns, propose edits before applying.\n",
    );
  }

  process.stdout.write("\nVerify with:\n  npm run openpress:validate\n  npm run openpress:render\n\n");
  return 0;
}

async function hasCoreDep(root) {
  try {
    const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
    return Boolean(pkg.dependencies?.["@open-press/core"] || pkg.devDependencies?.["@open-press/core"]);
  } catch {
    return false;
  }
}

async function loadMigrations(root, versions) {
  const results = [];
  for (const v of versions) {
    const p = path.join(root, "docs", "migrations", `${v}.md`);
    if (existsSync(p)) {
      results.push({ version: v, path: path.relative(root, p) });
    }
  }
  return results;
}
