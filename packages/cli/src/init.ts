import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { pathIsEmpty } from "./path-is-empty.js";
import { patchPackageJsonName, patchPressTitle } from "./metadata.js";

export interface InitOptions {
  target: string;
  title: string | undefined;
  git: boolean;
  install: boolean;
}

const FRAMEWORK_SKILLS_SOURCE = "quan0715/open-press";

// dist/cli.js → ../template/core
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_ROOT = path.resolve(__dirname, "..", "template");
const TEMPLATE_CORE = path.join(TEMPLATE_ROOT, "core");

export async function init(options: InitOptions): Promise<void> {
  ensureTemplateBundled();
  const target = path.resolve(process.cwd(), options.target);
  await ensureTarget(target);

  log(`Creating open-press workspace at ${target}`);

  // 1. Copy framework baseline (engine, runtime, vite/ts config, base index.html).
  log("Copying framework (engine + runtime + config)…");
  await cp(TEMPLATE_CORE, target, { recursive: true });

  // 2. Patch package.json name + drop framework-distribution fields.
  const pkgPath = path.join(target, "package.json");
  if (existsSync(pkgPath)) {
    await patchPackageJsonName(pkgPath, path.basename(target));
  }

  // 3. Patch <Press title="..."> in press/index.tsx when the user
  // supplied a title. The 1.0 contract carries metadata via JSX
  // props on Press; the CLI's only metadata responsibility is
  // seeding that one prop. Subtitle / organization / author etc.
  // belong in the workspace's own Cover JSX — outside the CLI's lane.
  if (options.title) {
    const pressEntry = path.join(target, "press", "index.tsx");
    if (existsSync(pressEntry)) {
      log("Writing title into <Press> in press/index.tsx");
      await patchPressTitle(pressEntry, options.title);
    }
  }

  // 4. Install framework agent skills.
  log(`Installing framework skills via \`npx skills add ${FRAMEWORK_SKILLS_SOURCE}\`…`);
  try {
    await runInTarget(target, "npx", ["-y", "skills@latest", "add", FRAMEWORK_SKILLS_SOURCE]);
  } catch (err) {
    log(`(framework skills install failed; retry: npx skills add ${FRAMEWORK_SKILLS_SOURCE})`);
    log(`  reason: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 5. Install workspace dependencies.
  if (options.install) {
    log("Installing dependencies (npm install)…");
    await runInTarget(target, "npm", ["install"]);
  } else {
    log("Skipping npm install (--no-install)");
  }

  // 6. Git init + first commit.
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

function ensureTemplateBundled(): void {
  if (!existsSync(TEMPLATE_CORE)) {
    throw new Error(
      `Template not bundled at ${TEMPLATE_ROOT}. If running from source, run \`pnpm sync:template\` in packages/cli first.`,
    );
  }
}

async function ensureTarget(target: string): Promise<void> {
  if (existsSync(target)) {
    const empty = await pathIsEmpty(target, { ignoreHarmless: true });
    if (!empty) {
      throw new Error(
        `Target ${target} is not empty. Remove existing files first, or scaffold into a different directory.`,
      );
    }
    return;
  }
  await mkdir(target, { recursive: true });
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
    "Use an OpenPress-ready skill to add or adapt the press/document source tree.",
    "",
  );

  process.stdout.write(lines.join("\n"));
}
