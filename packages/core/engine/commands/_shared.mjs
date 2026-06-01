import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { captureUrlPagesToPng, printUrlToPdf, stopChildProcess, waitForPrintReady } from "../output/chrome-pdf.mjs";
import { loadConfig, publicPdfHref } from "../runtime/config.mjs";
import { exportDocument } from "../document-export.mjs";
import { optimizePdfMediaForStaticRoot } from "../output/pdf-media.mjs";

export const ENGINE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const FRAMEWORK_ROOT = path.resolve(ENGINE_DIR, "..");
export const CLI_ENTRY = path.join(ENGINE_DIR, "cli.mjs");
export const STATIC_SERVER = path.join(ENGINE_DIR, "output", "static-server.mjs");
export const VITE_CONFIG = path.join(FRAMEWORK_ROOT, "vite.config.ts");

const require = createRequire(import.meta.url);
const VITE_PACKAGE_JSON = require.resolve("vite/package.json");
export const VITE_BIN = path.join(path.dirname(VITE_PACKAGE_JSON), "bin", "vite.js");

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
    else if (value === "--no-cache") options.noCache = true;
    else if (value === "--no-deps") options.noDeps = true;
    else if (value === "--no-skills") options.noSkills = true;
    else if (value === "--no-build") options.noBuild = true;
    else if (value === "--apply") options.apply = true;
    else if (value === "--include-code") options.includeCode = true;
    else if (value === "--case-sensitive") options.caseSensitive = true;
    else if (value === "--scope") options.scope = argv[++i];
    else if (value === "--source") options.source = argv[++i];
    else if (value === "--output") options.output = argv[++i];
    else if (value === "--pages") options.pages = argv[++i];
    else if (value.startsWith("--")) throw new Error(`Unknown option: ${value}`);
    else positional.push(value);
  }
  options.path = positional[0];
  options.positional = positional;
  return options;
}

export function formatDisplayPath(absolutePath) {
  const relative = path.relative(process.cwd(), absolutePath);
  if (!relative || relative.startsWith("..")) return absolutePath;
  return relative;
}

export function runCommand(commandName, commandArgs, cwd, opts = {}) {
  const result = spawnSync(commandName, commandArgs, {
    cwd,
    env: { ...process.env, ...(opts.env ?? {}) },
    stdio: "inherit",
  });
  return result.status ?? 1;
}

export function formatNodeScriptCommand(root, scriptPath) {
  const relative = path.relative(root, scriptPath).replaceAll("\\", "/");
  const displayPath = relative && !relative.startsWith("../") ? relative : scriptPath;
  return `node ${displayPath}`;
}

export function formatOpenPressCommand(args = []) {
  return `open-press ${args.join(" ")}`.trim();
}

export function workspaceRuntimeEnv(root) {
  return { OPENPRESS_WORKSPACE_ROOT: path.resolve(root) };
}

export function viteCommandArgs(args = []) {
  return [VITE_BIN, ...args];
}

export function formatViteCommand(root, args = []) {
  const script = formatNodeScriptCommand(root, VITE_BIN);
  const config = formatDisplayPath(VITE_CONFIG);
  return `${script} ${args.join(" ")} --config ${config}`.replace(/\s+/g, " ").trim();
}

export async function buildReactStatic({ root, noBuild = false, recurse, silent = false }) {
  if (noBuild) return 0;
  if (!silent) {
    return await recurse("render", [root, "--renderer", "react"]);
  }

  await exportDocument(root);
  const result = spawnSync("node", viteCommandArgs(["build", "--config", VITE_CONFIG]), {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...workspaceRuntimeEnv(root) },
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

export async function buildReactImages({
  root,
  config,
  outDir,
  host = "127.0.0.1",
  port = "5186",
  noBuild = false,
  recurse,
  pageSelector = null,
}) {
  config ??= await loadConfig(root);
  outDir ??= path.join(config.paths.outputDir, "images");
  const renderCode = await buildReactStatic({ root, noBuild, recurse });
  if (renderCode !== 0) throw new Error(`React render failed with exit code ${renderCode}`);
  await fs.mkdir(outDir, { recursive: true });

  const server = await startStaticServer(root, config, host, port);
  try {
    const result = await captureUrlPagesToPng({
      root,
      url: `http://${host}:${port}/?print=1`,
      outDir,
      waitForReady: waitForPrintReady,
      debuggingPortBase: 9700,
      debuggingPortRange: 600,
      profilePrefix: "chrome-image",
      pageSelector,
    });
    const label = pageSelector
      ? `${result.files.length}/${result.pageCount} OpenPress pages exported to PNG`
      : `${result.files.length} OpenPress pages exported to PNG`;
    console.log(label);
    return {
      outDir,
      files: result.files,
      pageCount: result.pageCount,
      selectedPageNumbers: result.selectedPageNumbers,
    };
  } finally {
    await stopChildProcess(server);
  }
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
