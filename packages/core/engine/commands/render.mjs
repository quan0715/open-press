import { exportDocument } from "../document-export.mjs";
import { VITE_CONFIG, formatOpenPressCommand, formatViteCommand, runCommand, viteCommandArgs, workspaceRuntimeEnv } from "./_shared.mjs";

export async function run({ root, options }) {
  const renderer = options.renderer ?? "react";
  if (renderer !== "react") {
    console.error(`Unknown renderer: ${renderer}`);
    return 2;
  }
  if (options.dryRun) {
    console.log(`Command: ${formatOpenPressCommand(["export", "."])}`);
    console.log(`Command: ${formatViteCommand(root, ["build"])}`);
    return 0;
  }
  await exportDocument(root);
  return runCommand("node", viteCommandArgs(["build", "--config", VITE_CONFIG]), root, {
    env: workspaceRuntimeEnv(root),
  });
}
