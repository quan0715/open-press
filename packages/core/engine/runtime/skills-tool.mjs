import fs from "node:fs/promises";
import path from "node:path";

export const SKILLS_CLI_PACKAGE = "skills@1.5.18";
export const FRAMEWORK_SKILLS_SOURCE = "quan0715/open-press";
export const SKILLS_AGENT_TARGETS = ["universal", "claude-code"];
export const DEFAULT_FRAMEWORK_SKILL_NAMES = Object.freeze([
  "openpress",
  "openpress-apply-comments",
  "openpress-collaborate",
  "openpress-create-pages",
  "openpress-create-slide",
  "openpress-deploy",
  "openpress-upgrade",
]);
export const OPTIONAL_FRAMEWORK_SKILLS = Object.freeze({});

const SUPPORTED_LOCK_VERSION = 1;
const RETIRED_FRAMEWORK_SKILLS = new Set([
  "chinese-ai-writing-polish",
  "openpress-diagram-drawing",
  "openpress-explanatory-visuals",
]);

export async function readProjectSkillsLock(root) {
  const lockPath = path.join(root, "skills-lock.json");
  let source;
  try {
    source = await fs.readFile(lockPath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }

  let lock;
  try {
    lock = JSON.parse(source);
  } catch (error) {
    throw new Error(`Malformed skills-lock.json at ${lockPath}: ${error.message}`);
  }
  if (!isPlainObject(lock) || !Number.isInteger(lock.version)) {
    throw new Error(`Malformed skills-lock.json at ${lockPath}: expected a versioned object.`);
  }
  if (lock.version !== SUPPORTED_LOCK_VERSION) {
    throw new Error(
      `Unsupported skills-lock.json version ${lock.version}; OpenPress supports version ${SUPPORTED_LOCK_VERSION}.`,
    );
  }
  if (!isPlainObject(lock.skills)) {
    throw new Error(`Malformed skills-lock.json at ${lockPath}: "skills" must be an object.`);
  }

  for (const [skillName, entry] of Object.entries(lock.skills)) {
    if (!isPlainObject(entry)) {
      throw new Error(`Malformed skills-lock.json entry "${skillName}": expected an object.`);
    }
    if (typeof entry.source !== "string" || !entry.source.trim()) {
      throw new Error(`Malformed skills-lock.json entry "${skillName}": missing source.`);
    }
    if (typeof entry.sourceType !== "string" || !entry.sourceType.trim()) {
      throw new Error(`Malformed skills-lock.json entry "${skillName}": missing sourceType.`);
    }
    if (entry.sourceUrl != null && typeof entry.sourceUrl !== "string") {
      throw new Error(`Malformed skills-lock.json entry "${skillName}": sourceUrl must be a string.`);
    }
    if (entry.ref != null && typeof entry.ref !== "string") {
      throw new Error(`Malformed skills-lock.json entry "${skillName}": ref must be a string.`);
    }
  }

  return lock;
}

export function buildSkillsSyncPlan(lock, { extraSource } = {}) {
  const grouped = new Map();
  const trackedFrameworkSkills = [];
  let needsNodeModulesSync = false;

  const entries = Object.entries(lock?.skills ?? {})
    .sort(([a], [b]) => a.localeCompare(b));
  for (const [skillName, entry] of entries) {
    if (entry.sourceType === "node_modules") {
      needsNodeModulesSync = true;
      continue;
    }
    if (isFrameworkSource(entry.sourceUrl ?? entry.source)) {
      if (
        !RETIRED_FRAMEWORK_SKILLS.has(skillName) &&
        !DEFAULT_FRAMEWORK_SKILL_NAMES.includes(skillName)
      ) {
        trackedFrameworkSkills.push(skillName);
      }
      continue;
    }
    const source = sourceWithRef(resolveEntrySource(entry), entry.ref);
    const names = grouped.get(source) ?? [];
    names.push(skillName);
    grouped.set(source, names);
  }

  const plan = [
    createAddStep(FRAMEWORK_SKILLS_SOURCE, [
      ...DEFAULT_FRAMEWORK_SKILL_NAMES,
      ...trackedFrameworkSkills.sort(),
    ]),
    ...[...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([source, names]) => createAddStep(source, names.sort())),
  ];

  if (extraSource && !isFrameworkSource(extraSource)) {
    plan.push(createAddStep(extraSource, ["*"]));
  }
  if (needsNodeModulesSync) {
    plan.push({
      label: "Syncing skills exposed by node_modules",
      args: [
        "--yes",
        SKILLS_CLI_PACKAGE,
        "experimental_sync",
        "--agent",
        ...SKILLS_AGENT_TARGETS,
        "--force",
        "--yes",
      ],
    });
  }
  return plan;
}

export function formatSkillsCommand(step) {
  return `npx ${step.args.map(formatArgument).join(" ")}`;
}

export function resolveOptionalFrameworkSkill(alias) {
  if (typeof alias !== "string") return null;
  return OPTIONAL_FRAMEWORK_SKILLS[alias.trim()] ?? null;
}

export function createOptionalFrameworkSkillAddStep(alias) {
  const skillName = resolveOptionalFrameworkSkill(alias);
  if (!skillName) return null;
  return {
    skillName,
    step: createAddStep(FRAMEWORK_SKILLS_SOURCE, [skillName]),
  };
}

export async function pruneRetiredFrameworkSkills(root, lock, { apply = false } = {}) {
  if (!lock) return { lock, retiredSkillNames: [] };

  const retiredSkillNames = Object.entries(lock.skills)
    .filter(([skillName, entry]) => (
      RETIRED_FRAMEWORK_SKILLS.has(skillName) &&
      isFrameworkSource(entry.sourceUrl ?? entry.source)
    ))
    .map(([skillName]) => skillName)
    .sort();
  if (retiredSkillNames.length === 0) return { lock, retiredSkillNames };

  const retired = new Set(retiredSkillNames);
  const nextLock = {
    ...lock,
    skills: Object.fromEntries(
      Object.entries(lock.skills).filter(([skillName]) => !retired.has(skillName)),
    ),
  };

  if (apply) {
    const lockPath = path.join(root, "skills-lock.json");
    const tempPath = `${lockPath}.${process.pid}.tmp`;
    try {
      await fs.writeFile(tempPath, `${JSON.stringify(nextLock, null, 2)}\n`, "utf8");
      await fs.rename(tempPath, lockPath);
    } catch (error) {
      await fs.rm(tempPath, { force: true }).catch(() => {});
      throw error;
    }
  }

  return { lock: nextLock, retiredSkillNames };
}

export async function inspectProjectSkills(
  root,
  {
    includeTrackedSkills = true,
    requireFrameworkBundle = false,
    requireRouter = true,
    requiredSkills = [],
  } = {},
) {
  let lock = null;
  let skillsLockIssue = null;
  try {
    lock = await readProjectSkillsLock(root);
  } catch (error) {
    skillsLockIssue = error instanceof Error ? error.message : String(error);
  }
  if (lock) {
    ({ lock } = await pruneRetiredFrameworkSkills(root, lock));
  }

  const skillsInstalled = await listInstalledSkills(root);
  const skillsTracked = Object.keys(lock?.skills ?? {}).sort();
  const skillsLockSources = [
    ...new Set(
      Object.values(lock?.skills ?? {}).map((entry) => entry.sourceUrl ?? entry.source),
    ),
  ].sort();
  const skillsMissing = [];
  const skillsLinkIssues = [];

  const requiredFrameworkSkills = requireFrameworkBundle
    ? DEFAULT_FRAMEWORK_SKILL_NAMES
    : requireRouter ? ["openpress"] : [];
  const expectedSkills = [
    ...new Set([
      ...requiredFrameworkSkills,
      ...requiredSkills,
      ...(includeTrackedSkills ? skillsTracked : []),
    ]),
  ].sort();
  for (const skillName of expectedSkills) {
    const canonical = path.join(root, ".agents", "skills", skillName);
    if (!(await resolvesToDirectory(canonical))) {
      skillsMissing.push(skillName);
      skillsLinkIssues.push(`${skillName}: missing canonical .agents/skills directory`);
      continue;
    }
    if (!(await isRegularFile(path.join(canonical, "SKILL.md")))) {
      skillsMissing.push(skillName);
      skillsLinkIssues.push(`${skillName}: missing canonical SKILL.md`);
      continue;
    }

    const claudeEntry = path.join(root, ".claude", "skills", skillName);
    let stats;
    try {
      stats = await fs.lstat(claudeEntry);
    } catch (error) {
      if (error?.code === "ENOENT") {
        skillsLinkIssues.push(`${skillName}: missing .claude/skills link`);
        continue;
      }
      throw error;
    }
    if (stats.isDirectory()) {
      if (!(await isRegularFile(path.join(claudeEntry, "SKILL.md")))) {
        skillsLinkIssues.push(`${skillName}: copied .claude/skills entry has no SKILL.md`);
      }
      continue;
    }
    if (!stats.isSymbolicLink()) {
      skillsLinkIssues.push(`${skillName}: invalid .claude/skills entry`);
      continue;
    }
    try {
      const [canonicalRealPath, claudeRealPath] = await Promise.all([
        fs.realpath(canonical),
        fs.realpath(claudeEntry),
      ]);
      if (canonicalRealPath !== claudeRealPath) {
        skillsLinkIssues.push(`${skillName}: .claude/skills link targets a different skill`);
      }
    } catch {
      skillsLinkIssues.push(`${skillName}: broken .claude/skills link`);
    }
  }

  return {
    skillsInstalled,
    skillsTracked,
    skillsLockVersion: lock?.version ?? null,
    skillsLockSources,
    skillsLockSource: skillsLockSources[0] ?? null,
    skillsMissing,
    skillsLinkIssues,
    skillsLockIssue,
  };
}

function createAddStep(source, skillNames) {
  return {
    label: `Installing ${skillNames.includes("*") ? "all skills" : skillNames.join(", ")} from ${source}`,
    args: [
      "--yes",
      SKILLS_CLI_PACKAGE,
      "add",
      source,
      "--skill",
      ...skillNames,
      "--agent",
      ...SKILLS_AGENT_TARGETS,
      "--yes",
    ],
  };
}

function sourceWithRef(source, ref) {
  if (!ref || source.endsWith(`#${ref}`)) return source;
  return `${source}#${ref}`;
}

function resolveEntrySource(entry) {
  const source = entry.sourceUrl ?? entry.source;
  if (entry.sourceType !== "well-known") return source;

  if (/^https?:\/\//.test(source)) {
    const wellKnownIndex = source.indexOf("/.well-known/");
    return wellKnownIndex === -1 ? source : source.slice(0, wellKnownIndex);
  }

  const host = source.startsWith("wellknown/")
    ? source.slice("wellknown/".length)
    : source;
  if (/^[A-Za-z0-9.-]+(?::\d+)?$/.test(host)) return `https://${host}`;
  throw new Error(
    `Cannot refresh well-known skill source "${entry.source}"; expected a hostname or sourceUrl.`,
  );
}

export function isFrameworkSource(source) {
  return source
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/^git@github\.com:/, "")
    .replace(/\.git$/, "")
    .replace(/#.*$/, "") === FRAMEWORK_SKILLS_SOURCE;
}

function formatArgument(value) {
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", `'\"'\"'`)}'`;
}

async function listInstalledSkills(root) {
  const skillsDir = path.join(root, ".agents", "skills");
  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    const installed = [];
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (
        (entry.isDirectory() || entry.isSymbolicLink()) &&
        await resolvesToDirectory(path.join(skillsDir, entry.name))
      ) {
        installed.push(entry.name);
      }
    }
    return installed.sort();
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function resolvesToDirectory(target) {
  try {
    return (await fs.stat(target)).isDirectory();
  } catch {
    return false;
  }
}

async function isRegularFile(target) {
  try {
    return (await fs.stat(target)).isFile();
  } catch {
    return false;
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
