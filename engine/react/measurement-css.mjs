import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildComponentsCss, buildReportCss } from "../file-utils.mjs";
import { buildChapterScopedCss } from "./chapter-css.mjs";

const require = createRequire(import.meta.url);

export async function buildReactMeasurementCss(root, config, workspace) {
  const parts = [];
  await appendOptionalFile(parts, path.join(config.paths.themeDir, "fonts.css"), "theme/fonts.css");
  await appendOptionalFile(parts, path.join(config.paths.themeDir, "tokens.css"), "theme/tokens.css");
  parts.push("/* === public/qdoc/report.css === */\n");
  parts.push(await buildReportCss(root, config));
  parts.push("\n/* === public/qdoc/components.css === */\n");
  parts.push(await buildComponentsCss(root, config));
  const chapterCss = await buildChapterScopedCss(workspace);
  if (chapterCss.trim()) {
    parts.push("\n/* === public/qdoc/chapter-scoped.css === */\n");
    parts.push(chapterCss);
  }
  return rewriteQDocAssetUrls(parts.join("\n"), config);
}

async function appendOptionalFile(parts, filePath, label) {
  try {
    const css = await fs.readFile(filePath, "utf8");
    parts.push(`/* === ${label} === */\n`);
    parts.push(css.trimEnd());
    parts.push("\n");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function rewriteQDocAssetUrls(css, config) {
  const themeFontsDir = pathToFileURL(path.join(config.paths.themeDir, "fonts") + path.sep).href;
  const katexFont = require.resolve("katex/dist/fonts/KaTeX_Main-Regular.woff2");
  const katexFontsDir = pathToFileURL(path.dirname(katexFont) + path.sep).href;
  return css
    .replace(/url\((["'])?\/qdoc\/fonts\//g, `url($1${themeFontsDir}`)
    .replace(/url\((["'])?\/qdoc\/katex-fonts\//g, `url($1${katexFontsDir}`);
}
