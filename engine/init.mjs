import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SELF_DIR = path.dirname(fileURLToPath(import.meta.url));
const ENGINE_ROOT = path.resolve(SELF_DIR, "..");
const SKILLS_DIR = path.join(ENGINE_ROOT, "skills");

const DEFAULT_SKILL = "editorial-monograph";

export async function initWorkspace({ target, skill = DEFAULT_SKILL, force = false }) {
  if (!target) throw new Error("qdoc init: target path is required");
  const targetPath = path.resolve(target);

  const starterPath = path.join(SKILLS_DIR, skill, "starter");
  try {
    const stat = await fs.stat(starterPath);
    if (!stat.isDirectory()) {
      throw new Error(`qdoc init: skill "${skill}" has no starter/ directory at ${starterPath}`);
    }
  } catch (error) {
    if (error?.code === "ENOENT") {
      const available = await listStylePackSkills();
      throw new Error(
        `qdoc init: skill "${skill}" not found or has no starter. ` +
        `Available style packs: ${available.join(", ") || "(none)"}`,
      );
    }
    throw error;
  }

  if (!force) {
    try {
      const stat = await fs.stat(targetPath);
      if (stat.isDirectory()) {
        const entries = await fs.readdir(targetPath);
        if (entries.length > 0) {
          throw new Error(`qdoc init: target ${targetPath} exists and is not empty. Pass --force to overwrite.`);
        }
      } else {
        throw new Error(`qdoc init: target ${targetPath} exists and is not a directory.`);
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  await fs.mkdir(targetPath, { recursive: true });
  await copyDirectory(starterPath, targetPath);

  return { targetPath, skill };
}

export async function listStylePackSkills() {
  try {
    const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
    const names = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const starter = path.join(SKILLS_DIR, entry.name, "starter");
      try {
        const stat = await fs.stat(starter);
        if (stat.isDirectory()) names.push(entry.name);
      } catch {
        // skill without starter/ is not a style pack — skip
      }
    }
    return names.sort();
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function copyDirectory(source, destination) {
  await fs.mkdir(destination, { recursive: true });
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
    const sourcePath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destPath);
    } else if (entry.isFile()) {
      await fs.copyFile(sourcePath, destPath);
    } else if (entry.isSymbolicLink()) {
      const link = await fs.readlink(sourcePath);
      await fs.symlink(link, destPath);
    }
  }
}
