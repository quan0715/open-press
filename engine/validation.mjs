import fs from "node:fs/promises";
import path from "node:path";
import { loadQDocConfig } from "./config.mjs";

// Adapters that publish the document to a URL anyone on the internet can reach.
// `deploy.requiresConfirmation: true` is mandatory for these so an automated
// pipeline (or a careless command) cannot ship without an explicit human step.
// Adapters not in this set (local file copy, custom in-house tooling, null)
// can opt out of the confirmation gate.
const PUBLIC_DEPLOY_ADAPTERS = new Set([
  "cloudflare-pages",
  "github-pages",
  "netlify",
  "vercel",
]);

export async function discoverWorkspace(startPath = ".") {
  let current = path.resolve(startPath);
  try {
    const stat = await fs.stat(current);
    if (!stat.isDirectory()) current = path.dirname(current);
  } catch {
    current = path.dirname(current);
  }
  while (true) {
    const configPath = path.join(current, "qdoc.config.mjs");
    try {
      await fs.access(configPath);
      return current;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) throw new Error(`No QDoc workspace found from ${startPath}`);
      current = parent;
    }
  }
}

export async function validateWorkspace(root) {
  const config = await loadQDocConfig(root);
  const issues = [];
  const checked = [];
  const mark = (name) => {
    if (!checked.includes(name)) checked.push(name);
  };
  const add = (level, code, message, filePath = null) => issues.push({ level, code, message, path: filePath });

  mark("config");
  for (const [key, target] of [
    ["sourceDir", config.paths.sourceDir],
    ["mediaDir", config.paths.mediaDir],
    ["themeDir", config.paths.themeDir],
    ["designSystemDir", config.paths.designSystemDir],
    ["componentsDir", config.paths.componentsDir],
  ]) {
    if (!(await exists(target))) add("error", `config.${key}`, `Configured QDoc path \`${key}\` does not exist.`, target);
  }

  mark("design-system");
  const designSystemDir = config.paths.designSystemDir;
  if (!(await exists(designSystemDir))) {
    add("error", "design-system.missing", "Design system source directory must exist.", designSystemDir);
  }

  mark("deploy-gate");
  if (PUBLIC_DEPLOY_ADAPTERS.has(config.deploy.adapter) && config.deploy.requiresConfirmation !== true) {
    add(
      "error",
      "deploy.confirmation",
      `Public deploy adapter \`${config.deploy.adapter}\` must require user confirmation (set deploy.requiresConfirmation: true).`,
      config.configPath,
    );
  }

  mark("content");
  const sourceDir = config.paths.sourceDir;
  if (!(typeof config.title === "string" && config.title.trim())) {
    add("warning", "config.title", "qdoc.config.mjs `title` is empty; the workbench will show the default placeholder.", config.configPath);
  }
  try {
    const entries = await fs.readdir(sourceDir);
    const mdFiles = entries.filter((name) => name.endsWith(".md") && !name.startsWith("_"));
    if (mdFiles.length === 0) {
      add("warning", "content.empty", `Content source directory has no \`*.md\` files; the document will export with zero pages.`, sourceDir);
    }
  } catch (error) {
    if (error?.code === "ENOENT") {
      add("warning", "content.missing", `Content source directory does not exist yet; create ${config.sourceDir}/ before running export.`, sourceDir);
    } else {
      throw error;
    }
  }

  return {
    ok: issues.every((issue) => issue.level !== "error"),
    issues,
    checked,
    format() {
      if (issues.length === 0) return "QDoc validation OK";
      return issues.map((issue) => `[${issue.level}] ${issue.code}: ${issue.message}${issue.path ? ` (${issue.path})` : ""}`).join("\n");
    },
  };
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

