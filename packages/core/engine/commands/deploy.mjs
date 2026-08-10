import path from "node:path";
import { deploySync, stagePressDeploy } from "../output/deploy-sync.mjs";
import { resolveDeployTarget } from "../runtime/deploy-target.mjs";
import {
  buildReactPdf,
  formatOpenPressCommand,
  markStagedDeploymentComplete,
  pressSuffixedFilename,
  runCommand,
  writePdfStageDeployConfig,
} from "./_shared.mjs";

export async function run({ root, config, options, recurse }) {
  if (config.deploy.requiresConfirmation === true && !options.confirm) {
    console.error("OpenPress deploy requires --confirm before updating a public Cloudflare Pages site.");
    return 2;
  }
  const target = resolveDeployTarget(config, options.press);
  const source = target.source;
  const projectName = target.projectName;
  const commitDirty = target.commitDirty;
  const pressSlug = target.pressSlug;
  const pdfFilename = pressSuffixedFilename(config.pdf.filename, pressSlug);
  const pdfArgs = ["pdf", ".", "--output", `${source}/${pdfFilename}`];
  if (pressSlug) pdfArgs.push("--press", pressSlug);
  if (options.dryRun) {
    console.log("OpenPress deploy dry run");
    console.log(`Command: ${formatOpenPressCommand(["render", ".", "--renderer", "react"])}`);
    if (target.kind === "press") {
      console.log(`Target:  Press ${pressSlug} → ${projectName}`);
      console.log(`Step:    stage only ${pressSlug} into ${source}`);
    } else {
      console.log(`Target:  Workspace → ${projectName ?? "(project name not configured)"}`);
      console.log(`Step:    deploy-sync (copy ${config.outputDir} → ${source})`);
    }
    if (!options.noPdf) {
      console.log(`Command: ${formatOpenPressCommand(pdfArgs)}`);
      console.log(`Step:    write ${source}/openpress/deploy.json with deployment metadata`);
    }
    console.log(`Command: npx wrangler pages deploy ${source}${projectName ? ` --project-name=${projectName}` : ""}${commitDirty ? " --commit-dirty=true" : ""}`);
    return 0;
  }
  const renderCode = await recurse("render", [root, "--renderer", "react"]);
  if (renderCode !== 0) return renderCode;
  if (target.kind === "press") {
    await stagePressDeploy(root, config.outputDir, source, pressSlug);
  } else {
    await deploySync(root, config.outputDir, source);
  }
  if (!options.noPdf) {
    await buildReactPdf({ root, config, outPath: path.resolve(root, source, pdfFilename), noBuild: true, recurse, pressSlug });
    await writePdfStageDeployConfig(root, source, config, { pdfFilename });
  }
  const wranglerArgs = ["wrangler", "pages", "deploy", source];
  if (projectName) wranglerArgs.push(`--project-name=${projectName}`);
  if (commitDirty) wranglerArgs.push("--commit-dirty=true");
  const deployCode = runCommand("npx", wranglerArgs, root);
  if (deployCode === 0) await markStagedDeploymentComplete(root, source);
  return deployCode;
}
