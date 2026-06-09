import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { create, type CreateOptions } from "./create.js";

const require = createRequire(import.meta.url);

const HELP = `open-press — AI-first fixed-layout document workspaces.

Usage:
  open-press create <name> --type slides [--title <s>]
  open-press <command> [path] [options]
  open-press skills <add|update> [--source <owner/repo>]

Create flags:
  --type slides            Required. Scaffold a slides Press under press/<name>/
  --title <s>              Document title (written into <Press title="...">)
  --help                   Show this help

Runtime commands:
  dev                      Start the local OpenPress workbench
  render                   Build the static reader
  preview                  Preview the static reader
  image                    Export pages to PNG
  pdf                      Export pages to PDF
  validate                 Validate source structure
  inspect                  Inspect rendered output
  search                   Search workspace source
  replace                  Replace workspace source text
  doctor                   Check package and skill freshness
  upgrade                  Update workspace dependencies and skills
  migrate                  Alias for upgrade
  skills                   Refresh OpenPress agent skills

Examples:
  npm create @open-press my-deck -- --type slides
  npx open-press create my-slides --type slides
  npx open-press dev .
  npx open-press image .
`;

async function main(argv: string[]): Promise<number> {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(HELP);
    return 0;
  }

  const [subcommand, ...rest] = argv;
  if (subcommand === "create") {
    const options = parseCreateArgs(rest);
    if (!options) {
      process.stderr.write(HELP);
      return 1;
    }

    try {
      await create(process.cwd(), options);
      return 0;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`open-press create failed: ${msg}\n`);
      return 1;
    }
  }

  if (subcommand === "skills") {
    return delegateToCore(normalizeSkillsArgs(rest));
  }

  return delegateToCore([subcommand, ...rest]);
}

function parseCreateArgs(args: string[]): CreateOptions | null {
  if (args.length === 0) {
    process.stderr.write("open-press create: <name> is required.\n\n");
    return null;
  }

  const options: CreateOptions = {
    name: "",
    type: undefined,
    title: undefined,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--title":
        options.title = args[++i];
        break;
      case "--type": {
        const type = args[++i];
        if (type !== "pages" && type !== "slides") {
          process.stderr.write(`Invalid --type: ${type}. Expected "slides".\n\n`);
          return null;
        }
        options.type = type;
        break;
      }
      default:
        if (arg.startsWith("--")) {
          process.stderr.write(`Unknown flag: ${arg}\n\n`);
          return null;
        }
        if (options.name) {
          process.stderr.write(`Unexpected positional: ${arg}\n\n`);
          return null;
        }
        options.name = arg;
    }
  }

  if (!options.name) {
    process.stderr.write("open-press create: <name> is required.\n\n");
    return null;
  }

  return options;
}

function normalizeSkillsArgs(args: string[]): string[] {
  const [subcommand, ...rest] = args;
  if (!subcommand || subcommand === "add" || subcommand === "update") {
    return ["skills:sync", ...rest];
  }
  return ["skills:sync", subcommand, ...rest];
}

async function delegateToCore(args: string[]): Promise<number> {
  const coreCli = resolveCoreCli();
  return new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, [coreCli, ...args], {
      cwd: process.cwd(),
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });
}

function resolveCoreCli(): string {
  const coreEntry = require.resolve("@open-press/core");
  const coreRoot = findPackageRoot(coreEntry, "@open-press/core");
  return path.join(coreRoot, "engine", "cli.mjs");
}

function findPackageRoot(startPath: string, packageName: string): string {
  let dir = path.dirname(startPath);
  while (true) {
    const pkgPath = path.join(dir, "package.json");
    try {
      const pkg = require(pkgPath) as { name?: string };
      if (pkg.name === packageName) return dir;
    } catch {
      // keep walking up
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`Could not find ${packageName} package root from ${startPath}`);
    }
    dir = parent;
  }
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => {
    process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
    process.exit(1);
  });
