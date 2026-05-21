import { fileURLToPath, URL } from "node:url";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { loadConfig, publicPdfHref } from "./engine/config.mjs";
import { handleCommentRequest } from "./engine/react/comment-endpoint.mjs";

const sourceRoot = fileURLToPath(new URL("./src", import.meta.url));
const workspaceRoot = fileURLToPath(new URL("./", import.meta.url));
const openpressCoreEntry = fileURLToPath(new URL("./src/openpress/core/index.tsx", import.meta.url));
const reactDocumentComponentsRoot = path.join(workspaceRoot, "document", "components");
const openpressConfig = await loadConfig(workspaceRoot);
const outputDir = openpressConfig.paths.outputDir;
const reactDocumentRoot = path.join(workspaceRoot, "document");
const reactDocumentEntry = path.join(reactDocumentRoot, "index.tsx");
const activeContentDir = await fileExists(reactDocumentEntry)
  ? path.join(reactDocumentRoot, "chapters")
  : openpressConfig.paths.sourceDir;

// Workspace directories — Vite resolves these at build time so that
// `import.meta.glob("@workspace/content/**")` and friends follow the active
// OpenPress authoring source instead of a hardcoded `document/` prefix.
const workspaceAliases = {
  "@workspace/content": activeContentDir,
  "@workspace/media": openpressConfig.paths.mediaDir,
  "@workspace/components": openpressConfig.paths.componentsDir,
};

// Relative paths displayed back to the user (e.g. "document/content/").
// Resolved at build time so the React app does not hardcode `document/`.
function relativeFromWorkspace(absolute: string) {
  const rel = path.relative(workspaceRoot, absolute).replaceAll("\\", "/");
  return rel.endsWith("/") ? rel : `${rel}`;
}
const workspaceDefines = {
  __OPENPRESS_CONTENT_PATH__: JSON.stringify(relativeFromWorkspace(activeContentDir)),
  __OPENPRESS_MEDIA_PATH__: JSON.stringify(relativeFromWorkspace(openpressConfig.paths.mediaDir)),
  __OPENPRESS_COMPONENTS_PATH__: JSON.stringify(relativeFromWorkspace(openpressConfig.paths.componentsDir)),
  __OPENPRESS_PDF_HREF__: JSON.stringify(publicPdfHref(openpressConfig)),
};

export default defineConfig({
  base: "./",
  plugins: [openpressLocalDeployPlugin(), react()],
  define: workspaceDefines,
  resolve: {
    alias: {
      "@openpress/core": openpressCoreEntry,
      "@/components": reactDocumentComponentsRoot,
      "@": sourceRoot,
      ...workspaceAliases,
    },
  },
  build: {
    outDir: outputDir,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash]-openpress.js",
        chunkFileNames: "assets/[name]-[hash]-openpress.js",
        assetFileNames: "assets/[name]-[hash]-openpress[extname]",
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    watch: {
      ignored: ["**/.openpress/tmp/**", `**/${openpressConfig.outputDir}/**`],
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 5173,
  },
});

function openpressLocalDeployPlugin() {
  return {
    name: "openpress-local-deploy-endpoint",
    configureServer(server: { middlewares: { use: (path: string, handler: (req: IncomingMessage, res: ServerResponse) => void) => void } }) {
      server.middlewares.use("/__openpress/local-pdf-export", (req, res) => {
        void handleLocalPdfExportRequest(req, res);
      });
      server.middlewares.use("/__openpress/local-pdf-file", (req, res) => {
        void handleLocalPdfFileRequest(req, res);
      });
      server.middlewares.use("/__openpress/status", (req, res) => {
        void handleLocalStatusRequest(req, res);
      });
      server.middlewares.use("/__openpress/deploy", (req, res) => {
        void handleLocalDeployRequest(req, res);
      });
      server.middlewares.use("/__openpress/comment", (req, res) => {
        void handleCommentRequest(req, res, { root: workspaceRoot });
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
  const exists = await fileExists(openpressConfig.paths.pdf);
  writeJson(res, result.code === 0 && exists ? 200 : 500, {
    ok: result.code === 0 && exists,
    code: result.code,
    pdf: `/__openpress/local-pdf-file?ts=${Date.now()}`,
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
    const body = await fs.readFile(openpressConfig.paths.pdf);
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${openpressConfig.pdf.filename}"`,
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
    : { deployed_at: undefined, pdf: publicPdfHref(openpressConfig), public_url: undefined };
  const dirty = deployConfigured ? await isLocalDeploymentDirty(deploymentInfo.deployed_at) : false;
  writeJson(res, 200, {
    ok: true,
    deployed_at: deploymentInfo.deployed_at,
    pdf: deploymentInfo.pdf,
    public_url: deploymentInfo.public_url,
    dirty,
    deploy_configured: deployConfigured,
    deploy_adapter: openpressConfig.deploy.adapter,
    deploy_source: openpressConfig.deploy.source,
    deploy_project_name: openpressConfig.deploy.projectName,
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
      deploy_adapter: openpressConfig.deploy.adapter,
      deploy_source: openpressConfig.deploy.source,
      deploy_project_name: openpressConfig.deploy.projectName,
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
    pdf: deployedUrl ? `${deployedUrl}/${openpressConfig.pdf.filename}` : deploymentInfo.pdf,
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
  if (openpressConfig.deploy.adapter === "cloudflare-pages") {
    return typeof openpressConfig.deploy.projectName === "string" && openpressConfig.deploy.projectName.trim().length > 0;
  }
  return true;
}

function localDeploySetupMessage() {
  if (isLocalDeployConfigured()) return undefined;
  if (openpressConfig.deploy.adapter === "cloudflare-pages") {
    return "Cloudflare Pages deployment requires `deploy.projectName` in openpress.config.mjs.";
  }
  return `Deployment adapter \`${openpressConfig.deploy.adapter}\` is not configured.`;
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
    const text = await fs.readFile(openpressConfig.paths.deployMetadata, "utf8");
    const deployConfig = JSON.parse(text) as { deployed_at?: unknown; pdf?: unknown; public_url?: unknown };
    return {
      deployed_at: typeof deployConfig.deployed_at === "string" ? deployConfig.deployed_at : undefined,
      pdf: typeof deployConfig.pdf === "string" ? deployConfig.pdf : publicPdfHref(openpressConfig),
      public_url: typeof deployConfig.public_url === "string" ? deployConfig.public_url : undefined,
    };
  } catch {
    return { deployed_at: undefined, pdf: publicPdfHref(openpressConfig), public_url: undefined };
  }
}

async function writeLocalDeploymentPublicUrl(publicUrl: string) {
  let deployConfig: Record<string, unknown> = {};
  try {
    deployConfig = JSON.parse(await fs.readFile(openpressConfig.paths.deployMetadata, "utf8")) as Record<string, unknown>;
  } catch {
    deployConfig = {};
  }
  await fs.mkdir(path.dirname(openpressConfig.paths.deployMetadata), { recursive: true });
  await fs.writeFile(
    openpressConfig.paths.deployMetadata,
    `${JSON.stringify({ ...deployConfig, pdf: `${publicUrl}/${openpressConfig.pdf.filename}`, public_url: publicUrl }, null, 2)}\n`,
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
    openpressConfig.paths.sourceDir,
    openpressConfig.paths.mediaDir,
    openpressConfig.paths.themeDir,
    openpressConfig.paths.designDoc,
    openpressConfig.paths.componentsDir,
    path.join(workspaceRoot, "src"),
    path.join(workspaceRoot, "index.html"),
    path.join(workspaceRoot, "package.json"),
    path.join(workspaceRoot, "openpress.config.mjs"),
    openpressConfig.configPath,
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
