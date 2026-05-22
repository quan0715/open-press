import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { printUrlToPdf, stopChildProcess, waitForPrintReady } from "../chrome-pdf.mjs";
import { loadConfig, publicPdfHref } from "../config.mjs";
import { exportDocument } from "../document-export.mjs";
import { optimizePdfMediaForStaticRoot } from "../pdf-media.mjs";

export const ENGINE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CLI_ENTRY = path.join(ENGINE_DIR, "cli.mjs");
export const STATIC_SERVER = path.join(ENGINE_DIR, "static-server.mjs");

export function parseOptions(argv) {
  const options = {};
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--renderer") options.renderer = argv[++i];
    else if (value === "--host") options.host = argv[++i];
    else if (value === "--port") options.port = argv[++i];
    else if (value === "--dry-run") options.dryRun = true;
    else if (value === "--force") options.force = true;
    else if (value === "--confirm") options.confirm = true;
    else if (value === "--json") options.json = true;
    else if (value === "--no-build") options.noBuild = true;
    else if (value === "--apply") options.apply = true;
    else if (value === "--include-code") options.includeCode = true;
    else if (value === "--case-sensitive") options.caseSensitive = true;
    else if (value === "--scope") options.scope = argv[++i];
    else if (value === "--source") options.source = argv[++i];
    else if (value === "--output") options.output = argv[++i];
    else if (value.startsWith("--")) throw new Error(`Unknown option: ${value}`);
    else positional.push(value);
  }
  options.path = positional[0];
  options.positional = positional;
  return options;
}

export function parseInitOptions(argv) {
  const options = { force: false };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--skill") options.skill = argv[++i];
    else if (value === "--force") options.force = true;
    else if (value.startsWith("--")) throw new Error(`Unknown option: ${value}`);
    else positional.push(value);
  }
  options.target = positional[0];
  return options;
}

export function formatDisplayPath(absolutePath) {
  const relative = path.relative(process.cwd(), absolutePath);
  if (!relative || relative.startsWith("..")) return absolutePath;
  return relative;
}

export function runCommand(commandName, commandArgs, cwd) {
  const result = spawnSync(commandName, commandArgs, { cwd, stdio: "inherit" });
  return result.status ?? 1;
}

export function formatNodeScriptCommand(root, scriptPath) {
  const relative = path.relative(root, scriptPath).replaceAll("\\", "/");
  const displayPath = relative && !relative.startsWith("../") ? relative : scriptPath;
  return `node ${displayPath}`;
}

export async function buildReactStatic({ root, noBuild = false, recurse, silent = false }) {
  if (noBuild) return 0;
  if (!silent) {
    return await recurse("render", [root, "--renderer", "react"]);
  }

  await exportDocument(root);
  const result = spawnSync("npx", ["vite", "build", "--config", "vite.config.ts"], {
    cwd: root,
    encoding: "utf8",
  });
  return result.status ?? 1;
}

export async function buildReactPdf({
  root,
  config,
  outPath,
  host = "127.0.0.1",
  port = "5185",
  noBuild = false,
  recurse,
}) {
  config ??= await loadConfig(root);
  outPath ??= config.paths.pdf;
  const renderCode = await buildReactStatic({ root, noBuild, recurse });
  if (renderCode !== 0) throw new Error(`React render failed with exit code ${renderCode}`);
  await optimizePdfMediaForStaticRoot(config.paths.outputDir);
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  const server = await startStaticServer(root, config, host, port);
  try {
    const pageCount = await printUrlToPdf({
      root,
      url: `http://${host}:${port}/?print=1`,
      outPath,
      waitForReady: waitForPrintReady,
      debuggingPortBase: 9300,
      debuggingPortRange: 600,
      profilePrefix: "chrome-pdf",
    });
    console.log(`${pageCount} OpenPress pages printed to PDF`);
  } finally {
    await stopChildProcess(server);
  }

  return { pdfPath: outPath };
}

export function startStaticServer(root, config, host, port) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [STATIC_SERVER, config.outputDir, "--host", host, "--port", port, "--workspace", "."], {
      cwd: root,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let settled = false;
    let stderr = "";
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error(`Timed out waiting for OpenPress static server on ${host}:${port}`));
    }, 10000);

    child.stdout.on("data", (chunk) => {
      const text = String(chunk);
      if (!settled && text.includes("OpenPress static preview:")) {
        settled = true;
        clearTimeout(timer);
        resolve(child);
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`OpenPress static server exited with code ${code ?? 1}: ${stderr}`));
    });
  });
}

export async function writePdfStageDeployConfig(root, source, config) {
  const deployRoot = path.resolve(root, source);
  const openpressDir = path.join(deployRoot, "openpress");
  await fs.mkdir(openpressDir, { recursive: true });
  await fs.writeFile(
    path.join(openpressDir, "deploy.json"),
    `${JSON.stringify({ pdf: publicPdfHref(config), deployed_at: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
  await fs.writeFile(
    path.join(deployRoot, "_headers"),
    `${publicPdfHref(config)}\n  Content-Type: application/pdf\n  Content-Disposition: inline; filename="${config.pdf.filename}"\n`,
    "utf8",
  );
}
