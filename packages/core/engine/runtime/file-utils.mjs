import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "./config.mjs";
import { readKatexCss } from "../output/katex-assets.mjs";

// Framework-owned CSS — always read from the package, never from the workspace.
// Users should not copy or override these files; customise via CSS variables in tokens.css.
const FRAMEWORK_CSS_PATHS = [
  new URL("../../src/styles/openpress/page-contract.css", import.meta.url),
];

export async function copyDirectory(src, dst) {
  await fs.rm(dst, { recursive: true, force: true });
  await fs.mkdir(path.dirname(dst), { recursive: true });
  await fs.cp(src, dst, { recursive: true });
}

export async function writeContentCss(root, targetDir, config, options = {}) {
  config ??= await loadConfig(root);
  const css = await buildContentCss(root, config, options);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, "content.css"), css, "utf8");
}

export async function buildContentCss(root, config, options = {}) {
  config ??= await loadConfig(root);
  const parts = [];

  if (options.includeFrameworkCss !== false) {
    // Always prepend framework-owned CSS (not overridable by workspace).
    for (const pkgPath of FRAMEWORK_CSS_PATHS) {
      let css;
      try {
        css = await fs.readFile(pkgPath, "utf8");
      } catch {
        continue;
      }
      parts.push(`/* === framework/${pkgPath.pathname.split("/").slice(-2).join("/")} === */\n`);
      parts.push(css.trimEnd());
      parts.push("\n\n");
    }
  }
  const themeRoots = uniquePaths([
    ...(options.discoverPressThemes === false ? [] : await discoverPressChildRoots(config.paths.documentRoot, "theme")),
    ...(options.themeRoots ?? []),
  ]);
  for (const themeRoot of themeRoots) {
    await appendCssDirectory(parts, themeRoot, documentRelativeLabel(themeRoot, config.paths.documentRoot));
  }
  if (options.includeKatexCss !== false) {
    parts.push("/* === engine/katex.css === */\n");
    parts.push((await readKatexCss()).trimEnd());
    parts.push("\n\n");
  }
  return parts.join("");
}

export async function writeComponentsCss(root, targetDir, config, options = {}) {
  config ??= await loadConfig(root);
  const css = await buildComponentsCss(root, config, options);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, "components.css"), css, "utf8");
}

export async function buildComponentsCss(root, config, options = {}) {
  config ??= await loadConfig(root);
  const parts = [];
  const componentRoots = uniquePaths([
    config.paths.componentsDir,
    ...(options.discoverPressComponents === false ? [] : await discoverPressChildRoots(config.paths.documentRoot, "components")),
    ...(options.componentRoots ?? []),
  ]);
  for (const componentsDir of componentRoots) {
    await appendComponentScopedCss(parts, componentsDir, documentRelativeLabel(componentsDir, config.paths.documentRoot));
  }
  return parts.join("");
}

async function appendCssDirectory(parts, directory, labelPrefix, options = {}) {
  let entries;
  try {
    entries = await fs.readdir(directory);
  } catch {
    return;
  }
  for (const name of entries.filter((entry) => entry.endsWith(".css")).sort()) {
    if (options.exclude?.has(name)) continue;
    parts.push(`/* === ${labelPrefix}/${name} === */\n`);
    parts.push((await fs.readFile(path.join(directory, name), "utf8")).trimEnd());
    parts.push("\n\n");
  }
}

async function appendComponentScopedCss(parts, componentsDir, labelPrefix = "components") {
  let entries;
  try {
    entries = await fs.readdir(componentsDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const cssPath = path.join(componentsDir, entry.name, "style.css");
    let css;
    try {
      css = await fs.readFile(cssPath, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") {
        continue;
      }
      throw error;
    }
    parts.push(`/* === ${labelPrefix}/${entry.name}/style.css === */\n`);
    parts.push(css.trimEnd());
    parts.push("\n\n");
  }
}

async function discoverPressChildRoots(documentRoot, childName) {
  let entries;
  try {
    entries = await fs.readdir(documentRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isDirectory() && entry.name !== "shared" && !entry.name.startsWith("."))
    .map((entry) => path.join(documentRoot, entry.name, childName));
}

function uniquePaths(paths) {
  const out = [];
  const seen = new Set();
  for (const candidate of paths ?? []) {
    if (!candidate) continue;
    const normalized = path.resolve(candidate);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function documentRelativeLabel(filePath, documentRoot) {
  const relative = path.relative(documentRoot, filePath).split(path.sep).join("/");
  return relative && !relative.startsWith("..") ? relative : path.basename(filePath);
}
