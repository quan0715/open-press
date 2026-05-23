import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

export async function optimizePdfMediaForStaticRoot(staticRoot) {
  await optimizePdfMedia(path.join(staticRoot, "openpress", "media"));
}

async function optimizePdfMedia(mediaDir) {
  const files = await listImageFiles(mediaDir);
  for (const file of files) {
    const stat = await fs.stat(file);
    if (stat.size < 320 * 1024) continue;

    const ext = path.extname(file).toLowerCase();
    const args =
      ext === ".jpg" || ext === ".jpeg"
        ? ["-Z", "1600", "--setProperty", "formatOptions", "78", file, "--out", file]
        : ["-Z", "1600", file, "--out", file];
    const result = spawnSync("sips", args, { stdio: "ignore" });
    if (result.status !== 0) {
      console.warn(`[pdf] skipped image optimization: ${path.basename(file)}`);
    }
  }
}

async function listImageFiles(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listImageFiles(fullPath)));
    } else if (/\.(jpe?g|png)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}
