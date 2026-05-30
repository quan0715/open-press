import path from "node:path";
import { STATIC_SERVER, buildReactImages, formatNodeScriptCommand, formatOpenPressCommand } from "./_shared.mjs";

export async function run({ root, config, options, recurse }) {
  const outputDir = options.output ? path.resolve(root, options.output) : path.join(config.paths.outputDir, "images");
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? "5186";

  if (options.dryRun) {
    console.log(`Command: ${formatOpenPressCommand(["render", ".", "--renderer", "react"])}`);
    console.log(`Command: ${formatNodeScriptCommand(root, STATIC_SERVER)} ${config.outputDir} --host ${host} --port ${port} --workspace .`);
    console.log(`Chrome image export URL: http://${host}:${port}/?print=1`);
    console.log(`Output: ${path.relative(root, path.join(outputDir, "page-001.png"))}`);
    return 0;
  }

  const result = await buildReactImages({
    root,
    config,
    outDir: outputDir,
    host,
    port,
    noBuild: options.noBuild,
    recurse,
  });

  console.log(`OpenPress images: ${path.relative(root, result.outDir)} (${result.files.length} pages)`);
  return 0;
}
