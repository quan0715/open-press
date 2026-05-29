import path from "node:path";
import { createRequire } from "node:module";
import { runCommand } from "./_shared.mjs";

// Resolve the installed typescript binary directly instead of going
// through `npx tsc`. npm 11 + Node 24 (the CI release line) changed
// npx's lookup so it no longer walks pnpm's nested .bin/ links and
// silently falls back to fetching the legacy `tsc@2.0.4` shim, which
// then crashes. Using `node <resolved tsc>` is workspace-manager-
// agnostic and works downstream too.
export async function run({ root }) {
  const require = createRequire(path.join(root, "package.json"));
  let tscBin;
  try {
    tscBin = require.resolve("typescript/bin/tsc");
  } catch {
    console.error("[openpress] typescript is not installed in this workspace.");
    console.error("Add it with: npm install --save-dev typescript");
    return 1;
  }
  return runCommand("node", [tscBin, "--noEmit", "-p", "tsconfig.json"], root);
}
