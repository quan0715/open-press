import { fileURLToPath, URL } from "node:url";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { loadQDocConfig, publicPdfHref } from "./engine/config.mjs";

const sourceRoot = fileURLToPath(new URL("./src", import.meta.url));
const workspaceRoot = fileURLToPath(new URL("./", import.meta.url));
const qdocConfig = await loadQDocConfig(workspaceRoot);
const outputDir = qdocConfig.paths.outputDir;

// Workspace directories — Vite resolves these at build time so that
// `import.meta.glob("@workspace/content/*.md")` and friends follow whatever
// `qdoc.config.mjs` configures, not a hardcoded `document/` prefix.
const workspaceAliases = {
  "@workspace/content": qdocConfig.paths.sourceDir,
  "@workspace/media": qdocConfig.paths.mediaDir,
  "@workspace/components": qdocConfig.paths.componentsDir,
  "@workspace/design-system": qdocConfig.paths.designSystemDir,
};

// Relative paths displayed back to the user (e.g. "document/content/").
// Resolved at build time so the React app does not hardcode `document/`.
function relativeFromWorkspace(absolute: string) {
  const rel = path.relative(workspaceRoot, absolute).replaceAll("\\", "/");
  return rel.endsWith("/") ? rel : `${rel}`;
}
const workspaceDefines = {
  __QDOC_CONTENT_PATH__: JSON.stringify(relativeFromWorkspace(qdocConfig.paths.sourceDir)),
  __QDOC_MEDIA_PATH__: JSON.stringify(relativeFromWorkspace(qdocConfig.paths.mediaDir)),
  __QDOC_COMPONENTS_PATH__: JSON.stringify(relativeFromWorkspace(qdocConfig.paths.componentsDir)),
  __QDOC_DESIGN_SYSTEM_PATH__: JSON.stringify(relativeFromWorkspace(qdocConfig.paths.designSystemDir)),
  __QDOC_PDF_HREF__: JSON.stringify(publicPdfHref(qdocConfig)),
};

export default defineConfig({
  base: "./",
  plugins: [qdocLocalDeployPlugin(), react()],
  define: workspaceDefines,
  resolve: {
    alias: {
      "@": sourceRoot,
      ...workspaceAliases,
    },
  },
  build: {
    outDir: outputDir,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash]-qdoc.js",
        chunkFileNames: "assets/[name]-[hash]-qdoc.js",
        assetFileNames: "assets/[name]-[hash]-qdoc[extname]",
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    watch: {
      ignored: ["**/.qdoc/tmp/**", `**/${qdocConfig.outputDir}/**`],
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 5173,
  },
});

function qdocLocalDeployPlugin() {
  return {
    name: "qdoc-local-deploy-endpoint",
    configureServer(server: { middlewares: { use: (path: string, handler: (req: IncomingMessage, res: ServerResponse) => void) => void } }) {
      server.middlewares.use("/__qdoc/local-pdf-export", (req, res) => {
        void handleLocalPdfExportRequest(req, res);
      });
      server.middlewares.use("/__qdoc/local-pdf-file", (req, res) => {
        void handleLocalPdfFileRequest(req, res);
      });
      server.middlewares.use("/__qdoc/status", (req, res) => {
        void handleLocalStatusRequest(req, res);
      });
      server.middlewares.use("/__qdoc/deploy", (req, res) => {
        void handleLocalDeployRequest(req, res);
      });
    },
  };
}

async function handleLocalPdfExportRequest(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    writeJson(res, 405, { ok: false, message: "Local PDF export endpoint requires POST." });
    return;
  }

  const result = await runLocalPdfExport();
  const exists = await fileExists(qdocConfig.paths.pdf);
  writeJson(res, result.code === 0 && exists ? 200 : 500, {
    ok: result.code === 0 && exists,
    code: result.code,
    pdf: `/__qdoc/local-pdf-file?ts=${Date.now()}`,
    command: "node engine/cli.mjs pdf .",
    stdout: result.stdout,
    stderr: result.stderr,
  });
}

async function handleLocalPdfFileRequest(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    writeJson(res, 405, { ok: false, message: "Local PDF file endpoint requires GET." });
    return;
  }

  try {
    const body = await fs.readFile(qdocConfig.paths.pdf);
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${qdocConfig.pdf.filename}"`,
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch {
    writeJson(res, 404, { ok: false, message: "Local PDF has not been generated yet." });
  }
}

async function handleLocalStatusRequest(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    writeJson(res, 405, { ok: false, message: "Status endpoint requires GET." });
    return;
  }

  const deployConfigured = isLocalDeployConfigured();
  const deploymentInfo = deployConfigured
    ? await readLocalDeploymentInfo()
    : { deployed_at: undefined, pdf: publicPdfHref(qdocConfig), public_url: undefined };
  const dirty = deployConfigured ? await isLocalDeploymentDirty(deploymentInfo.deployed_at) : false;
  writeJson(res, 200, {
    ok: true,
    deployed_at: deploymentInfo.deployed_at,
    pdf: deploymentInfo.pdf,
    public_url: deploymentInfo.public_url,
    dirty,
    deploy_configured: deployConfigured,
    deploy_adapter: qdocConfig.deploy.adapter,
    deploy_source: qdocConfig.deploy.source,
    deploy_project_name: qdocConfig.deploy.projectName,
    deploy_setup_message: localDeploySetupMessage(),
  });
}

async function handleLocalDeployRequest(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    writeJson(res, 405, { ok: false, message: "Deploy endpoint requires POST." });
    return;
  }

  if (!isLocalDeployConfigured()) {
    writeJson(res, 400, {
      ok: false,
      code: 2,
      message: localDeploySetupMessage(),
      deploy_configured: false,
      deploy_adapter: qdocConfig.deploy.adapter,
      deploy_source: qdocConfig.deploy.source,
      deploy_project_name: qdocConfig.deploy.projectName,
      command: "node engine/cli.mjs deploy . --confirm",
    });
    return;
  }

  const result = await runLocalDeploy();
  const deployedUrl = extractDeployUrl(result.stdout);
  if (result.code === 0 && deployedUrl) {
    await writeLocalDeploymentPublicUrl(deployedUrl);
  }
  const deploymentInfo = await readLocalDeploymentInfo();
  const publicUrl = deployedUrl ?? deploymentInfo.public_url;
  writeJson(res, result.code === 0 ? 200 : 500, {
    ok: result.code === 0,
    code: result.code,
    deployed_at: deploymentInfo.deployed_at,
    pdf: deployedUrl ? `${deployedUrl}/${qdocConfig.pdf.filename}` : deploymentInfo.pdf,
    public_url: publicUrl,
    dirty: false,
    command: "node engine/cli.mjs deploy . --confirm",
    stdout: result.stdout,
    stderr: result.stderr,
  });
}

function runLocalPdfExport() {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    const child = spawn("node", ["engine/cli.mjs", "pdf", "."], {
      cwd: workspaceRoot,
      shell: false,
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

function runLocalDeploy() {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    const child = spawn("node", ["engine/cli.mjs", "deploy", ".", "--confirm"], {
      cwd: workspaceRoot,
      shell: false,
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

function isLocalDeployConfigured() {
  if (qdocConfig.deploy.adapter === "cloudflare-pages") {
    return typeof qdocConfig.deploy.projectName === "string" && qdocConfig.deploy.projectName.trim().length > 0;
  }
  return true;
}

function localDeploySetupMessage() {
  if (isLocalDeployConfigured()) return undefined;
  if (qdocConfig.deploy.adapter === "cloudflare-pages") {
    return "Cloudflare Pages deployment requires `deploy.projectName` in qdoc.config.mjs.";
  }
  return `Deployment adapter \`${qdocConfig.deploy.adapter}\` is not configured.`;
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readLocalDeploymentInfo() {
  try {
    const text = await fs.readFile(qdocConfig.paths.deployMetadata, "utf8");
    const deployConfig = JSON.parse(text) as { deployed_at?: unknown; pdf?: unknown; public_url?: unknown };
    return {
      deployed_at: typeof deployConfig.deployed_at === "string" ? deployConfig.deployed_at : undefined,
      pdf: typeof deployConfig.pdf === "string" ? deployConfig.pdf : publicPdfHref(qdocConfig),
      public_url: typeof deployConfig.public_url === "string" ? deployConfig.public_url : undefined,
    };
  } catch {
    return { deployed_at: undefined, pdf: publicPdfHref(qdocConfig), public_url: undefined };
  }
}

async function writeLocalDeploymentPublicUrl(publicUrl: string) {
  let deployConfig: Record<string, unknown> = {};
  try {
    deployConfig = JSON.parse(await fs.readFile(qdocConfig.paths.deployMetadata, "utf8")) as Record<string, unknown>;
  } catch {
    deployConfig = {};
  }
  await fs.mkdir(path.dirname(qdocConfig.paths.deployMetadata), { recursive: true });
  await fs.writeFile(
    qdocConfig.paths.deployMetadata,
    `${JSON.stringify({ ...deployConfig, pdf: `${publicUrl}/${qdocConfig.pdf.filename}`, public_url: publicUrl }, null, 2)}\n`,
    "utf8",
  );
}

async function isLocalDeploymentDirty(deployedAt: string | undefined) {
  if (!deployedAt) return false;
  const deployedTime = new Date(deployedAt).getTime();
  if (Number.isNaN(deployedTime)) return false;
  const newestSourceMtime = await findNewestLocalSourceMtime(getLocalDeploymentSourcePaths());
  return newestSourceMtime > deployedTime + 1000;
}

function getLocalDeploymentSourcePaths() {
  return [
    qdocConfig.paths.sourceDir,
    qdocConfig.paths.mediaDir,
    qdocConfig.paths.themeDir,
    qdocConfig.paths.designSystemDir,
    qdocConfig.paths.componentsDir,
    path.join(workspaceRoot, "src"),
    path.join(workspaceRoot, "index.html"),
    path.join(workspaceRoot, "package.json"),
    path.join(workspaceRoot, "qdoc.config.mjs"),
    qdocConfig.configPath,
    path.join(workspaceRoot, "vite.config.ts"),
  ];
}

async function findNewestLocalSourceMtime(paths: string[]) {
  const times = await Promise.all(paths.map((sourcePath) => findNewestLocalMtime(sourcePath)));
  return Math.max(0, ...times);
}

async function findNewestLocalMtime(sourcePath: string): Promise<number> {
  try {
    const stat = await fs.stat(sourcePath);
    if (!stat.isDirectory()) return stat.mtimeMs;
    const entries = await fs.readdir(sourcePath, { withFileTypes: true });
    const times = await Promise.all(entries.map((entry) => findNewestLocalMtime(path.join(sourcePath, entry.name))));
    return Math.max(stat.mtimeMs, ...times);
  } catch {
    return 0;
  }
}

function writeJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(`${JSON.stringify(body, null, 2)}\n`);
}

function extractDeployUrl(output: string) {
  const match = output.match(/https:\/\/[^\s]+\.pages\.dev/);
  return match?.[0]?.replace(/\/$/, "");
}
