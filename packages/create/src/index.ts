import path from "node:path";
import process from "node:process";
import prompts from "prompts";
import { writeSlidesPress } from "./slides-template.js";
import { ensureTarget, runInTarget, writeWorkspaceFiles } from "./workspace.js";

const FRAMEWORK_SKILLS_SOURCE = "quan0715/open-press";

interface CreateOptions {
  target: string;
  type: "slides";
  title: string | undefined;
  install: boolean;
  skills: boolean;
  git: boolean;
}

async function main(argv: string[]): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return 0;
  }

  let target = argv.find((a) => !a.startsWith("--")) ?? "";
  let type = parseFlag(argv, "--type") as "slides" | "pages" | undefined;
  const title = parseFlag(argv, "--title");
  const noInstall = argv.includes("--no-install");
  const noSkills = argv.includes("--no-skills");
  const noGit = argv.includes("--no-git");

  if (!target) {
    const res = await prompts({
      type: "text",
      name: "target",
      message: "Project name:",
      validate: (value: string) => (value.trim() ? true : "Name is required"),
    });
    if (!res.target) return 1;
    target = res.target as string;
  }

  if (!type) {
    const res = await prompts({
      type: "select",
      name: "type",
      message: "Press type:",
      choices: [
        { title: "Slides (16:9 deck)", value: "slides" },
        { title: "Pages (not yet supported)", value: "pages", disabled: true },
      ],
    });
    if (!res.type) return 1;
    type = res.type as "slides" | "pages";
  }

  if (type === "pages") {
    process.stderr.write("--type pages is not yet supported. Use --type slides.\n");
    return 1;
  }

  const opts: CreateOptions = {
    target,
    type,
    title,
    install: !noInstall,
    skills: !noSkills,
    git: !noGit,
  };

  return run(opts);
}

async function run(opts: CreateOptions): Promise<number> {
  const targetPath = path.resolve(process.cwd(), opts.target);
  const workspaceName = path.basename(targetPath);
  const pressRoot = path.join(targetPath, "press", workspaceName);

  log(`Creating open-press workspace at ${targetPath}`);

  await ensureTarget(targetPath);
  await writeWorkspaceFiles(targetPath, workspaceName);
  await writeSlidesPress(pressRoot, {
    pressName: workspaceName,
    title: opts.title ?? workspaceName,
  });

  if (opts.skills) {
    log("Installing framework skills...");
    try {
      await runInTarget(targetPath, "npx", ["-y", "skills@latest", "add", FRAMEWORK_SKILLS_SOURCE]);
    } catch (err) {
      log("(skills install failed; retry later: open-press skills:sync)");
      log(`  ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (opts.install) {
    log("Installing dependencies (npm install)...");
    await runInTarget(targetPath, "npm", ["install"]);
  }

  if (opts.git) {
    log("Initializing git repository...");
    try {
      await runInTarget(targetPath, "git", ["init"]);
      await runInTarget(targetPath, "git", ["add", "-A"]);
      await runInTarget(targetPath, "git", ["commit", "-m", "Initial commit from @open-press/create"], {
        silent: true,
      });
    } catch {
      log("(git not available; skipping)");
    }
  }

  printNextSteps(targetPath, opts);
  return 0;
}

function parseFlag(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i !== -1 ? argv[i + 1] : undefined;
}

function log(msg: string): void {
  process.stdout.write(`> ${msg}\n`);
}

function printHelp(): void {
  process.stdout.write(`npm create @open-press <target> -- --type slides [options]

Options:
  --type slides    Press type (slides only in v1; pages is not yet supported)
  --title <s>      Document title
  --no-install     Skip npm install
  --no-skills      Skip agent skill installation
  --no-git         Skip git init
  --help           Show this help
`);
}

function printNextSteps(target: string, opts: CreateOptions): void {
  const rel = path.relative(process.cwd(), target) || ".";
  const lines = ["", "Done. Your open-press workspace is ready.", "", "Next steps:", `  cd ${rel}`];
  if (!opts.install) lines.push("  npm install");
  if (!opts.skills) lines.push("  open-press skills:sync");
  lines.push("", "  npm run dev", "", "Then open the local URL printed by Vite.", "");
  process.stdout.write(lines.join("\n"));
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => {
    process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
    process.exit(1);
  });
