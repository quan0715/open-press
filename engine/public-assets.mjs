import fs from "node:fs/promises";
import path from "node:path";
import { loadQDocConfig } from "./config.mjs";
import { writeDesignSystemPublicJson } from "./design-system.mjs";
import { copyDirectory, writeComponentsCss, writeReportCss } from "./file-utils.mjs";
import { copyWorkspaceFonts } from "./fonts.mjs";

export async function syncQdocPublicAssets(root, publicQdoc, config) {
  config ??= await loadQDocConfig(root);
  for (const name of ["tokens.css"]) {
    await fs.copyFile(path.join(config.paths.themeDir, name), path.join(publicQdoc, name));
  }
  await writeReportCss(root, publicQdoc, config);
  await copyWorkspaceFonts(root, publicQdoc, config);
  await writeComponentsCss(root, publicQdoc, config);
  await writeDesignSystemPublicJson(root, publicQdoc, config);
  await copyDirectory(config.paths.mediaDir, path.join(publicQdoc, "media"));
}
