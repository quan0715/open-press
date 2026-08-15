import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FRAMEWORK_SKILLS_DIR = path.join(ROOT, "skills");
const AGENTS_SKILLS_DIR = path.join(ROOT, ".agents", "skills");
const CLAUDE_SKILLS_DIR = path.join(ROOT, ".claude", "skills");

async function pathExists(p) {
  try {
    await fs.lstat(p);
    return true;
  } catch {
    return false;
  }
}

async function isSymlinkTargetEqual(linkPath, expectedTarget) {
  try {
    const rawTarget = await fs.readlink(linkPath);
    return rawTarget === expectedTarget;
  } catch {
    return false;
  }
}

async function ensureSymlink(linkDir, linkName, targetRelativePath) {
  const linkPath = path.join(linkDir, linkName);
  await fs.mkdir(linkDir, { recursive: true });

  if (await pathExists(linkPath)) {
    if (await isSymlinkTargetEqual(linkPath, targetRelativePath)) {
      return false; // already correct
    }
    // Remove stale file/dir/symlink
    await fs.rm(linkPath, { recursive: true, force: true });
  }

  const symlinkType = process.platform === "win32" ? "junction" : "dir";
  try {
    await fs.symlink(targetRelativePath, linkPath, symlinkType);
  } catch (error) {
    if (process.platform === "win32") {
      // Fallback on Windows if junction with relative path is rejected
      const absoluteTarget = path.resolve(linkDir, targetRelativePath);
      await fs.symlink(absoluteTarget, linkPath, "junction");
    } else {
      throw error;
    }
  }
  return true;
}

export async function syncSkills({ quiet = false } = {}) {
  let linkedFrameworkCount = 0;
  let linkedClaudeCount = 0;

  // 1. Ensure target directories exist
  await fs.mkdir(AGENTS_SKILLS_DIR, { recursive: true });
  await fs.mkdir(CLAUDE_SKILLS_DIR, { recursive: true });

  // 2. Discover framework skills in `skills/`
  if (await pathExists(FRAMEWORK_SKILLS_DIR)) {
    const entries = await fs.readdir(FRAMEWORK_SKILLS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      const skillMd = path.join(FRAMEWORK_SKILLS_DIR, entry.name, "SKILL.md");
      if (!(await pathExists(skillMd))) continue;

      const skillName = entry.name;
      const targetFromAgents = path.relative(AGENTS_SKILLS_DIR, path.join(FRAMEWORK_SKILLS_DIR, skillName));
      const targetFromClaude = path.relative(CLAUDE_SKILLS_DIR, path.join(FRAMEWORK_SKILLS_DIR, skillName));

      const updatedAgent = await ensureSymlink(AGENTS_SKILLS_DIR, skillName, targetFromAgents);
      const updatedClaude = await ensureSymlink(CLAUDE_SKILLS_DIR, skillName, targetFromClaude);

      if (updatedAgent || updatedClaude) {
        linkedFrameworkCount++;
      }
    }
  }

  // 3. Ensure all skills in `.agents/skills` (including 3rd-party) have valid `.claude/skills` links
  const agentEntries = await fs.readdir(AGENTS_SKILLS_DIR, { withFileTypes: true });
  for (const entry of agentEntries) {
    if (entry.name.startsWith(".")) continue;
    const skillName = entry.name;
    const claudePath = path.join(CLAUDE_SKILLS_DIR, skillName);

    // If already linked in step 2 (framework skill), skip
    if (await pathExists(claudePath)) {
      continue;
    }

    const targetFromClaude = path.relative(CLAUDE_SKILLS_DIR, path.join(AGENTS_SKILLS_DIR, skillName));
    const updated = await ensureSymlink(CLAUDE_SKILLS_DIR, skillName, targetFromClaude);
    if (updated) {
      linkedClaudeCount++;
    }
  }

  if (!quiet) {
    console.log(
      `✓ Skills synced: linked ${linkedFrameworkCount} framework skill(s) and repaired ${linkedClaudeCount} Claude agent link(s).`,
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await syncSkills();
  } catch (error) {
    console.error("Failed to sync skills:", error);
    process.exitCode = 1;
  }
}
