import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_FRAMEWORK_SKILL_NAMES } from "./skills-tool.mjs";

const CORE_PACKAGE = "@open-press/core";

export const BUILTIN_SKILLS_CATALOG = Object.freeze({
  "openpress": {
    name: "CLI Router",
    description: "System routing and CLI lifecycle entry point.",
  },
  "openpress-collaborate": {
    name: "Authoring Review",
    description: "Authoring collaboration, proposal previews, and review.",
  },
  "openpress-create-pages": {
    name: "Pages Document",
    description: "Page-based reports, books, handbooks, and long-form document structure.",
  },
  "openpress-create-slide": {
    name: "Slide Presentation",
    description: "Presentation decks, DeckSlide layouts, and semantic visual components.",
  },
  "openpress-deploy": {
    name: "Deploy & Hosting",
    description: "Static deployment preflight and safe Cloudflare Pages publishing.",
  },
  "openpress-plugins": {
    name: "Companion Plugins",
    description: "Recommends external visual skills and adapts their output into native React figures.",
  },
  "openpress-upgrade": {
    name: "Upgrade & Migration",
    description: "Framework migrations, migration-note review, and upgrade checks.",
  },
  "openpress-apply-comments": {
    name: "Apply Comments",
    description: "Reads and resolves @openpress-comment markers in authored content.",
  },
});

/**
 * Checks canonical agent skill directories directly. Workspace `skills/` is source,
 * not evidence that a skill is installed for an agent.
 */
async function listInstalledSkillNamesFast(root) {
  const installed = new Set();
  const dir = path.join(root, ".agents", "skills");
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      const skillPath = path.join(dir, entry.name, "SKILL.md");
      try {
        if ((await fs.stat(skillPath)).isFile()) installed.add(entry.name);
      } catch {}
    }
  } catch {}
  return installed;
}

/**
 * Fast read of skills-lock.json.
 */
async function readSkillsLockFast(root) {
  try {
    const raw = await fs.readFile(path.join(root, "skills-lock.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Reads the official OpenPress companion plugins catalog.
 */
export async function readPluginCatalog(root = ".") {
  const possiblePaths = [
    path.join(root, "skills", "openpress-plugins", "references", "catalog.json"),
    path.join(root, ".agents", "skills", "openpress-plugins", "references", "catalog.json"),
  ];
  for (const catalogPath of possiblePaths) {
    try {
      const raw = await fs.readFile(catalogPath, "utf8");
      const data = JSON.parse(raw);
      if (data?.plugins && typeof data.plugins === "object") {
        return data.plugins;
      }
    } catch {}
  }
  return {};
}

/**
 * Detects whether the current workspace is running from local framework source (e.g. monorepo).
 */
export async function readCoreInfo(root) {
  // 1. Check if node_modules/@open-press/core exists (downstream workspace)
  try {
    const pkgPath = path.join(root, "node_modules", CORE_PACKAGE, "package.json");
    const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8"));
    if (pkg.version) {
      return {
        coreVersion: pkg.version,
        isLocalDev: false,
      };
    }
  } catch {}

  // 2. Check if root package.json is the framework monorepo itself
  try {
    const pkgPath = path.join(root, "package.json");
    const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8"));
    if (pkg.name === CORE_PACKAGE || pkg.name === "open-press-monorepo") {
      return {
        coreVersion: pkg.version || "dev",
        isLocalDev: true,
      };
    }
  } catch {}

  return {
    coreVersion: null,
    isLocalDev: false,
  };
}

export function buildCoreUpdatePrompt({ coreVersion, isLocalDev }) {
  if (isLocalDev) return "";
  const versionInfo = coreVersion ? ` (current version: ${coreVersion})` : "";
  return [
    `Please check and update this OpenPress workspace's @open-press/core dependency to the latest release${versionInfo}:`,
    "1. Check the latest @open-press/core release and migration notes; explain any breaking changes first.",
    "2. Update the @open-press/core dependency in package.json and install dependencies.",
    "3. Run npm run openpress:skills. If this workspace does not provide that script, use the local OpenPress CLI to sync built-in skills.",
    "4. Run npm run build and npm test to verify the upgrade.",
  ].join("\n");
}

export function buildBuiltInSkillsSyncPrompt({ missing = [] } = {}) {
  const missingNote = missing.length > 0
    ? `\nMissing built-in skills: ${missing.join(", ")}`
    : "";
  return [
    `Please sync this OpenPress workspace's built-in skills:${missingNote}`,
    "1. Ensure every official OpenPress built-in skill is present under .agents/skills/.",
    "2. Check and repair canonical links in .claude/skills/ and other compatible agent directories.",
    "3. Run npm run openpress:skills. If this workspace does not provide that script, use the local OpenPress CLI to sync skills.",
    "4. Report the result and list available built-in skills.",
  ].join("\n");
}

export function buildPluginCheckPrompt({ name, source, ref }) {
  const sourceInfo = ref ? `${source} (ref: ${ref})` : source;
  return [
    `Please check whether OpenPress Companion Plugin "${name}" has a remote update (source: ${sourceInfo}):`,
    `1. Review the latest content and change history from "${source}".`,
    "2. Summarize meaningful changes, improvements, and compatibility risks relative to the installed plugin.",
    "3. Do not apply an update yet; present the summary and wait for my confirmation.",
  ].join("\n");
}

export function buildPluginUpdatePrompt({ name, source, ref }) {
  const sourceInfo = ref ? `${source} (ref: ${ref})` : source;
  return [
    `Please update OpenPress Companion Plugin "${name}" to the latest version (source: ${sourceInfo}):`,
    `1. Fetch the latest skill definition from "${source}" and update .agents/skills/${name}.`,
    "2. Update the matching skills-lock.json entry's computedHash and metadata.",
    "3. Leave other skills and workspace settings unchanged.",
    "4. Verify that the updated skill files are complete and readable by agents.",
  ].join("\n");
}

export function buildAllPluginsUpdatePrompt({ plugins = [] } = {}) {
  const count = plugins.length;
  const listFormatted = plugins.map((p, i) => `  ${i + 1}. ${p.name} (${p.source})`).join("\n");
  return [
    `Please check and update this workspace's installed OpenPress Companion Plugins (${count} total):`,
    listFormatted ? `Plugins:\n${listFormatted}` : "",
    "1. Compare each plugin with its remote source to find available updates.",
    "2. List items with updates and summarize important changes and compatibility notes.",
    "3. After I confirm, update only the approved plugins under .agents/skills/ and refresh skills-lock.json.",
    "4. Run npm run build or relevant verification to confirm the workspace remains healthy.",
  ].filter(Boolean).join("\n");
}

export const buildExternalSkillCheckPrompt = buildPluginCheckPrompt;
export const buildExternalSkillUpdatePrompt = buildPluginUpdatePrompt;
export const buildAllExternalSkillsUpdatePrompt = ({ skills = [] } = {}) => buildAllPluginsUpdatePrompt({ plugins: skills });

/**
 * Inspects workspace updates focusing on framework, built-in skills, and OpenPress companion plugins.
 * Executed in sub-millisecond time.
 */
export async function inspectWorkspaceUpdates(root = ".") {
  const [coreInfo, installedSet, lock, catalog] = await Promise.all([
    readCoreInfo(root),
    listInstalledSkillNamesFast(root),
    readSkillsLockFast(root),
    readPluginCatalog(root),
  ]);

  const builtInExpected = [...DEFAULT_FRAMEWORK_SKILL_NAMES];
  const builtInInstalled = builtInExpected.filter((name) => installedSet.has(name));
  const builtInMissing = builtInExpected.filter((name) => !installedSet.has(name));

  const builtInItems = builtInExpected.map((skillName) => {
    const meta = BUILTIN_SKILLS_CATALOG[skillName] || { name: skillName, description: "" };
    const isInstalled = installedSet.has(skillName);
    return {
      name: skillName,
      displayName: meta.name,
      description: meta.description,
      isInstalled,
    };
  });

  const lockSkills = lock?.skills || {};

  // Only companion plugins declared by the openpress-plugins skill belong here.
  // Other third-party skills remain outside this focused updates surface.
  const catalogEntries = Object.entries(catalog);
  const plugins = catalogEntries.map(([pluginId, def]) => {
    const isInstalled = installedSet.has(pluginId);
    const lockEntry = lockSkills[pluginId];
    const source = lockEntry?.source || def.source || pluginId;
    const ref = lockEntry?.ref;
    const isLocked = Boolean(lockEntry);

    const prompts = isInstalled
      ? {
          check: buildPluginCheckPrompt({ name: pluginId, source, ref }),
          update: buildPluginUpdatePrompt({ name: pluginId, source, ref }),
        }
      : {};

    return {
      name: pluginId,
      displayName: def.name || pluginId,
      category: def.category || "Plugin",
      description: def.description || "",
      source,
      ref,
      isInstalled,
      isLocked,
      prompts,
    };
  });

  const installedPlugins = plugins.filter((p) => p.isInstalled);

  const prompts = {
    coreUpdate: buildCoreUpdatePrompt({
      coreVersion: coreInfo.coreVersion,
      isLocalDev: coreInfo.isLocalDev,
    }),
    builtInSync: buildBuiltInSkillsSyncPrompt({
      missing: builtInMissing,
    }),
    allPluginsUpdate: buildAllPluginsUpdatePrompt({
      plugins: installedPlugins,
    }),
  };

  return {
    openpress: {
      coreVersion: coreInfo.coreVersion,
      isLocalDev: coreInfo.isLocalDev,
      prompts: {
        update: prompts.coreUpdate,
      },
    },
    builtInSkills: {
      expected: builtInExpected,
      installedCount: builtInInstalled.length,
      missing: builtInMissing,
      items: builtInItems,
      prompts: {
        sync: prompts.builtInSync,
      },
    },
    plugins: {
      totalCatalogCount: plugins.length,
      installedCount: installedPlugins.length,
      items: plugins,
      prompts: {
        updateAll: prompts.allPluginsUpdate,
      },
    },
    // Backward-compat alias for externalSkills
    externalSkills: {
      trackedCount: installedPlugins.length,
      untrackedCount: 0,
      items: installedPlugins.map((p) => ({
        name: p.name,
        source: p.source,
        sourceType: "plugin",
        isUntracked: !p.isLocked,
        prompts: {
          check: p.prompts.check || "",
          update: p.prompts.update || "",
        },
      })),
      prompts: {
        updateAll: prompts.allPluginsUpdate,
      },
    },
  };
}
