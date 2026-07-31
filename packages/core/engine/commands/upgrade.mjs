import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { diagnose } from "./doctor.mjs";
import { runCommand } from "./_shared.mjs";
import {
  LEGACY_OPENPRESS_KEYS,
  loadWorkspaceSettings,
  writeWorkspaceSettings,
} from "../runtime/workspace-settings.mjs";

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
    if (before.settingsMigrationRequired) {
      process.stdout.write("  workspace settings: package.json#openpress → openpress/settings.json\n");
    }
    process.stdout.write("\n");
  }

  if (dryRun) {
    const settingsMigration = before.settingsMigrationRequired
      ? await migrateLegacyOpenpressSettings(root, { dryRun: true })
      : { status: "noop" };
    if (!json) {
      process.stdout.write("dry run — nothing changed.\n");
      process.stdout.write("  re-run: open-press upgrade .   (without --dry-run)\n");
    } else {
      process.stdout.write(
        JSON.stringify({ status: "dry-run", before, settingsMigration }, null, 2) + "\n",
      );
    }
    return 0;
  }

  // 2. Migrate authored settings before refreshing dependencies or skills.
  const settingsMigration = before.settingsMigrationRequired
    ? await migrateLegacyOpenpressSettings(root)
    : { status: "noop" };
  if (!json && settingsMigration.status === "migrated") {
    process.stdout.write("▸ migrated workspace settings to openpress/settings.json\n");
  }

  // 3. Refresh framework dep (only when workspace declares @open-press/core).
  if (!skipDeps && (await hasCoreDep(root))) {
    if (!json) process.stdout.write("▸ updating @open-press/core via npm…\n");
    const code = runCommand("npm", ["update", "@open-press/core"], root);
    if (code !== 0) {
      if (!json) process.stdout.write("  ⚠ npm update returned non-zero; continuing\n");
    }
  }

  // 4. Refresh skills (npx skills upgrade respects skills-lock.json).
  if (!skipSkills) {
    if (!json) process.stdout.write("▸ refreshing skills via npx skills upgrade…\n");
    runCommand("npx", ["-y", "skills@latest", "upgrade"], root);
  }

  // 5. Re-diagnose to confirm the move.
  const after = await diagnose(root, { noCache: true });

  if (json) {
    process.stdout.write(
      JSON.stringify(
        { status: "applied", before, after, settingsMigration },
        null,
        2,
      ) + "\n",
    );
    return 0;
  }

  process.stdout.write("\n✓ upgrade applied.\n");
  process.stdout.write("\nVerify with:\n  npm run build\n\n");
  return 0;
}

export async function migrateLegacyOpenpressSettings(root, { dryRun = false } = {}) {
  const workspaceRoot = path.resolve(root);
  const packagePath = path.join(workspaceRoot, "package.json");
  const pkg = await readJson(packagePath, "package.json");
  if (!Object.hasOwn(pkg, "openpress") || pkg.openpress == null) {
    return { status: "noop" };
  }
  if (!isPlainObject(pkg.openpress)) {
    throw new Error("package.json#openpress must be an object before it can be migrated.");
  }

  const unknownKeys = Object.keys(pkg.openpress)
    .filter((key) => !LEGACY_OPENPRESS_KEYS.includes(key));
  if (unknownKeys.length > 0) {
    throw new Error(
      `Cannot migrate package.json#openpress; unsupported field${unknownKeys.length === 1 ? "" : "s"}: ${unknownKeys.join(", ")}.`,
    );
  }

  const loaded = await loadWorkspaceSettings(workspaceRoot);
  if (loaded.legacyConflicts.length > 0) {
    throw new Error(
      `Cannot migrate package.json#openpress because ${loaded.legacyConflicts.join(", ")} conflict with openpress/settings.json.`,
    );
  }

  if (dryRun) {
    return {
      status: "would-migrate",
      settingsPath: loaded.settingsPath,
    };
  }

  await writeWorkspaceSettings(workspaceRoot, loaded.settings);
  const nextPackage = { ...pkg };
  delete nextPackage.openpress;
  await writeJsonAtomic(packagePath, nextPackage);
  return {
    status: "migrated",
    settingsPath: loaded.settingsPath,
  };
}

async function hasCoreDep(root) {
  try {
    const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
    return Boolean(pkg.dependencies?.["@open-press/core"] || pkg.devDependencies?.["@open-press/core"]);
  } catch {
    return false;
  }
}

async function readJson(filePath, label) {
  let source;
  try {
    source = await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error(`Cannot migrate settings without ${filePath}.`);
    throw error;
  }
  try {
    const value = JSON.parse(source);
    if (!isPlainObject(value)) throw new Error(`${label} must contain an object.`);
    return value;
  } catch (error) {
    throw new Error(`Malformed ${label} at ${filePath}: ${error.message}`);
  }
}

async function writeJsonAtomic(filePath, value) {
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temporary, filePath);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
