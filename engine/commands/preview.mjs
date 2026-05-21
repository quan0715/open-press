import { runCommand } from "./_shared.mjs";

export async function run({ root, config, options, recurse }) {
  const renderer = options.renderer ?? "react";
  if (renderer !== "react") {
    console.error(`Unknown renderer: ${renderer}`);
    return 2;
  }
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? "5173";
  const url = `http://${host}:${port}`;
  if (options.dryRun) {
    console.log(`OpenPress preview URL: ${url}`);
    if (!options.noBuild) {
      console.log("Command: node engine/cli.mjs render . --renderer react");
    }
    console.log(`Command: node engine/static-server.mjs ${config.outputDir} --host ${host} --port ${port} --workspace .`);
    return 0;
  }
  if (!options.noBuild) {
    const renderCode = await recurse("render", [root, "--renderer", renderer]);
    if (renderCode !== 0) return renderCode;
  }
  console.log(`OpenPress preview: ${url}`);
  return runCommand("node", ["engine/static-server.mjs", config.outputDir, "--host", host, "--port", port, "--workspace", "."], root);
}
