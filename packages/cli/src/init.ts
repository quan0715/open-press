import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { pathIsEmpty } from "./degit.js";
import { patchOpenpressConfig, patchPackageJsonName } from "./metadata.js";

export interface InitOptions {
  target: string;
  pack: string | undefined;
  title: string | undefined;
  subtitle: string | undefined;
  organization: string | undefined;
  author: string | undefined;
  git: boolean;
  install: boolean;
  force: boolean;
}

const KNOWN_PACKS = ["editorial-monograph", "claude-document"];

// dist/cli.js → ../template/{core,skills}
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_ROOT = path.resolve(__dirname, "..", "template");
const TEMPLATE_CORE = path.join(TEMPLATE_ROOT, "core");
const TEMPLATE_SKILLS = path.join(TEMPLATE_ROOT, "skills");

export async function init(options: InitOptions): Promise<void> {
  validatePack(options.pack);
  ensureTemplateBundled();
  const target = path.resolve(process.cwd(), options.target);
  await ensureTarget(target, options.force);

  log(`Creating open-press workspace at ${target}`);

  // 1. Copy framework baseline.
  log("Copying framework (engine + runtime + config)…");
  await cp(TEMPLATE_CORE, target, { recursive: true });

  // 2. Apply style pack starter into document/, if requested.
  const docDest = path.join(target, "document");
  if (options.pack) {
    log(`Applying style pack: ${options.pack}`);
    await rm(docDest, { recursive: true, force: true });
    await mkdir(docDest, { recursive: true });
    const packStarter = path.join(TEMPLATE_SKILLS, options.pack, "starter", "document");
    if (!existsSync(packStarter)) {
      throw new Error(`Style pack starter not found: ${packStarter}`);
    }
    await cp(packStarter, docDest, { recursive: true });
  } else {
    // No pack → ensure document/ exists but empty.
    await mkdir(docDest, { recursive: true });
  }

  // 3. Install SKILL files for Claude Code + Codex.
  log("Installing SKILL files…");
  await installSkills(target);

  // 4. Patch package.json name (workspace, not framework).
  const pkgPath = path.join(target, "package.json");
  if (existsSync(pkgPath)) {
    await patchPackageJsonName(pkgPath, path.basename(target));
  }

  // 5. Patch openpress.config.mjs metadata.
  const configPath = path.join(target, "openpress.config.mjs");
  if (existsSync(configPath) && hasMetadata(options)) {
    log("Writing metadata into openpress.config.mjs");
    await patchOpenpressConfig(configPath, {
      title: options.title,
      subtitle: options.subtitle,
      organization: options.organization,
      author: options.author,
    });
  }

  // 6. Install dependencies.
  if (options.install) {
    log("Installing dependencies (npm install)…");
    await runInTarget(target, "npm", ["install"]);
  } else {
    log("Skipping npm install (--no-install)");
  }

  // 7. Git init.
  if (options.git) {
    log("Initializing git repository…");
    try {
      await runInTarget(target, "git", ["init"]);
      await runInTarget(target, "git", ["add", "-A"]);
      await runInTarget(target, "git", ["commit", "-m", "Initial commit from open-press"], { silent: true });
    } catch {
      log("(git not available; skipping repo init)");
    }
  } else {
    log("Skipping git init (--no-git)");
  }

  printNextSteps(target, options);
}

async function installSkills(target: string): Promise<void> {
  const skillDirs = await readdir(TEMPLATE_SKILLS, { withFileTypes: true });
  const claudeRoot = path.join(target, ".claude", "skills");
  const agentsRoot = path.join(target, ".agents", "skills");
  await mkdir(claudeRoot, { recursive: true });
  await mkdir(agentsRoot, { recursive: true });

  for (const dir of skillDirs) {
    if (!dir.isDirectory()) continue;
    const source = path.join(TEMPLATE_SKILLS, dir.name);
    // Copy SKILL.md + references/ (skip starter/, agents/ etc.)
    const claudeTarget = path.join(claudeRoot, dir.name);
    const agentsTarget = path.join(agentsRoot, dir.name);
    await copySkillFiles(source, claudeTarget);
    await copySkillFiles(source, agentsTarget);
  }
}

async function copySkillFiles(source: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    // Skip pack starter content and agent-specific subdirs.
    if (entry.name === "starter" || entry.name === "agents") continue;
    const from = path.join(source, entry.name);
    const to = path.join(dest, entry.name);
    await cp(from, to, { recursive: true });
  }
}

function ensureTemplateBundled(): void {
  if (!existsSync(TEMPLATE_CORE) || !existsSync(TEMPLATE_SKILLS)) {
    throw new Error(
      `Template not bundled at ${TEMPLATE_ROOT}. If running from source, run \`pnpm sync:template\` in packages/cli first.`,
    );
  }
}

function validatePack(pack: string | undefined): void {
  if (pack === undefined) return;
  if (!KNOWN_PACKS.includes(pack)) {
    throw new Error(`Unknown style pack: ${pack}. Known packs: ${KNOWN_PACKS.join(", ")}`);
  }
}

async function ensureTarget(target: string, force: boolean): Promise<void> {
  if (existsSync(target)) {
    if (force) return;
    const empty = await pathIsEmpty(target);
    if (!empty) {
      throw new Error(`Target ${target} is not empty. Pass --force to scaffold into it anyway.`);
    }
    return;
  }
  await mkdir(target, { recursive: true });
}

function hasMetadata(options: InitOptions): boolean {
  return Boolean(options.title || options.subtitle || options.organization || options.author);
}

async function runInTarget(
  cwd: string,
  command: string,
  args: string[],
  opts: { silent?: boolean } = {},
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: opts.silent ? ["ignore", "ignore", "ignore"] : "inherit",
      shell: process.platform === "win32",
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

function log(message: string): void {
  process.stdout.write(`▸ ${message}\n`);
}

function printNextSteps(target: string, options: InitOptions): void {
  const rel = path.relative(process.cwd(), target) || ".";
  const lines = [
    "",
    "✓ Done! Your open-press workspace is ready.",
    "",
    "Next steps:",
    `  cd ${rel}`,
  ];

  if (!options.install) {
    lines.push("  npm install");
  }

  lines.push(
    "",
    "  # start the workbench:",
    "  npm run dev",
    "",
    "Then open the local URL printed by vite (typically http://127.0.0.1:5173/?dev=1).",
    "",
    "AI agent skills are installed under .claude/skills/ and .agents/skills/.",
    "Edit content under document/chapters/, or ask your AI agent to help.",
    "",
  );

  process.stdout.write(lines.join("\n"));
}
