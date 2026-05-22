import { exportDocument } from "../document-export.mjs";
import { CLI_ENTRY, formatNodeScriptCommand, runCommand } from "./_shared.mjs";

export async function run({ root, options }) {
  const renderer = options.renderer ?? "react";
  if (renderer !== "react") {
    console.error(`Unknown renderer: ${renderer}`);
    return 2;
  }
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? "5173";
  const url = `http://${host}:${port}/?dev=1`;
  if (options.dryRun) {
    console.log(`OpenPress dev URL: ${url}`);
    if (!options.noBuild) {
      console.log(`Command: ${formatNodeScriptCommand(root, CLI_ENTRY)} export .`);
    }
    console.log(`Command: npx vite --config vite.config.ts --host ${host} --port ${port}`);
    return 0;
  }
  if (!options.noBuild) {
    await exportDocument(root);
  }
  console.log(`OpenPress dev: ${url}`);
  return runCommand("npx", ["vite", "--config", "vite.config.ts", "--host", host, "--port", port], root);
}
