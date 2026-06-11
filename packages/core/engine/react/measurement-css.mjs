import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildComponentsCss, buildContentCss } from "../runtime/file-utils.mjs";
import { pageGeometryToTheme, normalizePageGeometry } from "../runtime/page-geometry.mjs";
import { buildSectionScopedCss } from "./section-css.mjs";

const require = createRequire(import.meta.url);

export async function buildReactMeasurementCss(root, config, workspace, options = {}) {
  const parts = [];
  await appendOptionalFile(parts, path.join(config.paths.themeDir, "fonts.css"), "theme/fonts.css");
  await appendOptionalFile(parts, path.join(config.paths.themeDir, "tokens.css"), "theme/tokens.css");
  appendPageGeometryCss(parts, config.page);
  parts.push("/* === public/openpress/content.css === */\n");
  parts.push(await buildContentCss(root, config, {
    themeRoots: options.themeRoots,
    discoverPressThemes: options.discoverPressThemes,
  }));
  parts.push("\n/* === public/openpress/components.css === */\n");
  parts.push(await buildComponentsCss(root, config, {
    componentRoots: options.componentRoots,
    discoverPressComponents: options.discoverPressComponents,
  }));
  const chapterCss = await buildSectionScopedCss(workspace);
  if (chapterCss.trim()) {
    parts.push("\n/* === public/openpress/chapter-scoped.css === */\n");
    parts.push(chapterCss);
  }
  return rewriteAssetUrls(stripViewportMediaQueries(parts.join("\n")), config);
}

function appendPageGeometryCss(parts, page) {
  const theme = pageGeometryToTheme(page ?? normalizePageGeometry("a4"));
  if (!theme) return;

  const declarations = [
    ["--openpress-page-width", theme.pageWidth],
    ["--openpress-page-height", theme.pageHeight],
    ["--openpress-page-aspect-ratio", theme.pageAspectRatio],
    ["--openpress-page-height-ratio", theme.pageHeightRatio],
  ].filter(([, value]) => value);

  parts.push("/* === openpress page geometry === */\n");
  parts.push(":root {\n");
  for (const [name, value] of declarations) {
    parts.push(`  ${name}: ${value};\n`);
  }
  parts.push("}\n\n");
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

function rewriteAssetUrls(css, config) {
  const themeFontsDir = pathToFileURL(path.join(config.paths.themeDir, "fonts") + path.sep).href;
  const katexFont = require.resolve("katex/dist/fonts/KaTeX_Main-Regular.woff2");
  const katexFontsDir = pathToFileURL(path.dirname(katexFont) + path.sep).href;
  return css
    .replace(/url\((["'])?\/openpress\/fonts\//g, `url($1${themeFontsDir}`)
    .replace(/url\((["'])?\/openpress\/katex-fonts\//g, `url($1${katexFontsDir}`);
}

function stripViewportMediaQueries(css) {
  let output = "";
  let cursor = 0;

  while (cursor < css.length) {
    const mediaIndex = css.indexOf("@media", cursor);
    if (mediaIndex < 0) {
      output += css.slice(cursor);
      break;
    }

    output += css.slice(cursor, mediaIndex);
    const blockStart = css.indexOf("{", mediaIndex);
    if (blockStart < 0) {
      output += css.slice(mediaIndex);
      break;
    }

    const prelude = css.slice(mediaIndex + "@media".length, blockStart);
    const blockEnd = findCssBlockEnd(css, blockStart);
    if (blockEnd < 0) {
      output += css.slice(mediaIndex);
      break;
    }

    if (!isViewportMediaPrelude(prelude)) {
      output += css.slice(mediaIndex, blockEnd + 1);
    }
    cursor = blockEnd + 1;
  }

  return output;
}

function isViewportMediaPrelude(prelude) {
  if (/\bprint\b/i.test(prelude)) return false;
  return /\(\s*(?:min-|max-)?(?:device-)?(?:width|height)\s*:/i.test(prelude)
    || /\(\s*orientation\s*:/i.test(prelude)
    || /\(\s*(?:min-|max-)?aspect-ratio\s*:/i.test(prelude);
}

function findCssBlockEnd(css, blockStart) {
  let depth = 0;
  let quote = "";
  let inComment = false;

  for (let index = blockStart; index < css.length; index += 1) {
    const current = css[index];
    const next = css[index + 1];

    if (inComment) {
      if (current === "*" && next === "/") {
        inComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (current === "\\") {
        index += 1;
        continue;
      }
      if (current === quote) quote = "";
      continue;
    }

    if (current === "/" && next === "*") {
      inComment = true;
      index += 1;
      continue;
    }

    if (current === "\"" || current === "'") {
      quote = current;
      continue;
    }

    if (current === "{") {
      depth += 1;
      continue;
    }

    if (current === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}
