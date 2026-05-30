import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { pathIsEmpty } from "./path-is-empty.js";
import { patchPressTitle } from "./metadata.js";

export interface InitOptions {
  target: string;
  title: string | undefined;
  git: boolean;
  install: boolean;
  skills: boolean;
}

const FRAMEWORK_SKILLS_SOURCE = "quan0715/open-press";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PACKAGE_JSON = path.resolve(__dirname, "..", "package.json");

export async function init(options: InitOptions): Promise<void> {
  const target = path.resolve(process.cwd(), options.target);
  await ensureTarget(target);

  const workspaceName = path.basename(target);
  const title = options.title ?? "OpenPress Document";
  const version = await readCliVersion();

  log(`Creating open-press workspace at ${target}`);

  await writeWorkspacePackageJson(target, workspaceName, version);
  await writeWorkspaceGitignore(target);
  await writeStarterPress(target, title);

  if (options.title) {
    const pressEntry = path.join(target, "press", "index.tsx");
    log("Writing title into <Press> in press/index.tsx");
    await patchPressTitle(pressEntry, options.title);
  }

  if (options.skills) {
    log(`Installing framework skills via \`open-press skills add\`…`);
    try {
      await runInTarget(target, "npx", ["-y", "skills@latest", "add", FRAMEWORK_SKILLS_SOURCE]);
    } catch (err) {
      log(`(framework skills install failed; retry later: open-press skills add)`);
      log(`  reason: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    log("Skipping agent skills (--no-skills)");
  }

  if (options.install) {
    log("Installing dependencies (npm install)…");
    await runInTarget(target, "npm", ["install"]);
  } else {
    log("Skipping npm install (--no-install)");
  }

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

async function readCliVersion(): Promise<string> {
  const pkg = JSON.parse(await readFile(CLI_PACKAGE_JSON, "utf8")) as { version?: string };
  return typeof pkg.version === "string" && pkg.version ? pkg.version : "latest";
}

async function writeWorkspacePackageJson(target: string, workspaceName: string, version: string): Promise<void> {
  const pkg = {
    name: workspaceName,
    version: "0.0.0",
    private: true,
    type: "module",
    description: `open-press workspace: ${workspaceName}`,
    scripts: {
      dev: "open-press dev . --renderer react",
      build: "open-press render . --renderer react",
      preview: "open-press preview . --renderer react",
      typecheck: "open-press typecheck .",
      "openpress:image": "open-press image .",
      "openpress:pdf": "open-press pdf .",
      "openpress:deploy": "open-press deploy .",
      "openpress:deploy:dry-run": "open-press deploy . --confirm --dry-run",
      "openpress:skills": "open-press skills update",
    },
    dependencies: {
      "@open-press/core": version,
    },
    devDependencies: {
      "@open-press/cli": version,
      "@types/node": "^25.8.0",
      "@types/react": "^19.2.14",
      "@types/react-dom": "^19.2.3",
      typescript: "^6.0.3",
    },
    openpress: {
      pdf: {
        filename: "document.pdf",
      },
      deploy: {
        adapter: "cloudflare-pages",
        source: ".deploy/openpress",
        projectName: null,
        commitDirty: false,
        requiresConfirmation: true,
      },
    },
  };

  await writeFile(path.join(target, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

async function writeWorkspaceGitignore(target: string): Promise<void> {
  const content = [
    "node_modules/",
    ".DS_Store",
    "*.log",
    "",
    "# OpenPress generated artifacts",
    ".openpress/",
    ".deploy/",
    ".turbo/",
    "dist/",
    "dist-react/",
    "public/openpress/",
    "output/",
    "",
  ].join("\n");
  await writeFile(path.join(target, ".gitignore"), content, "utf8");
}

async function writeStarterPress(target: string, title: string): Promise<void> {
  const pressRoot = path.join(target, "press");
  await mkdir(path.join(pressRoot, "components"), { recursive: true });
  await mkdir(path.join(pressRoot, "media"), { recursive: true });
  await mkdir(path.join(pressRoot, "theme", "base"), { recursive: true });
  await mkdir(path.join(pressRoot, "theme", "page-surfaces"), { recursive: true });
  await mkdir(path.join(pressRoot, "theme", "shell"), { recursive: true });
  await writeFile(path.join(pressRoot, "design.md"), `# ${title}\n\nStarter OpenPress workspace.\n`, "utf8");
  await writeFile(path.join(pressRoot, "media", "README.md"), "# Media\n\nPlace project media here.\n", "utf8");
  await writeFile(
    path.join(pressRoot, "theme", "base", "page-contract.css"),
    `* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  background: #181818;
}

body {
  color: #171717;
  font-family: var(--openpress-font-body, system-ui, sans-serif);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.reader-page {
  background: #ffffff;
}
`,
    "utf8",
  );
  await writeFile(
    path.join(pressRoot, "theme", "base", "typography.css"),
    `h1,
h2,
h3,
p {
  margin: 0;
}

h1 {
  font-family: var(--openpress-font-serif, Georgia, serif);
  font-size: clamp(42px, 8cqw, 72px);
  line-height: 1;
  font-weight: 500;
}

p {
  font-size: clamp(16px, 2cqw, 22px);
  line-height: 1.5;
}

code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
`,
    "utf8",
  );
  await writeFile(
    path.join(pressRoot, "theme", "base", "print.css"),
    `@media print {
  html,
  body {
    background: #ffffff;
  }
}
`,
    "utf8",
  );
  await writeFile(path.join(pressRoot, "theme", "page-surfaces", "cover.css"), "/* Starter cover surface. */\n", "utf8");
  await writeFile(path.join(pressRoot, "theme", "page-surfaces", "back-cover.css"), "/* Starter back-cover surface. */\n", "utf8");
  await writeFile(path.join(pressRoot, "theme", "page-surfaces", "toc.css"), "/* Starter TOC surface. */\n", "utf8");
  await writeFile(path.join(pressRoot, "theme", "shell", "reader-controls.css"), "/* Starter reader controls surface. */\n", "utf8");
  await writeFile(
    path.join(pressRoot, "theme", "tokens.css"),
    `:root {
  --openpress-font-body: system-ui, sans-serif;
  --openpress-font-serif: Georgia, serif;
}
`,
    "utf8",
  );
  await writeFile(
    path.join(pressRoot, "index.tsx"),
    `import { Frame, Press, Workspace } from "@open-press/core";

export default function OpenPressDocument() {
  return (
    <Workspace name="${escapeJsxAttribute(title)}">
      <Press title="${escapeJsxAttribute(title)}">
        <Frame frameKey="cover" role="manuscript.cover">
          <main style={{ padding: "72px", fontFamily: "var(--openpress-font-serif, Georgia, serif)" }}>
            <p style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>OpenPress</p>
            <h1>${escapeText(title)}</h1>
            <p>Edit <code>press/index.tsx</code>, then run <code>npm run dev</code>.</p>
          </main>
        </Frame>
      </Press>
    </Workspace>
  );
}
`,
    "utf8",
  );
}

function escapeJsxAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeText(value: string): string {
  return value.replace(/{/g, "&#123;").replace(/}/g, "&#125;").replace(/</g, "&lt;");
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

  if (!options.skills) {
    lines.push("  npm run openpress:skills");
  }

  lines.push(
    "",
    "  # start the workbench:",
    "  npm run dev",
    "",
    "Then open the local URL printed by Vite (typically http://127.0.0.1:5173/workspace).",
    "",
    "Use an OpenPress-ready skill to add or adapt the press source tree.",
    "",
  );

  process.stdout.write(lines.join("\n"));
}
