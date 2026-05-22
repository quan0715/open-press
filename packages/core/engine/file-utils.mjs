import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "./config.mjs";
import { readKatexCss } from "./katex-assets.mjs";

const CONTENT_CSS_LAYERS = [
  "base/page-contract.css",
  "base/typography.css",
  "page-surfaces/cover.css",
  { path: "page-surfaces/chapter-opener.css", optional: true },
  "page-surfaces/back-cover.css",
  "page-surfaces/toc.css",
  "shell/reader-controls.css",
  "base/print.css",
];

export async function copyDirectory(src, dst) {
  await fs.rm(dst, { recursive: true, force: true });
  await fs.mkdir(path.dirname(dst), { recursive: true });
  await fs.cp(src, dst, { recursive: true });
}

export async function writeContentCss(root, targetDir, config) {
  config ??= await loadConfig(root);
  const css = await buildContentCss(root, config);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, "content.css"), css, "utf8");
}

export async function buildContentCss(root, config) {
  config ??= await loadConfig(root);
  const contentAssetsDir = config.paths.themeDir;
  const parts = [];
  for (const layer of CONTENT_CSS_LAYERS) {
    const relativePath = typeof layer === "string" ? layer : layer.path;
    const cssPath = path.join(contentAssetsDir, relativePath);
    let css;
    try {
      css = await fs.readFile(cssPath, "utf8");
    } catch (error) {
      if (typeof layer !== "string" && layer.optional && error.code === "ENOENT") continue;
      throw error;
    }
    parts.push(`/* === ${relativePath} === */\n`);
    parts.push(css.trimEnd());
    parts.push("\n\n");
  }
  parts.push("/* === engine/katex.css === */\n");
  parts.push((await readKatexCss()).trimEnd());
  parts.push("\n\n");
  return parts.join("");
}

export async function writeComponentsCss(root, targetDir, config) {
  config ??= await loadConfig(root);
  const css = await buildComponentsCss(root, config);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, "components.css"), css, "utf8");
}

export async function buildComponentsCss(root, config) {
  config ??= await loadConfig(root);
  const parts = [];
  await appendCssDirectory(parts, path.join(config.paths.themeDir, "patterns"), "theme/patterns");
  await appendComponentScopedCss(parts, config.paths.componentsDir);
  return parts.join("");
}

async function appendCssDirectory(parts, directory, labelPrefix) {
  let entries;
  try {
    entries = await fs.readdir(directory);
  } catch {
    return;
  }
  for (const name of entries.filter((entry) => entry.endsWith(".css")).sort()) {
    parts.push(`/* === ${labelPrefix}/${name} === */\n`);
    parts.push((await fs.readFile(path.join(directory, name), "utf8")).trimEnd());
    parts.push("\n\n");
  }
}

async function appendComponentScopedCss(parts, componentsDir) {
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
    parts.push(`/* === components/${entry.name}/style.css === */\n`);
    parts.push(css.trimEnd());
    parts.push("\n\n");
  }
}
