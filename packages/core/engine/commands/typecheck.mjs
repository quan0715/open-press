import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { runCommand } from "./_shared.mjs";

// Resolve the installed typescript binary directly instead of going
// through `npx tsc`. npm 11 + Node 24 (the CI release line) changed
// npx's lookup so it no longer walks pnpm's nested `.bin/` symlink
// farm and silently falls back to fetching the legacy `tsc@2.0.4`
// shim, which then crashes. Using `node <resolved tsc>` is workspace-
// manager-agnostic and works downstream too.
export async function run({ root }) {
  const absoluteRoot = path.resolve(root);
  const tscBin = resolveTscBin(absoluteRoot);
  if (!tscBin) {
    console.error("[openpress] typescript is not installed in this workspace.");
    console.error("Add it with: npm install --save-dev typescript");
    return 1;
  }
  return runCommand("node", [tscBin, "--noEmit", "-p", "tsconfig.json"], absoluteRoot);
}

// Locate a usable tsc:
//   1. Resolve `typescript/package.json` from the workspace via require —
//      this walks node_modules and follows pnpm's symlinks.
//   2. Fall back to walking up the directory tree probing
//      node_modules/.bin/tsc — covers npm-hoisted layouts where the
//      package may not appear as a direct dependency of `root`.
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
