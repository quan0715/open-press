import path from "node:path";
import { deploySync } from "../output/deploy-sync.mjs";
import { buildReactPdf, formatOpenPressCommand, runCommand, writePdfStageDeployConfig } from "./_shared.mjs";

export async function run({ root, config, options, recurse }) {
  if (config.deploy.requiresConfirmation === true && !options.confirm) {
    console.error("OpenPress deploy requires --confirm before updating a public Cloudflare Pages site.");
    return 2;
  }
  const source = config.deploy.source;
  const projectName = config.deploy.projectName;
  const commitDirty = config.deploy.commitDirty;
  if (options.dryRun) {
    console.log("OpenPress deploy dry run");
    console.log(`Command: ${formatOpenPressCommand(["render", ".", "--renderer", "react"])}`);
    console.log(`Step:    deploy-sync (copy ${config.outputDir} → ${source})`);
    console.log(`Command: ${formatOpenPressCommand(["pdf", ".", "--output", `${source}/${config.pdf.filename}`])}`);
    console.log(`Step:    write ${source}/openpress/deploy.json with deployment metadata`);
    console.log(`Command: npx wrangler pages deploy ${source}${projectName ? ` --project-name=${projectName}` : ""}${commitDirty ? " --commit-dirty=true" : ""}`);
    return 0;
  }
  const renderCode = await recurse("render", [root, "--renderer", "react"]);
  if (renderCode !== 0) return renderCode;
  await deploySync(root, config.outputDir, source);
  await buildReactPdf({ root, config, outPath: path.resolve(root, source, config.pdf.filename), noBuild: true, recurse });
  await writePdfStageDeployConfig(root, source, config);
  const wranglerArgs = ["wrangler", "pages", "deploy", source];
  if (projectName) wranglerArgs.push(`--project-name=${projectName}`);
  if (commitDirty) wranglerArgs.push("--commit-dirty=true");
  return runCommand("npx", wranglerArgs, root);
}
