import path from "node:path";
import { buildReactPdf } from "./_shared.mjs";

export async function run({ root, config, options, recurse }) {
  const outputPath = options.output ? path.resolve(root, options.output) : undefined;
  if (options.dryRun) {
    const relOutput = path.relative(root, outputPath ?? config.paths.pdf);
    const host = options.host ?? "127.0.0.1";
    const port = options.port ?? "5185";
    console.log("Command: node engine/cli.mjs render . --renderer react");
    console.log(`Command: node engine/static-server.mjs ${config.outputDir} --host ${host} --port ${port} --workspace .`);
    console.log(`Command: Chrome --print-to-pdf=${relOutput} http://${host}:${port}/?print=1`);
    return 0;
  }
  const result = await buildReactPdf({
    root,
    config,
    outPath: outputPath,
    host: options.host,
    port: options.port,
    noBuild: options.noBuild,
    recurse,
  });
  console.log(`OpenPress PDF: ${path.relative(root, result.pdfPath)}`);
  return 0;
}
