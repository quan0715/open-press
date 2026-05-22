import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { degit, pathIsEmpty } from "./degit.js";
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

const BUNDLED_PACKS = ["editorial-monograph", "claude-document", "academic-paper"];
const FRAMEWORK_SKILLS_SOURCE = "quan0715/open-press";

type PackSpec =
  | { kind: "bundled"; name: string }
  | { kind: "github"; owner: string; repo: string; ref: string | undefined };

// dist/cli.js → ../template/{core,packs}
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_ROOT = path.resolve(__dirname, "..", "template");
const TEMPLATE_CORE = path.join(TEMPLATE_ROOT, "core");
const TEMPLATE_PACKS = path.join(TEMPLATE_ROOT, "packs");

export async function init(options: InitOptions): Promise<void> {
  const packSpec = options.pack ? parsePackSpec(options.pack) : null;
  ensureTemplateBundled();
  const target = path.resolve(process.cwd(), options.target);
  await ensureTarget(target, options.force);

  log(`Creating open-press workspace at ${target}`);

  // 1. Copy framework baseline (engine, runtime, vite/ts config, base index.html).
  log("Copying framework (engine + runtime + config)…");
  await cp(TEMPLATE_CORE, target, { recursive: true });

  // 2. Apply style pack starter into document/, if requested.
  const docDest = path.join(target, "document");
  await rm(docDest, { recursive: true, force: true });
  await mkdir(docDest, { recursive: true });

  if (packSpec?.kind === "bundled") {
    log(`Applying bundled style pack: ${packSpec.name}`);
    const packStarter = path.join(TEMPLATE_PACKS, packSpec.name, "document");
    if (!existsSync(packStarter)) {
      throw new Error(`Bundled style pack starter not found: ${packStarter}`);
    }
    await cp(packStarter, docDest, { recursive: true });
  } else if (packSpec?.kind === "github") {
    log(`Fetching style pack from github:${packSpec.owner}/${packSpec.repo}${packSpec.ref ? `#${packSpec.ref}` : ""}…`);
    try {
      await degit({
        owner: packSpec.owner,
        repo: packSpec.repo,
        ref: packSpec.ref,
        dest: docDest,
        subdir: "starter/document",
      });
    } catch (err) {
      throw new Error(
        `Failed to fetch pack from github:${packSpec.owner}/${packSpec.repo}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    // GitHub tar extraction silently produces an empty dir if the subdir
    // doesn't exist. Validate that the pack actually shipped what we need.
    if (await pathIsEmpty(docDest)) {
      throw new Error(
        `github:${packSpec.owner}/${packSpec.repo} doesn't contain starter/document/ at the repo root.\n` +
          `Third-party pack repos should follow this layout:\n` +
          `  <repo>/\n` +
          `  ├── starter/\n` +
          `  │   └── document/   ← cli copies this into your workspace's document/\n` +
          `  └── skills/<pack>/SKILL.md   ← npx skills add picks this up`,
      );
    }
  }

  // 3. Patch package.json name + drop framework-distribution fields.
  const pkgPath = path.join(target, "package.json");
  if (existsSync(pkgPath)) {
    await patchPackageJsonName(pkgPath, path.basename(target));
  }

  // 4. Patch openpress.config.mjs metadata.
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

  // 5. Install framework agent skills.
  log(`Installing framework skills via \`npx skills add ${FRAMEWORK_SKILLS_SOURCE}\`…`);
  try {
    await runInTarget(target, "npx", ["-y", "skills@latest", "add", FRAMEWORK_SKILLS_SOURCE]);
  } catch (err) {
    log(`(framework skills install failed; retry: npx skills add ${FRAMEWORK_SKILLS_SOURCE})`);
    log(`  reason: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 5b. For github: packs, also install the pack repo's own SKILL files.
  if (packSpec?.kind === "github") {
    const packSource = `${packSpec.owner}/${packSpec.repo}`;
    log(`Installing pack skills via \`npx skills add ${packSource}\`…`);
    try {
      await runInTarget(target, "npx", ["-y", "skills@latest", "add", packSource]);
    } catch (err) {
      log(`(pack skills install failed; retry: npx skills add ${packSource})`);
      log(`  reason: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 6. Install workspace dependencies.
  if (options.install) {
    log("Installing dependencies (npm install)…");
    await runInTarget(target, "npm", ["install"]);
  } else {
    log("Skipping npm install (--no-install)");
  }

  // 7. Git init + first commit.
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

/**
 * Parse a `--pack` argument into a normalized spec.
 *
 * - `<name>` → bundled pack lookup (must be in BUNDLED_PACKS)
 * - `github:owner/repo` → fetch from GitHub, default branch
 * - `github:owner/repo#ref` → fetch from a specific branch/tag
 */
function parsePackSpec(spec: string): PackSpec {
  if (spec.startsWith("github:")) {
    const rest = spec.slice("github:".length);
    const [pathPart, ref] = rest.split("#");
    const segments = pathPart.split("/").filter(Boolean);
    if (segments.length !== 2) {
      throw new Error(
        `Invalid --pack spec: "${spec}". Use github:owner/repo or github:owner/repo#ref.`,
      );
    }
    const [owner, repo] = segments;
    return { kind: "github", owner, repo, ref: ref?.trim() || undefined };
  }
  if (!BUNDLED_PACKS.includes(spec)) {
    throw new Error(
      `Unknown style pack: "${spec}". ` +
        `Bundled packs: ${BUNDLED_PACKS.join(", ")}. ` +
        `For third-party packs use github:owner/repo (e.g. github:quan0715/openpress-pack-nycu-thesis).`,
    );
  }
  return { kind: "bundled", name: spec };
}

function ensureTemplateBundled(): void {
  if (!existsSync(TEMPLATE_CORE) || !existsSync(TEMPLATE_PACKS)) {
    throw new Error(
      `Template not bundled at ${TEMPLATE_ROOT}. If running from source, run \`pnpm sync:template\` in packages/cli first.`,
    );
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
    "✓ Done. Your open-press workspace is ready.",
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
    "Then open the local URL printed by Vite (typically http://127.0.0.1:5173/?dev=1).",
    "",
    "Agent skills installed under .agents/skills/ (universal — read by Claude Code,",
    `Cursor, Codex, Gemini CLI, etc.). Update later with: npx skills upgrade`,
    "",
    "Edit content under document/chapters/, or ask your AI agent to help.",
    "",
  );

  process.stdout.write(lines.join("\n"));
}
