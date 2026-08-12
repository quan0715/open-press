import path from "node:path";
import { buildReactPdf, formatOpenPressCommand, formatViteCommand, pressPrintUrl } from "./_shared.mjs";

export async function run({ root, config, options, recurse }) {
  const outputPath = options.output ? path.resolve(root, options.output) : undefined;
  const pageIndexes = options.pages ? parsePdfPageIndexes(options.pages) : null;
  if (options.dryRun) {
    const relOutput = path.relative(root, outputPath ?? config.paths.pdf);
    const host = options.host ?? "127.0.0.1";
    const port = options.port ?? "5185";
    console.log(`Command: ${formatOpenPressCommand(["render", ".", "--renderer", "react"])}`);
    console.log(`Command: ${formatViteCommand(root, ["preview", "--host", host, "--port", port, "--strictPort"])}`);
    console.log(`Command: Chrome --print-to-pdf=${relOutput} ${pressPrintUrl(host, port, options.press, pageIndexes)}`);
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
    pageIndexes,
  });
  console.log(`OpenPress PDF: ${path.relative(root, result.pdfPath)}`);
  return 0;
}

export function parsePdfPageIndexes(value) {
  const tokens = value.split(",").map((token) => token.trim());
  if (tokens.length === 0 || tokens.some((token) => !/^\d+$/.test(token))) {
    throw new Error(`Invalid PDF page index selector "${value}". Use zero-based comma-separated indexes such as "0,2,5".`);
  }
  const indexes = tokens.map(Number);
  if (indexes.some((index) => !Number.isSafeInteger(index))) {
    throw new Error(`Invalid PDF page index selector "${value}". Use zero-based comma-separated indexes such as "0,2,5".`);
  }
  return indexes;
}
