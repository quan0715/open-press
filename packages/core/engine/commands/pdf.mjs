import path from "node:path";
import { STATIC_SERVER, buildReactPdf, formatNodeScriptCommand, formatOpenPressCommand } from "./_shared.mjs";

export async function run({ root, config, options, recurse }) {
  const outputPath = options.output ? path.resolve(root, options.output) : undefined;
  if (options.dryRun) {
    const relOutput = path.relative(root, outputPath ?? config.paths.pdf);
    const host = options.host ?? "127.0.0.1";
    const port = options.port ?? "5185";
    const pressPath = options.press ? `/${String(options.press).replace(/^\/+|\/+$/g, "")}` : "";
    console.log(`Command: ${formatOpenPressCommand(["render", ".", "--renderer", "react"])}`);
    console.log(`Command: ${formatNodeScriptCommand(root, STATIC_SERVER)} ${config.outputDir} --host ${host} --port ${port} --workspace .`);
    console.log(`Command: Chrome --print-to-pdf=${relOutput} http://${host}:${port}${pressPath}/?print=1`);
    if (options.press) console.log(`Press: ${options.press} (validated against workspace manifest at run time)`);
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
    pressSlug: options.press ?? null,
    pageIndexes: options.pages ? parsePdfPageIndexes(options.pages) : null,
  });
  console.log(`OpenPress PDF: ${path.relative(root, result.pdfPath)}`);
  return 0;
}

function parsePdfPageIndexes(value) {
  return value.split(",").map(Number).filter((n) => Number.isInteger(n) && n >= 0);
}
