import { exportDocument } from "../document-export.mjs";
import { generateWorkspaceThumbnails } from "../output/workspace-thumbnails.mjs";
import { loadConfig } from "../runtime/config.mjs";
import { stopChildProcess } from "../output/chrome-pdf.mjs";
import { VITE_CONFIG, findAvailablePort, formatOpenPressCommand, formatViteCommand, runCommand, startStaticServer, viteCommandArgs, workspaceRuntimeEnv } from "./_shared.mjs";

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
  const buildCode = runCommand("node", viteCommandArgs(["build", "--config", VITE_CONFIG]), root, {
    env: workspaceRuntimeEnv(root),
  });
  if (buildCode !== 0) return buildCode;
  const config = await loadConfig(root);
  try {
    const thumbnailPort = await findAvailablePort("127.0.0.1");
    await generateWorkspaceThumbnails({
      root,
      config,
      host: "127.0.0.1",
      port: String(thumbnailPort),
      startServer: () => startStaticServer(root, config, "127.0.0.1", String(thumbnailPort)),
      stopServer: stopChildProcess,
    });
  } catch (error) {
    console.warn(`OpenPress thumbnails: skipped render-time workspace thumbnails (${error?.message ?? error}).`);
  }
  return 0;
}
