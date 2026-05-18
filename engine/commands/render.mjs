import { exportQDocDocument } from "../document-export.mjs";
import { runCommand } from "./_shared.mjs";

export async function run({ root, options }) {
  const renderer = options.renderer ?? "react";
  if (renderer !== "react") {
    console.error(`Unknown renderer: ${renderer}`);
    return 2;
  }
  if (options.dryRun) {
    console.log("Command: node engine/cli.mjs export .");
    console.log("Command: npx vite build --config vite.config.ts");
    return 0;
  }
  await exportQDocDocument(root);
  return runCommand("npx", ["vite", "build", "--config", "vite.config.ts"], root);
}
