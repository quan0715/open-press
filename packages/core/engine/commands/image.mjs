import path from "node:path";
import { STATIC_SERVER, buildReactImages, formatNodeScriptCommand, formatOpenPressCommand } from "./_shared.mjs";
import { parsePageSelector } from "../runtime/page-selector.mjs";

export async function run({ root, config, options, recurse }) {
  const outputDir = options.output ? path.resolve(root, options.output) : undefined;
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? "5186";

  const pageSelector = options.pages ? parsePageSelector(options.pages) : null;
  const pressSlug = options.press ?? null;

  if (options.dryRun) {
    const pressPath = pressSlug ? `/${String(pressSlug).replace(/^\/+|\/+$/g, "")}` : "";
    const previewDir = outputDir
      ?? path.join(config.paths.outputDir, pressSlug ? `images-${String(pressSlug).replace(/^\/+|\/+$/g, "")}` : "images");
    console.log(`Command: ${formatOpenPressCommand(["render", ".", "--renderer", "react"])}`);
    console.log(`Command: ${formatNodeScriptCommand(root, STATIC_SERVER)} ${config.outputDir} --host ${host} --port ${port} --workspace .`);
    console.log(`Chrome image export URL: http://${host}:${port}${pressPath}/?print=1`);
    if (pressSlug) console.log(`Press: ${pressSlug} (validated against workspace manifest at run time)`);
    if (pageSelector) {
      console.log(`Page selector: ${options.pages} (resolved at capture time against the rendered page count)`);
    }
    console.log(`Output: ${path.relative(root, path.join(previewDir, "page-001.png"))}`);
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
    pageSelector,
    pressSlug,
  });

  const suffix = pageSelector
    ? ` (${result.files.length}/${result.pageCount} pages)`
    : ` (${result.files.length} pages)`;
  console.log(`OpenPress images: ${path.relative(root, result.outDir)}${suffix}`);
  return 0;
}
