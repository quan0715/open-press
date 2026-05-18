import fs from "node:fs/promises";
import path from "node:path";
import { loadQDocConfig } from "./config.mjs";

const REPORT_CSS_LAYERS = [
  "base/page-contract.css",
  "base/typography.css",
  "page-surfaces/cover.css",
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

export async function writeReportCss(root, targetDir, config) {
  config ??= await loadQDocConfig(root);
  const reportAssetsDir = config.paths.themeDir;
  const parts = [];
  for (const relativePath of REPORT_CSS_LAYERS) {
    const cssPath = path.join(reportAssetsDir, relativePath);
    parts.push(`/* === ${relativePath} === */\n`);
    parts.push((await fs.readFile(cssPath, "utf8")).trimEnd());
    parts.push("\n\n");
  }
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, "report.css"), parts.join(""), "utf8");
}

export async function writeComponentsCss(root, targetDir, config) {
  config ??= await loadQDocConfig(root);
  const parts = [];
  await appendCssDirectory(parts, path.join(config.paths.themeDir, "patterns"), "theme/patterns");
  await appendComponentScopedCss(parts, config.paths.componentsDir);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, "components.css"), parts.join(""), "utf8");
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
