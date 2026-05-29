import path from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { runCommand } from "./_shared.mjs";

const DEFAULT_SOURCE = "quan0715/open-press";

// Refresh installed agent skills against the workspace's lock file.
// Behavior:
//   - If skills-lock.json exists, run `npx skills upgrade` (refreshes all
//     currently-installed sources to their latest published versions).
//   - If skills-lock.json is missing, install the OpenPress framework
//     skill bundle (and any user-supplied --source) as a first-time setup.
//   - If a --source flag is passed, also add that source on top of any
//     existing installations.
//
// Always exits 0 unless the underlying `skills` tool fails.
export async function run({ root, options }) {
  const lockPath = path.join(root, "skills-lock.json");
  const lockExists = existsSync(lockPath);
  const extraSource = options?.source;

  if (options?.dryRun) {
    if (lockExists) {
      console.log("Command: npx -y skills@latest upgrade");
    } else {
      console.log(`Command: npx -y skills@latest add ${DEFAULT_SOURCE}`);
    }
    if (extraSource) {
      console.log(`Command: npx -y skills@latest add ${extraSource}`);
    }
    return 0;
  }

  if (lockExists) {
    const sources = await readLockSources(lockPath);
    if (sources.length === 0) {
      console.log("skills-lock.json has no sources; installing framework default…");
      const code = await runCommand("npx", ["-y", "skills@latest", "add", DEFAULT_SOURCE], root);
      if (code !== 0) return code;
    } else {
      console.log(`Refreshing ${sources.length} installed source(s)…`);
      for (const src of sources) console.log(`  ${src}`);
      const code = await runCommand("npx", ["-y", "skills@latest", "upgrade"], root);
      if (code !== 0) return code;
    }
  } else {
    console.log(`No skills-lock.json; installing framework default: ${DEFAULT_SOURCE}`);
    const code = await runCommand("npx", ["-y", "skills@latest", "add", DEFAULT_SOURCE], root);
    if (code !== 0) return code;
  }

  if (extraSource) {
    console.log(`Adding extra source: ${extraSource}`);
    const code = await runCommand("npx", ["-y", "skills@latest", "add", extraSource], root);
    if (code !== 0) return code;
  }

  console.log("✓ Skills synced");
  return 0;
}

async function readLockSources(lockPath) {
  try {
    const lock = JSON.parse(await readFile(lockPath, "utf8"));
    const sources = Array.isArray(lock?.sources) ? lock.sources : [];
    return sources.map((s) => s?.source).filter((s) => typeof s === "string");
  } catch {
    return [];
  }
}
