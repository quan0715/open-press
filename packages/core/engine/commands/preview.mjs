import { VITE_CONFIG, formatOpenPressCommand, formatViteCommand, runCommand, viteCommandArgs, workspaceRuntimeEnv } from "./_shared.mjs";

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
      console.log(`Command: ${formatOpenPressCommand(["render", ".", "--renderer", "react"])}`);
    }
    console.log(`Command: ${formatViteCommand(root, ["preview", "--host", host, "--port", port, "--strictPort"])}`);
    return 0;
  }
  if (!options.noBuild) {
    const renderCode = await recurse("render", [root, "--renderer", renderer]);
    if (renderCode !== 0) return renderCode;
  }
  console.log(`OpenPress preview: ${url}`);
  return runCommand("node", viteCommandArgs(["preview", "--config", VITE_CONFIG, "--host", host, "--port", port, "--strictPort"]), root, {
    env: workspaceRuntimeEnv(root),
  });
}
