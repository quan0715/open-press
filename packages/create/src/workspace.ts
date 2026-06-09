import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { pathIsEmpty } from "./path-is-empty.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OWN_PACKAGE_JSON = path.resolve(__dirname, "..", "package.json");

export async function ensureTarget(target: string): Promise<void> {
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

export async function writeWorkspaceFiles(target: string, workspaceName: string): Promise<void> {
  const version = await readOwnVersion();
  await writeWorkspacePackageJson(target, workspaceName, version);
  await writeWorkspaceGitignore(target);
  await writeWorkspaceDesignDoc(target, workspaceName);
}

async function readOwnVersion(): Promise<string> {
  const pkg = JSON.parse(await readFile(OWN_PACKAGE_JSON, "utf8")) as { version?: string };
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
      "openpress:skills": "open-press skills:sync",
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
      pdf: { filename: "document.pdf" },
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

async function writeWorkspaceDesignDoc(target: string, workspaceName: string): Promise<void> {
  const pressRoot = path.join(target, "press");
  await mkdir(pressRoot, { recursive: true });
  const content = `# ${workspaceName} design

This workspace uses source-based slide authoring.

- Keep \`press.tsx\` as the ordered index of self-closing \`<Slide id />\` markers.
- Put slide content in \`press/${workspaceName}/slides/<id>/slide.tsx\`.
- Put reusable slide UI in \`press/${workspaceName}/components/\` or \`press/shared/\`.
- Update this file when visual rules, layout conventions, or agent constraints change.
`;
  await writeFile(path.join(pressRoot, "design.md"), content, "utf8");
}

export async function runInTarget(
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
