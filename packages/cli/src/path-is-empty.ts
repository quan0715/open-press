import { readdir, stat } from "node:fs/promises";

const HARMLESS_TARGET_ENTRIES = new Set([".git", ".gitignore", ".gitkeep", ".DS_Store"]);

export async function pathIsEmpty(
  target: string,
  options: { ignoreHarmless?: boolean } = {},
): Promise<boolean> {
  try {
    const s = await stat(target);
    if (!s.isDirectory()) return false;
    const entries = await readdir(target);
    if (!options.ignoreHarmless) return entries.length === 0;
    return entries.every((entry) => HARMLESS_TARGET_ENTRIES.has(entry));
  } catch {
    return true;
  }
}
