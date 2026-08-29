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

export async function writeWorkspaceFiles(
  target: string,
  workspaceName: string,
  type: "pages" | "slides",
): Promise<void> {
  const version = await readOwnVersion();
  await writeWorkspacePackageJson(target, workspaceName, version);
  await writeWorkspaceSettingsFile(target);
  await writeWorkspaceGitignore(target);
  await writeWorkspaceDesignDoc(target, workspaceName, type);
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
      "openpress:word": "open-press word .",
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
  };
  await writeFile(path.join(target, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

async function writeWorkspaceSettingsFile(target: string): Promise<void> {
  const settings = {
    version: 1,
    appearance: {
      colorMode: "dark",
      accent: "amber",
    },
    page: "a4",
    captionNumbering: {
      figure: "Figure",
      table: "Table",
      separator: " ",
    },
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
  };
  const settingsDirectory = path.join(target, "openpress");
  await mkdir(settingsDirectory, { recursive: true });
  await writeFile(
    path.join(settingsDirectory, "settings.json"),
    `${JSON.stringify(settings, null, 2)}\n`,
    "utf8",
  );
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

async function writeWorkspaceDesignDoc(
  target: string,
  workspaceName: string,
  type: "pages" | "slides",
): Promise<void> {
  const pressRoot = path.join(target, "press");
  await mkdir(pressRoot, { recursive: true });
  const content = type === "pages" ? `# ${workspaceName} design

This workspace uses page-based document authoring.

- Keep the ordered MDX source files in \`press/${workspaceName}/chapters/*.mdx\`.
- Edit \`press/${workspaceName}/press.tsx\` to change page composition.
- Keep reusable document styling in \`press/${workspaceName}/theme/default.css\`.
- Update this file when visual rules, layout conventions, or agent constraints change.
` : `# ${workspaceName} design

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
  opts: { silent?: boolean; timeoutMs?: number } = {},
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let timedOut = false;
    const child = spawn(command, args, {
      cwd,
      stdio: opts.silent ? ["ignore", "ignore", "ignore"] : "inherit",
      shell: process.platform === "win32",
    });
    const timer = opts.timeoutMs
      ? setTimeout(() => {
          if (settled) return;
          timedOut = true;
          settled = true;
          child.kill();
          reject(new Error(`${command} timed out after ${opts.timeoutMs}ms`));
        }, opts.timeoutMs)
      : null;
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code) => {
      if (settled || timedOut) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}
