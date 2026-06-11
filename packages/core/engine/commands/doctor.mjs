import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const CORE_PACKAGE = "@open-press/core";

export async function run({ root, options }) {
  const json = Boolean(options?.json);
  const noCache = Boolean(options?.noCache);

  const report = await diagnose(root, { noCache });

  if (json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    printHumanReport(report);
  }

  // Exit 0 even when stale — doctor is informational, not a gate.
  // Agents / CI can check report.stale or report.coreUpdateAvailable.
  return 0;
}

/**
 * Diagnose workspace against latest framework state.
 * Result shape:
 *   {
 *     coreVersion: "0.4.0",                    // installed
 *     coreLatest: "0.5.0" | null,              // null on network failure
 *     coreUpdateAvailable: boolean,
 *     skillsInstalled: ["openpress", ...],
 *     skillsLockSource: "quan0715/open-press" | null,
 *     stale: boolean,                          // either core or skills behind
 *     cachedAt: ISO timestamp
 *   }
 */
export async function diagnose(root, { noCache = false } = {}) {
  const cachePath = path.join(root, ".openpress", "cache", "doctor.json");

  if (!noCache) {
    const cached = await readCached(cachePath);
    if (cached) return cached;
  }

  const coreVersion = await readCoreVersion(root);
  const coreLatest = await fetchCoreLatest();
  const skillsInstalled = await listInstalledSkills(root);
  const skillsLockSource = await readSkillsLockSource(root);
  const coreUpdateAvailable = Boolean(
    coreVersion && coreLatest && coreVersion !== coreLatest && semverLt(coreVersion, coreLatest),
  );

  const report = {
    coreVersion,
    coreLatest,
    coreUpdateAvailable,
    skillsInstalled,
    skillsLockSource,
    stale: coreUpdateAvailable,
    cachedAt: new Date().toISOString(),
  };

  await writeCached(cachePath, report).catch(() => {});
  return report;
}

async function readCached(cachePath) {
  try {
    const stats = await stat(cachePath);
    if (Date.now() - stats.mtimeMs > CACHE_TTL_MS) return null;
    return JSON.parse(await readFile(cachePath, "utf8"));
  } catch {
    return null;
  }
}

async function writeCached(cachePath, report) {
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, JSON.stringify(report, null, 2) + "\n", "utf8");
}

async function readCoreVersion(root) {
  // Try workspace package.json deps first; fall back to installed package.
  try {
    const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
    const range = pkg.dependencies?.[CORE_PACKAGE] ?? pkg.devDependencies?.[CORE_PACKAGE];
    if (range) {
      // Try the installed version (more accurate than the range).
      try {
        const installed = JSON.parse(
          await readFile(path.join(root, "node_modules", CORE_PACKAGE, "package.json"), "utf8"),
        );
        return installed.version;
      } catch {
        return range.replace(/^[\^~>=<\s]+/, "");
      }
    }
  } catch {}

  // Self-bundled framework (cli scaffolded workspace): pkg.version is the framework version.
  try {
    const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
    if (pkg.name === CORE_PACKAGE) return pkg.version;
  } catch {}

  return null;
}

async function fetchCoreLatest() {
  try {
    const res = await fetch(`https://registry.npmjs.org/${CORE_PACKAGE}/latest`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.version === "string" ? data.version : null;
  } catch {
    return null;
  }
}

async function listInstalledSkills(root) {
  const skillsDir = path.join(root, ".agents", "skills");
  try {
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(skillsDir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

async function readSkillsLockSource(root) {
  try {
    const lock = JSON.parse(await readFile(path.join(root, "skills-lock.json"), "utf8"));
    const sources = lock?.sources;
    if (Array.isArray(sources) && sources.length > 0) return sources[0]?.source ?? null;
    return null;
  } catch {
    return null;
  }
}


function semverParse(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v);
  if (!m) return [0, 0, 0];
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}
function semverCompare(a, b) {
  const A = semverParse(a);
  const B = semverParse(b);
  for (let i = 0; i < 3; i++) if (A[i] !== B[i]) return A[i] - B[i];
  return 0;
}
function semverLt(a, b) { return semverCompare(a, b) < 0; }
function semverGt(a, b) { return semverCompare(a, b) > 0; }

function printHumanReport(report) {
  const lines = [];
  lines.push("○ open-press doctor");
  lines.push("");
  lines.push("framework");
  if (report.coreVersion) {
    if (report.coreLatest === null) {
      lines.push(`  ? @open-press/core: ${report.coreVersion} installed (couldn't check latest — offline?)`);
    } else if (report.coreUpdateAvailable) {
      lines.push(`  ⚠ @open-press/core: ${report.coreVersion} installed → ${report.coreLatest} available`);
    } else {
      lines.push(`  ✓ @open-press/core: ${report.coreVersion} (latest)`);
    }
  } else {
    lines.push("  ? @open-press/core: not detected in this workspace");
  }
  lines.push("");
  lines.push("skills");
  if (report.skillsInstalled.length === 0) {
    lines.push("  ? no skills installed under .agents/skills/");
    lines.push("    run: npx skills add quan0715/open-press");
  } else {
    lines.push(`  ✓ ${report.skillsInstalled.length} skills installed`);
    if (report.skillsLockSource) {
      lines.push(`    source: ${report.skillsLockSource}`);
      lines.push("    refresh: npx skills upgrade");
    }
  }

  lines.push("");
  if (report.stale) {
    lines.push("next");
    lines.push("  npx open-press upgrade        # apply all updates (agent-driven)");
    lines.push("  npx open-press doctor --json  # machine-readable output");
    lines.push("");
  }
  process.stdout.write(lines.join("\n"));
}
