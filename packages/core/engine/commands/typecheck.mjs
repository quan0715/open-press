import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { FRAMEWORK_ROOT, runCommand } from "./_shared.mjs";
import { loadConfig } from "../runtime/config.mjs";

// Run typecheck via the locally installed typescript. The previous
// implementation used `npx tsc`; npm 11 + Node 24 (our CI / release
// pin) changed npx's bin lookup so it no longer walks pnpm's nested
// `.bin/` symlink farm and falls back to fetching the legacy
// `tsc@2.0.4` shim, which crashes.
//
// Resolution order:
//   1. `node <resolved tsc>` via require.resolve(typescript/package.json)
//      — works with npm-hoisted layouts and most pnpm installs.
//   2. Walk up node_modules/.bin/tsc — covers downstream npm/yarn.
//   3. Fall back to `pnpm exec tsc` — pnpm knows its own symlink farm
//      even when bare require.resolve doesn't, which is what CI hits.
export async function run({ root }) {
  const absoluteRoot = path.resolve(root);
  const projectPath = await resolveTypecheckProject(absoluteRoot);

  const tscBin = resolveTscBin(absoluteRoot);
  if (tscBin) {
    return runCommand("node", [tscBin, "--noEmit", "-p", projectPath], absoluteRoot);
  }

  if (hasCommand("pnpm")) {
    return runCommand("pnpm", ["exec", "tsc", "--noEmit", "-p", projectPath], absoluteRoot);
  }

  console.error("[openpress] typescript is not installed in this workspace.");
  console.error("Add it with: npm install --save-dev typescript");
  return 1;
}

async function resolveTypecheckProject(absoluteRoot) {
  const workspaceProject = path.join(absoluteRoot, "tsconfig.json");
  if (fs.existsSync(workspaceProject)) return workspaceProject;
  return await writeGeneratedTypecheckProject(absoluteRoot);
}

async function writeGeneratedTypecheckProject(absoluteRoot) {
  const config = await loadConfig(absoluteRoot);
  const outDir = path.join(absoluteRoot, ".openpress");
  await mkdir(outDir, { recursive: true });

  const projectPath = path.join(outDir, "typecheck.tsconfig.json");
  const fromProjectDir = (target) => normalizePath(path.relative(outDir, target)) || ".";
  const fromWorkspace = (target) => normalizePath(path.relative(absoluteRoot, target)) || ".";
  const includeRoot = (target) => {
    const relative = fromProjectDir(target);
    return relative === "." ? "." : relative;
  };

  const typeRoots = [
    path.join(absoluteRoot, "node_modules", "@types"),
    path.join(FRAMEWORK_ROOT, "node_modules", "@types"),
  ]
    .filter((dir) => fs.existsSync(dir))
    .map((dir) => fromProjectDir(dir));

  const typecheckConfig = {
    compilerOptions: {
      target: "ES2022",
      useDefineForClassFields: true,
      lib: ["DOM", "DOM.Iterable", "ES2022"],
      allowJs: false,
      skipLibCheck: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      module: "ESNext",
      moduleResolution: "Bundler",
      types: ["node"],
      ...(typeRoots.length > 0 ? { typeRoots } : {}),
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: "react-jsx",
      ignoreDeprecations: "6.0",
      baseUrl: "..",
      paths: {
        "@open-press/core": [fromWorkspace(path.join(FRAMEWORK_ROOT, "src", "openpress", "core", "index.tsx"))],
        "@open-press/core/mdx": [fromWorkspace(path.join(FRAMEWORK_ROOT, "src", "openpress", "mdx", "index.ts"))],
        "@open-press/core/manuscript": [fromWorkspace(path.join(FRAMEWORK_ROOT, "src", "openpress", "manuscript", "index.tsx"))],
        "@open-press/core/numbering": [fromWorkspace(path.join(FRAMEWORK_ROOT, "src", "openpress", "numbering", "index.ts"))],
        "@/components": [
          `${fromWorkspace(config.paths.componentsDir)}/index.ts`,
          `${fromWorkspace(config.paths.componentsDir)}/index.tsx`,
        ],
        "@/components/*": [`${fromWorkspace(config.paths.componentsDir)}/*`],
        "@workspace/content": [fromWorkspace(config.paths.sourceDir)],
        "@workspace/content/*": [`${fromWorkspace(config.paths.sourceDir)}/*`],
        "@workspace/media": [fromWorkspace(config.paths.mediaDir)],
        "@workspace/media/*": [`${fromWorkspace(config.paths.mediaDir)}/*`],
        "@workspace/components": [fromWorkspace(config.paths.componentsDir)],
        "@workspace/components/*": [`${fromWorkspace(config.paths.componentsDir)}/*`],
        "@/*": [`${fromWorkspace(path.join(FRAMEWORK_ROOT, "src"))}/*`],
      },
    },
    include: [
      `${includeRoot(config.paths.documentRoot)}/**/*.ts`,
      `${includeRoot(config.paths.documentRoot)}/**/*.tsx`,
      "../tests/**/*.test.ts",
      "../tests/**/*.test.tsx",
    ],
  };

  await writeFile(projectPath, `${JSON.stringify(typecheckConfig, null, 2)}\n`, "utf8");
  return projectPath;
}

function normalizePath(value) {
  return value.replaceAll("\\", "/");
}

function resolveTscBin(absoluteRoot) {
  try {
    const require = createRequire(path.join(absoluteRoot, "package.json"));
    const pkgPath = require.resolve("typescript/package.json");
    return path.join(path.dirname(pkgPath), "bin", "tsc");
  } catch {
    // fall through to .bin probe
  }

  try {
    const require = createRequire(import.meta.url);
    const pkgPath = require.resolve("typescript/package.json");
    return path.join(path.dirname(pkgPath), "bin", "tsc");
  } catch {
    // fall through to .bin probe
  }

  let dir = absoluteRoot;
  while (true) {
    const candidate = path.join(dir, "node_modules", ".bin", "tsc");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function hasCommand(name) {
  const PATH = process.env.PATH ?? "";
  const sep = process.platform === "win32" ? ";" : ":";
  const exts = process.platform === "win32"
    ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";")
    : [""];
  for (const dir of PATH.split(sep)) {
    if (!dir) continue;
    for (const ext of exts) {
      if (fs.existsSync(path.join(dir, name + ext))) return true;
    }
  }
  return false;
}
