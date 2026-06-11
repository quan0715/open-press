import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../runtime/config.mjs";
import { writeComponentsCss, writeContentCss } from "../runtime/file-utils.mjs";
import { copyThemeFonts } from "./fonts.mjs";
import { copyKatexFonts } from "./katex-assets.mjs";

export async function syncPublicAssets(root, publicOutputDir, config, options = {}) {
  config ??= await loadConfig(root);
  await fs.rm(path.join(publicOutputDir, "report.css"), { force: true });
  await copyOptionalFile(path.join(config.paths.themeDir, "tokens.css"), path.join(publicOutputDir, "tokens.css"), {
    fallback: "",
  });
  await writeContentCss(root, publicOutputDir, config, { discoverPressThemes: false });
  await copyThemeFonts(root, publicOutputDir, config);
  await copyKatexFonts(publicOutputDir);
  await writeComponentsCss(root, publicOutputDir, config, { discoverPressComponents: false });
  for (const press of options.presses ?? []) {
    const pressOutputDir = path.join(publicOutputDir, press.slug);
    await writeContentCss(root, pressOutputDir, config, {
      themeRoots: press.themeRoots,
      discoverPressThemes: false,
    });
    await writeComponentsCss(root, pressOutputDir, config, {
      componentRoots: press.componentRoots,
      discoverPressComponents: false,
    });
  }
  await copyMediaRoots(options.mediaRoots ?? [config.paths.mediaDir], path.join(publicOutputDir, "media"));
}

async function copyOptionalFile(src, dst, options = {}) {
  try {
    await fs.copyFile(src, dst);
  } catch (error) {
    if (error?.code === "ENOENT") {
      if (typeof options.fallback === "string") {
        await fs.mkdir(path.dirname(dst), { recursive: true });
        await fs.writeFile(dst, options.fallback, "utf8");
      }
      return;
    }
    throw error;
  }
}

async function copyMediaRoots(mediaRoots, dst) {
  await fs.rm(dst, { recursive: true, force: true });
  await fs.mkdir(dst, { recursive: true });
  for (const mediaRoot of uniquePaths(mediaRoots)) {
    try {
      await fs.cp(mediaRoot, dst, { recursive: true, force: true });
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
  }
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
