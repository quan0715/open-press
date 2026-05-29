import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { runCommand } from "./_shared.mjs";

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

  const tscBin = resolveTscBin(absoluteRoot);
  if (tscBin) {
    return runCommand("node", [tscBin, "--noEmit", "-p", "tsconfig.json"], absoluteRoot);
  }

  if (hasCommand("pnpm")) {
    return runCommand("pnpm", ["exec", "tsc", "--noEmit", "-p", "tsconfig.json"], absoluteRoot);
  }

  console.error("[openpress] typescript is not installed in this workspace.");
  console.error("Add it with: npm install --save-dev typescript");
  return 1;
}

function resolveTscBin(absoluteRoot) {
  try {
    const require = createRequire(path.join(absoluteRoot, "package.json"));
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
