import process from "node:process";
import { init, type InitOptions } from "./init.js";

const HELP = `open-press — AI-first fixed-layout document workspaces.

Usage:
  npx @open-press/cli init <target> [flags]

Flags:
  --title <s>              Document title (written into <Press title="..."> in press/index.tsx)
  --no-git                 Skip git init
  --no-install             Skip npm install
  --help                   Show this help

Examples:
  npx @open-press/cli init my-doc
  npx @open-press/cli init my-brief --title "Q2 Brief"
`;

async function main(argv: string[]): Promise<number> {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(HELP);
    return 0;
  }

  const [subcommand, ...rest] = argv;
  if (subcommand !== "init") {
    process.stderr.write(`Unknown command: ${subcommand}\n\n`);
    process.stderr.write(HELP);
    return 1;
  }

  const options = parseInitArgs(rest);
  if (!options) {
    process.stderr.write(HELP);
    return 1;
  }

  try {
    await init(options);
    return 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`open-press init failed: ${msg}\n`);
    return 1;
  }
}

function parseInitArgs(args: string[]): InitOptions | null {
  if (args.length === 0) {
    process.stderr.write("open-press init: target path is required.\n\n");
    return null;
  }

  const options: InitOptions = {
    target: "",
    title: undefined,
    git: true,
    install: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--title":
        options.title = args[++i];
        break;
      case "--no-git":
        options.git = false;
        break;
      case "--no-install":
        options.install = false;
        break;
      case "--git":
        options.git = true;
        break;
      case "--install":
        options.install = true;
        break;
      default:
        if (arg.startsWith("--")) {
          process.stderr.write(`Unknown flag: ${arg}\n\n`);
          return null;
        }
        if (options.target) {
          process.stderr.write(`Unexpected positional: ${arg}\n\n`);
          return null;
        }
        options.target = arg;
    }
  }

  if (!options.target) {
    process.stderr.write("open-press init: target path is required.\n\n");
    return null;
  }

  return options;
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => {
    process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
    process.exit(1);
  });
