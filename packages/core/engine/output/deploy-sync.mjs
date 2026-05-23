import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../runtime/config.mjs";
import { copyDirectory } from "../runtime/file-utils.mjs";

export async function deploySync(root, sourceDir, deployDir) {
  const config = await loadConfig(root);
  sourceDir ??= config.outputDir;
  deployDir ??= config.deploy.source;
  const dist = path.join(root, sourceDir);
  const deploy = path.join(root, deployDir);
  await fs.rm(deploy, { recursive: true, force: true });
  await fs.mkdir(deploy, { recursive: true });
  await copyDirectory(dist, deploy);
}
