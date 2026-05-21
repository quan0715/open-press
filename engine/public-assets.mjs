import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "./config.mjs";
import { copyDirectory, writeComponentsCss, writeReportCss } from "./file-utils.mjs";
import { copyThemeFonts } from "./fonts.mjs";
import { copyKatexFonts } from "./katex-assets.mjs";

export async function syncPublicAssets(root, publicOutputDir, config) {
  config ??= await loadConfig(root);
  for (const name of ["tokens.css"]) {
    await fs.copyFile(path.join(config.paths.themeDir, name), path.join(publicOutputDir, name));
  }
  await writeReportCss(root, publicOutputDir, config);
  await copyThemeFonts(root, publicOutputDir, config);
  await copyKatexFonts(publicOutputDir);
  await writeComponentsCss(root, publicOutputDir, config);
  await copyDirectory(config.paths.mediaDir, path.join(publicOutputDir, "media"));
}
