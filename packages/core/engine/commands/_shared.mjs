import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { captureUrlPagesToPng, printUrlToPdf, stopChildProcess, waitForPrintReady } from "../output/chrome-pdf.mjs";
import { loadConfig } from "../runtime/config.mjs";
import { pressSuffixedFilename } from "../runtime/press-filename.mjs";
import { exportDocument } from "../document-export.mjs";
import { optimizePdfMediaForStaticRoot } from "../output/pdf-media.mjs";

export { pressSuffixedFilename };

export const ENGINE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const FRAMEWORK_ROOT = path.resolve(ENGINE_DIR, "..");
export const CLI_ENTRY = path.join(ENGINE_DIR, "cli.mjs");
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
    else if (value === "--no-pdf") options.noPdf = true;
    else if (value === "--visual") options.visual = true;
    else if (value === "--apply") options.apply = true;
    else if (value === "--include-code") options.includeCode = true;
    else if (value === "--case-sensitive") options.caseSensitive = true;
    else if (value === "--scope") options.scope = argv[++i];
    else if (value === "--source") options.source = argv[++i];
    else if (value === "--after") options.after = argv[++i];
    else if (value === "--before") options.before = argv[++i];
    else if (value === "--template") options.template = argv[++i];
    else if (value === "--order") {
      options.order = [];
      while (argv[i + 1] && !argv[i + 1].startsWith("--")) {
        options.order.push(argv[++i]);
      }
    }
    else if (value === "--output") options.output = argv[++i];
    else if (value === "--pages") options.pages = argv[++i];
    else if (value === "--press") options.press = argv[++i];
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
    stdio: opts.stdio ?? "inherit",
  });
  return result.status ?? 1;
}

export function runIsolatedDocumentExport(root) {
  return new Promise((resolve) => {
    const child = spawn("node", [CLI_ENTRY, "export", "."], {
      cwd: root,
      env: { ...process.env, ...workspaceRuntimeEnv(root) },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      resolve({ code: 1, stdout, stderr: `${stderr}${error.message}\n` });
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
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

export async function findAvailablePort(host = "127.0.0.1") {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => {
        if (error) reject(error);
        else if (typeof port === "number") resolve(port);
        else reject(new Error(`Could not allocate an OpenPress port on ${host}`));
      });
    });
  });
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

export async function resolvePressSelection({ outputDir, slug }) {
  const manifestPath = path.join(outputDir, "openpress", "workspace.json");
  let manifest;
  try {
    const body = await fs.readFile(manifestPath, "utf8");
    manifest = JSON.parse(body);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(
        `Cannot resolve --press: workspace manifest not found at ${manifestPath}. ` +
          `Run a render first (or drop --no-build) so the manifest is regenerated.`,
      );
    }
    throw error;
  }
  const presses = Array.isArray(manifest?.presses) ? manifest.presses : [];
  if (presses.length === 0) {
    throw new Error(`Workspace manifest at ${manifestPath} declares no Press entries.`);
  }
  const knownSlugs = presses.map((press) => press.slug || "").filter(Boolean);
  const normalized = typeof slug === "string" ? slug.trim().replace(/^\/+|\/+$/g, "") : "";
  if (!normalized) {
    return { slug: presses[0].slug ?? "", title: presses[0].title ?? "", knownSlugs };
  }
  const match = presses.find((press) => (press.slug ?? "").replace(/^\/+|\/+$/g, "") === normalized);
  if (!match) {
    const listed = knownSlugs.length > 0 ? knownSlugs.join(", ") : "(none — workspace has no slugged presses)";
    throw new Error(`Unknown --press "${slug}". Known slugs: ${listed}.`);
  }
  return { slug: match.slug ?? "", title: match.title ?? "", knownSlugs };
}

export function pressPrintUrl(host, port, slug, pageIndexes = null) {
  const normalized = (slug ?? "").replace(/^\/+|\/+$/g, "");
  const base = normalized
    ? `http://${host}:${port}/${normalized}/preview?print=1`
    : `http://${host}:${port}/?print=1`;
  if (pageIndexes && pageIndexes.length > 0) return `${base}&pages=${pageIndexes.join(",")}`;
  return base;
}

export function publicPdfHrefForFilename(filename) {
  return `/${filename}`;
}

export async function buildReactPdf({
  root,
  config,
  outPath,
  host = "127.0.0.1",
  port = "5185",
  noBuild = false,
  recurse,
  pressSlug = null,
  pageIndexes = null,
}) {
  config ??= await loadConfig(root);
  const renderCode = await buildReactStatic({ root, noBuild, recurse });
  if (renderCode !== 0) throw new Error(`React render failed with exit code ${renderCode}`);
  await optimizePdfMediaForStaticRoot(config.paths.outputDir);

  const selection = await resolvePressSelection({ outputDir: config.paths.outputDir, slug: pressSlug });

  if (!outPath) {
    const filename = pressSlug
      ? pressSuffixedFilename(config.pdf.filename, selection.slug)
      : config.pdf.filename;
    outPath = path.join(config.paths.outputDir, filename);
  }
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  const server = await startVitePreview(root, host, port);
  try {
    const result = await printUrlToPdf({
      root,
      url: pressPrintUrl(host, port, selection.slug, pageIndexes),
      outPath,
      waitForReady: waitForPrintReady,
      debuggingPortBase: 9300,
      debuggingPortRange: 600,
      profilePrefix: "chrome-pdf",
    });
    const pageCount = result?.pageCount ?? result;
    const pressLabel = selection.slug ? ` (press: ${selection.title || selection.slug})` : "";
    console.log(`${pageCount} OpenPress pages printed to PDF${pressLabel}`);
  } finally {
    await stopChildProcess(server);
  }

  return { pdfPath: outPath, pressSlug: selection.slug };
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
  pressSlug = null,
}) {
  config ??= await loadConfig(root);
  const renderCode = await buildReactStatic({ root, noBuild, recurse });
  if (renderCode !== 0) throw new Error(`React render failed with exit code ${renderCode}`);

  const selection = await resolvePressSelection({ outputDir: config.paths.outputDir, slug: pressSlug });

  if (!outDir) {
    const folder = pressSlug ? `images-${selection.slug}` : "images";
    outDir = path.join(config.paths.outputDir, folder);
  }
  await fs.mkdir(outDir, { recursive: true });

  const server = await startVitePreview(root, host, port);
  try {
    const result = await captureUrlPagesToPng({
      root,
      url: pressPrintUrl(host, port, selection.slug),
      outDir,
      waitForReady: waitForPrintReady,
      debuggingPortBase: 9700,
      debuggingPortRange: 600,
      profilePrefix: "chrome-image",
      pageSelector,
    });
    const pressLabel = selection.slug ? ` (press: ${selection.title || selection.slug})` : "";
    const countLabel = pageSelector
      ? `${result.files.length}/${result.pageCount} OpenPress pages exported to PNG`
      : `${result.files.length} OpenPress pages exported to PNG`;
    console.log(`${countLabel}${pressLabel}`);
    return {
      outDir,
      files: result.files,
      pageCount: result.pageCount,
      selectedPageNumbers: result.selectedPageNumbers,
      pressSlug: selection.slug,
    };
  } finally {
    await stopChildProcess(server);
  }
}

export function startVitePreview(root, host, port, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, viteCommandArgs(["preview", "--config", VITE_CONFIG, "--host", host, "--port", port, "--strictPort"]), {
      cwd: root,
      env: { ...process.env, ...(opts.env ?? {}), ...workspaceRuntimeEnv(root) },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let settled = false;
    let stderr = "";
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error(`Timed out waiting for OpenPress Vite preview on ${host}:${port}`));
    }, 10000);

    child.stdout.on("data", (chunk) => {
      const text = String(chunk);
      if (!settled && text.includes("Local:")) {
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
    child.on("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`OpenPress Vite preview exited with code ${code ?? 1}: ${stderr}`));
    });
  });
}

export async function writePdfStageDeployConfig(root, source, config, { pdfFilename = config.pdf.filename } = {}) {
  const deployRoot = path.resolve(root, source);
  const openpressDir = path.join(deployRoot, "openpress");
  const pdfHref = publicPdfHrefForFilename(pdfFilename);
  await fs.mkdir(openpressDir, { recursive: true });
  await fs.writeFile(
    path.join(openpressDir, "deploy.json"),
    `${JSON.stringify({ pdf: pdfHref }, null, 2)}\n`,
    "utf8",
  );
  await fs.writeFile(
    path.join(deployRoot, "_headers"),
    `${pdfHref}\n  Content-Type: application/pdf\n  Content-Disposition: attachment; filename="${pdfFilename}"\n`,
    "utf8",
  );
}

export async function markStagedDeploymentComplete(root, source) {
  const deployRoot = path.resolve(root, source);
  const metadataPath = path.join(deployRoot, "openpress", "deploy.json");
  let metadata = {};
  try {
    metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));
  } catch {
    // `--no-pdf` has no metadata until the deployment completes.
  }
  await fs.mkdir(path.dirname(metadataPath), { recursive: true });
  await fs.writeFile(
    metadataPath,
    `${JSON.stringify({ ...metadata, deployed_at: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}
