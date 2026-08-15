import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { inspectProjectSkills } from "../runtime/skills-tool.mjs";
import { loadWorkspaceSettings } from "../runtime/workspace-settings.mjs";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const CORE_PACKAGE = "@open-press/core";

export async function run({ root, options }) {
  const json = Boolean(options?.json);
  const noCache = Boolean(options?.noCache);

  const report = await diagnose(root, { noCache });

  if (json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    process.stdout.write(formatDoctorHumanReport(report));
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
 *     skillsTracked: ["openpress", ...],
 *     skillsLockSources: ["quan0715/open-press", ...],
 *     skillsMissing: [],
 *     skillsLinkIssues: [],
 *     skillsLockIssue: string | null,
 *     settingsSource: "settings" | "package" | "defaults" | "invalid",
 *     settingsMigrationRequired: boolean,
 *     settingsMigrationBlocked: boolean,
 *     stale: boolean,                          // core, skill, or settings issue
 *     cachedAt: ISO timestamp
 *   }
 */
export async function diagnose(root, { noCache = false } = {}) {
  const cachePath = path.join(root, ".openpress", "cache", "doctor.json");

  if (!noCache) {
    const cached = await readCached(cachePath);
    if (cached) {
      const [coreVersion, skills, workspaceSettings] = await Promise.all([
        readCoreVersion(root),
        inspectProjectSkills(root),
        diagnoseWorkspaceSettings(root),
      ]);
      return createReport({
        coreVersion,
        coreLatest: cached.coreLatest,
        skills,
        workspaceSettings,
        cachedAt: cached.cachedAt,
      });
    }
  }

  const [coreVersion, coreLatest, skills, workspaceSettings] = await Promise.all([
    readCoreVersion(root),
    fetchCoreLatest(),
    inspectProjectSkills(root),
    diagnoseWorkspaceSettings(root),
  ]);
  const report = createReport({
    coreVersion,
    coreLatest,
    skills,
    workspaceSettings,
    cachedAt: new Date().toISOString(),
  });

  await writeCached(cachePath, report).catch(() => {});
  return report;
}

function createReport({ coreVersion, coreLatest, skills, workspaceSettings, cachedAt }) {
  const coreUpdateAvailable = Boolean(
    coreVersion && coreLatest && coreVersion !== coreLatest && semverLt(coreVersion, coreLatest),
  );

  return {
    coreVersion,
    coreLatest,
    coreUpdateAvailable,
    ...skills,
    ...workspaceSettings,
    stale:
      coreUpdateAvailable ||
      skills.skillsMissing.length > 0 ||
      skills.skillsLinkIssues.length > 0 ||
      Boolean(skills.skillsLockIssue) ||
      workspaceSettings.settingsMigrationRequired,
    cachedAt,
  };
}

async function diagnoseWorkspaceSettings(root) {
  try {
    const result = await loadWorkspaceSettings(root);
    const blockers = [];
    if (result.legacyUnknownKeys.length > 0) {
      blockers.push(`unsupported package.json#openpress fields: ${result.legacyUnknownKeys.join(", ")}`);
    }
    if (result.legacyConflicts.length > 0) {
      blockers.push(
        `conflicting package.json#openpress fields: ${result.legacyConflicts.join(", ")}`,
      );
    }
    return {
      settingsSource: result.source,
      settingsPath: result.settingsPath,
      settingsMigrationRequired: result.hasLegacy,
      settingsMigrationBlocked: blockers.length > 0,
      settingsIssues: blockers,
    };
  } catch (error) {
    return {
      settingsSource: "invalid",
      settingsPath: path.join(root, "openpress", "settings.json"),
      settingsMigrationRequired: true,
      settingsMigrationBlocked: true,
      settingsIssues: [error instanceof Error ? error.message : String(error)],
    };
  }
}

async function readCached(cachePath) {
  try {
    const stats = await stat(cachePath);
    if (Date.now() - stats.mtimeMs > CACHE_TTL_MS) return null;
    const report = JSON.parse(await readFile(cachePath, "utf8"));
    return isCurrentDoctorReport(report) ? report : null;
  } catch {
    return null;
  }
}

function isCurrentDoctorReport(report) {
  return (
    report &&
    Array.isArray(report.skillsInstalled) &&
    Array.isArray(report.skillsTracked) &&
    Array.isArray(report.skillsLockSources) &&
    Array.isArray(report.skillsMissing) &&
    Array.isArray(report.skillsLinkIssues) &&
    Object.hasOwn(report, "skillsLockIssue") &&
    typeof report.settingsMigrationRequired === "boolean"
  );
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

export function formatDoctorHumanReport(report) {
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
    lines.push("    run: npm run openpress:skills");
  } else {
    lines.push(`  ✓ ${report.skillsInstalled.length} skills installed`);
  }
  if (report.skillsTracked?.length > 0) {
    lines.push(`  ${report.skillsTracked.length} tracked in skills-lock.json`);
  }
  if (report.skillsLockSources?.length > 0) {
    lines.push(`    sources: ${report.skillsLockSources.join(", ")}`);
  }
  if (report.skillsLockIssue) {
    lines.push(`  ⚠ ${report.skillsLockIssue}`);
  }
  for (const skill of report.skillsMissing ?? []) {
    lines.push(`  ⚠ missing: ${skill}`);
  }
  for (const issue of report.skillsLinkIssues ?? []) {
    if (!issue.includes("missing canonical")) lines.push(`  ⚠ ${issue}`);
  }
  if (
    report.skillsTracked?.length > 0 ||
    report.skillsMissing?.length > 0 ||
    report.skillsLinkIssues?.length > 0
  ) {
    lines.push("    refresh: npm run openpress:skills");
  }

  lines.push("");
  lines.push("workspace settings");
  if (report.settingsMigrationRequired) {
    if (report.settingsMigrationBlocked) {
      lines.push("  ⚠ migration is blocked");
      for (const issue of report.settingsIssues ?? []) lines.push(`    ${issue}`);
    } else {
      lines.push("  ⚠ package.json#openpress should move to openpress/settings.json");
      lines.push("    migrate: open-press upgrade .");
    }
  } else if (report.settingsSource === "settings") {
    lines.push("  ✓ openpress/settings.json");
  } else {
    lines.push("  ✓ defaults (create openpress/settings.json to customize)");
  }

  lines.push("");
  if (report.stale) {
    lines.push("next");
    lines.push("  open-press upgrade .        # apply all updates (agent-driven)");
    lines.push("  open-press doctor . --json  # machine-readable output");
    lines.push("");
  }
  return lines.join("\n");
}
