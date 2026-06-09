import { fileURLToPath, URL } from "node:url";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { loadConfig, publicPdfHref } from "./engine/runtime/config.mjs";
import { searchSourceText } from "./engine/runtime/source-text-tools.mjs";
import { handleCommentRequest } from "./engine/react/comment-endpoint.mjs";
import { handleProjectAssetRequest } from "./engine/react/project-asset-endpoint.mjs";
import { handleSourceEditRequest } from "./engine/react/source-edit-endpoint.mjs";
import { exportReactDocument } from "./engine/react/document-export.mjs";

const frameworkRoot = fileURLToPath(new URL("./", import.meta.url));
const workspaceRoot = process.env.OPENPRESS_WORKSPACE_ROOT
  ? path.resolve(process.env.OPENPRESS_WORKSPACE_ROOT)
  : frameworkRoot;
const sourceRoot = path.join(frameworkRoot, "src");
const openpressCliPath = path.join(frameworkRoot, "engine", "cli.mjs");
const staticServerPath = path.join(frameworkRoot, "engine", "output", "static-server.mjs");
const openpressCoreEntry = path.join(frameworkRoot, "src", "openpress", "core", "index.tsx");
const openpressMdxEntry = path.join(frameworkRoot, "src", "openpress", "mdx", "index.ts");
const openpressManuscriptEntry = path.join(frameworkRoot, "src", "openpress", "manuscript", "index.tsx");
const openpressNumberingEntry = path.join(frameworkRoot, "src", "openpress", "numbering", "index.ts");
const openpressConfig = await loadConfig(workspaceRoot);
const outputDir = openpressConfig.paths.outputDir;
const reactDocumentRoot = openpressConfig.paths.documentRoot;
const reactDocumentComponentsRoot = openpressConfig.paths.componentsDir;
const activeContentDir = reactDocumentRoot;

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
  root: frameworkRoot,
  base: "./",
  cacheDir: path.join(workspaceRoot, ".openpress", "vite-client"),
  publicDir: path.join(workspaceRoot, "public"),
  plugins: [openpressLocalDeployPlugin(), react()],
  define: workspaceDefines,
  resolve: {
    dedupe: ["react", "react-dom", "@mdx-js/react"],
    alias: {
      // Subpaths must come before the base path so resolution matches longest first.
      "@open-press/core/mdx": openpressMdxEntry,
      "@open-press/core/manuscript": openpressManuscriptEntry,
      "@open-press/core/numbering": openpressNumberingEntry,
      "@open-press/core": openpressCoreEntry,
      "@/components": reactDocumentComponentsRoot,
      "@": sourceRoot,
      ...workspaceAliases,
    },
  },
  optimizeDeps: {
    include: [
      "@mdx-js/react",
      "lucide-react",
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-dev-runtime",
      "react/jsx-runtime",
    ],
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
    fs: {
      allow: Array.from(new Set([frameworkRoot, workspaceRoot])),
    },
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
  // Suppress auto-reload when source-edit endpoint triggers an export (avoids double reload).
  let watcherSuppressedUntil = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let exporting = false;

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
      server.middlewares.use("/__openpress/search", (req, res) => {
        void handleLocalSearchRequest(req, res);
      });
      server.middlewares.use("/__openpress/source-edit", (req, res) => {
        if (req.method === "POST") watcherSuppressedUntil = Date.now() + 5000;
        void handleSourceEditRequest(req, res, { root: workspaceRoot });
      });
      server.middlewares.use("/__openpress/deploy", (req, res) => {
        void handleLocalDeployRequest(req, res);
      });
      server.middlewares.use("/__openpress/comment", (req, res) => {
        void handleCommentRequest(req, res, { root: workspaceRoot });
      });
      server.middlewares.use("/__openpress/media-upload", (req, res) => {
        void handleLocalMediaUploadRequest(req, res);
      });
      server.middlewares.use("/__openpress/project-asset", (req, res) => {
        void handleProjectAssetRequest(req, res, { root: workspaceRoot });
      });
      server.middlewares.use("/openpress/media", (req, res) => {
        void handleLocalMediaFileRequest(req, res);
      });
    },
    async handleHotUpdate({ file, server }: { file: string; server: { ws: { send: (payload: unknown) => void } } }) {
      // Only react to changes inside the press/document directory.
      const inDocumentRoot = file.startsWith(reactDocumentRoot + path.sep) || file === reactDocumentRoot;
      const inContentDir = file.startsWith(activeContentDir + path.sep) || file === activeContentDir;
      if (!inDocumentRoot && !inContentDir) return;

      // Skip when source-edit already handled the export to avoid a double reload.
      if (Date.now() < watcherSuppressedUntil) return [];

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        if (exporting) return;
        exporting = true;
        try {
          await exportReactDocument(workspaceRoot, { syncAssets: false });
        } catch {
          // Export failure must not crash the dev server.
        } finally {
          exporting = false;
        }
        server.ws.send({ type: "full-reload" });
      }, 300);

      return []; // Suppress Vite's premature HMR until our export finishes.
    },
  };
}

async function handleLocalMediaUploadRequest(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    writeJson(res, 405, { ok: false, message: "Media upload endpoint requires POST." });
    return;
  }

  const rawFileName = headerValue(req.headers["x-openpress-file-name"]);
  const decodedFileName = rawFileName ? safeDecodeURIComponent(rawFileName) : "";
  const fileName = sanitizeMediaFileName(decodedFileName);
  if (!fileName) {
    writeJson(res, 400, { ok: false, message: "Media upload requires a valid file name." });
    return;
  }
  if (!isAllowedMediaFile(fileName)) {
    writeJson(res, 400, { ok: false, message: "Only png, jpg, jpeg, gif, svg, and webp files can be uploaded." });
    return;
  }

  try {
    const body = await readRequestBuffer(req, 30 * 1024 * 1024);
    if (body.length === 0) {
      writeJson(res, 400, { ok: false, message: "Uploaded media file is empty." });
      return;
    }
    await fs.mkdir(openpressConfig.paths.mediaDir, { recursive: true });
    const uniqueFileName = await uniqueMediaFileName(openpressConfig.paths.mediaDir, fileName);
    const targetPath = path.join(openpressConfig.paths.mediaDir, uniqueFileName);
    await fs.writeFile(targetPath, body);
    const relativePath = relativeFromWorkspace(targetPath);
    writeJson(res, 200, {
      ok: true,
      asset: {
        fileName: uniqueFileName,
        src: `/openpress/media/${encodeURIComponent(uniqueFileName)}`,
        path: relativePath,
        mention: `@media/${uniqueFileName}`,
      },
    });
  } catch (error) {
    writeJson(res, 500, { ok: false, message: error instanceof Error ? error.message : String(error) });
  }
}

async function handleLocalMediaFileRequest(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    writeJson(res, 405, { ok: false, message: "Media file endpoint requires GET." });
    return;
  }

  try {
    const requestUrl = new URL(req.url ?? "/", "http://localhost");
    const fileName = sanitizeMediaFileName(safeDecodeURIComponent(requestUrl.pathname.replace(/^\/openpress\/media\/?/, "").replace(/^\/+/, "")));
    if (!fileName) {
      writeJson(res, 404, { ok: false, message: "Media file not found." });
      return;
    }
    const mediaPath = await findLocalMediaFile(fileName);
    if (!mediaPath) {
      writeJson(res, 404, { ok: false, message: "Media file not found." });
      return;
    }
    const body = await fs.readFile(mediaPath);
    res.writeHead(200, {
      "Content-Type": mediaMimeType(fileName),
      "Cache-Control": "no-store",
    });
    if (req.method === "HEAD") {
      res.end();
    } else {
      res.end(body);
    }
  } catch {
    writeJson(res, 404, { ok: false, message: "Media file not found." });
  }
}

async function handleLocalPdfExportRequest(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    writeJson(res, 405, { ok: false, message: "Local PDF export endpoint requires POST." });
    return;
  }

  const body = await readJsonRequestBody(req);
  const slug = normalizePressSlug(body?.press);
  const pages = parsePageIndexes(body?.pages);
  const result = await runLocalPdfExport(slug, pages ?? undefined);
  const pdfPath = pressPdfAbsolutePath(slug);
  const exists = await fileExists(pdfPath);
  const cliArgs = buildPdfCliArgs(slug, pages);
  const pdfUrl = `/__openpress/local-pdf-file?${slug ? `press=${encodeURIComponent(slug)}&` : ""}ts=${Date.now()}`;
  writeJson(res, result.code === 0 && exists ? 200 : 500, {
    ok: result.code === 0 && exists,
    code: result.code,
    pdf: pdfUrl,
    command: openpressCliCommand(cliArgs),
    stdout: result.stdout,
    stderr: result.stderr,
  });
}

async function handleLocalPdfFileRequest(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    writeJson(res, 405, { ok: false, message: "Local PDF file endpoint requires GET." });
    return;
  }

  const requestUrl = new URL(req.url ?? "/", "http://localhost");
  const slug = normalizePressSlug(requestUrl.searchParams.get("press"));
  const pdfPath = pressPdfAbsolutePath(slug);
  const filename = pressFilename(openpressConfig.pdf.filename, slug);
  try {
    const body = await fs.readFile(pdfPath);
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch {
    writeJson(res, 404, { ok: false, message: "Local PDF has not been generated yet." });
  }
}

function normalizePressSlug(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^\/+|\/+$/g, "");
}

function pressFilename(baseFilename: string, slug: string): string {
  if (!slug) return baseFilename;
  const ext = path.extname(baseFilename);
  const stem = ext ? baseFilename.slice(0, -ext.length) : baseFilename;
  return `${stem}-${slug}${ext}`;
}

function pressPdfAbsolutePath(slug: string): string {
  return path.join(openpressConfig.outputDir, pressFilename(openpressConfig.pdf.filename, slug));
}

async function readJsonRequestBody(req: IncomingMessage): Promise<{ press?: unknown; pages?: unknown } | null> {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
    }
    if (chunks.length === 0) return null;
    const text = Buffer.concat(chunks).toString("utf8");
    if (!text.trim()) return null;
    return JSON.parse(text);
  } catch {
    return null;
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

async function handleLocalSearchRequest(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    writeJson(res, 405, { ok: false, message: "Search endpoint requires GET." });
    return;
  }

  const requestUrl = new URL(req.url ?? "/", "http://localhost");
  const query = (requestUrl.searchParams.get("q") ?? "").trim();
  if (!query) {
    writeJson(res, 400, { ok: false, message: "Search query is required." });
    return;
  }

  try {
    const report = await searchSourceText({
      config: openpressConfig,
      query,
      scope: searchScopeFrom(requestUrl.searchParams),
      caseSensitive: requestUrl.searchParams.get("caseSensitive") === "true",
    });
    writeJson(res, 200, { ok: true, ...report });
  } catch (error) {
    writeJson(res, 500, { ok: false, message: error instanceof Error ? error.message : String(error) });
  }
}

async function handleLocalDeployRequest(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    writeJson(res, 405, { ok: false, message: "Deploy endpoint requires POST." });
    return;
  }

  const body = await readJsonRequestBody(req);
  const slug = normalizePressSlug(body?.press);
  const cliArgs = slug ? ["deploy", ".", "--confirm", "--press", slug] : ["deploy", ".", "--confirm"];
  const pdfFilename = pressFilename(openpressConfig.pdf.filename, slug);

  if (!isLocalDeployConfigured()) {
    writeJson(res, 400, {
      ok: false,
      code: 2,
      message: localDeploySetupMessage(),
      deploy_configured: false,
      deploy_adapter: openpressConfig.deploy.adapter,
      deploy_source: openpressConfig.deploy.source,
      deploy_project_name: openpressConfig.deploy.projectName,
      command: openpressCliCommand(cliArgs),
    });
    return;
  }

  const result = await runLocalDeploy(slug);
  const deployedUrl = extractDeployUrl(result.stdout);
  if (result.code === 0 && deployedUrl) {
    await writeLocalDeploymentPublicUrl(deployedUrl, pdfFilename);
  }
  const deploymentInfo = await readLocalDeploymentInfo();
  const publicUrl = deployedUrl ?? deploymentInfo.public_url;
  writeJson(res, result.code === 0 ? 200 : 500, {
    ok: result.code === 0,
    code: result.code,
    deployed_at: deploymentInfo.deployed_at,
    pdf: deployedUrl ? `${deployedUrl}/${pdfFilename}` : deploymentInfo.pdf,
    public_url: publicUrl,
    dirty: false,
    command: openpressCliCommand(cliArgs),
    stdout: result.stdout,
    stderr: result.stderr,
  });
}

function buildPdfCliArgs(slug: string, pages: number[] | null): string[] {
  const args = ["pdf", "."];
  if (slug) args.push("--press", slug);
  if (pages && pages.length > 0) args.push("--pages", pages.join(","));
  return args;
}

function parsePageIndexes(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const indexes = value.filter((v) => Number.isInteger(v) && v >= 0) as number[];
  return indexes.length > 0 ? indexes : null;
}

function runLocalPdfExport(slug = "", pages?: number[]) {
  const args = [openpressCliPath, "pdf", "."];
  if (slug) args.push("--press", slug);
  if (pages && pages.length > 0) args.push("--pages", pages.join(","));
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    const child = spawn("node", args, {
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

function runLocalDeploy(slug = "") {
  const args = [openpressCliPath, "deploy", ".", "--confirm"];
  if (slug) args.push("--press", slug);
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    const child = spawn("node", args, {
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
    return "Cloudflare Pages deployment requires `openpress.deploy.projectName` in package.json.";
  }
  return `Deployment adapter \`${openpressConfig.deploy.adapter}\` is not configured.`;
}

function searchScopeFrom(searchParams: URLSearchParams) {
  return searchParams.get("scope") === "all" ? "all" : "content";
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

async function writeLocalDeploymentPublicUrl(publicUrl: string, pdfFilename = openpressConfig.pdf.filename) {
  let deployConfig: Record<string, unknown> = {};
  try {
    deployConfig = JSON.parse(await fs.readFile(openpressConfig.paths.deployMetadata, "utf8")) as Record<string, unknown>;
  } catch {
    deployConfig = {};
  }
  await fs.mkdir(path.dirname(openpressConfig.paths.deployMetadata), { recursive: true });
  await fs.writeFile(
    openpressConfig.paths.deployMetadata,
    `${JSON.stringify({ ...deployConfig, pdf: `${publicUrl}/${pdfFilename}`, public_url: publicUrl }, null, 2)}\n`,
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
    openpressConfig.paths.documentRoot,
    path.join(frameworkRoot, "src"),
    path.join(frameworkRoot, "index.html"),
    path.join(frameworkRoot, "vite.config.ts"),
    path.join(workspaceRoot, "package.json"),
    openpressConfig.configPath,
  ];
}

function openpressCliCommand(args: string[]) {
  return `open-press ${args.join(" ")}`;
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

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function sanitizeMediaFileName(value: string) {
  const baseName = path.basename(value).trim();
  if (!baseName) return "";
  const ext = path.extname(baseName);
  const stem = path.basename(baseName, ext)
    .replace(/[\\/:*?"<>|#%{}^~[\]`]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!stem || !ext) return "";
  return `${stem}${ext.toLowerCase()}`;
}

function isAllowedMediaFile(fileName: string) {
  return /\.(png|jpe?g|gif|svg|webp)$/i.test(fileName);
}

function mediaMimeType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

async function uniqueMediaFileName(mediaDir: string, fileName: string) {
  const ext = path.extname(fileName);
  const stem = path.basename(fileName, ext);
  let candidate = fileName;
  let counter = 2;
  while (await fileExists(path.join(mediaDir, candidate))) {
    candidate = `${stem}-${counter}${ext}`;
    counter += 1;
  }
  return candidate;
}

async function findLocalMediaFile(fileName: string): Promise<string | null> {
  for (const mediaRoot of await collectLocalMediaRoots()) {
    const resolvedRoot = path.resolve(mediaRoot);
    const candidate = path.resolve(mediaRoot, fileName);
    if (!isInsideRoot(candidate, resolvedRoot)) continue;
    if (await fileExists(candidate)) return candidate;
  }
  return null;
}

async function collectLocalMediaRoots(): Promise<string[]> {
  const roots = [
    openpressConfig.paths.mediaDir,
    path.join(openpressConfig.paths.publicDir, "media"),
  ];
  try {
    const entries = await fs.readdir(openpressConfig.paths.documentRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "shared") continue;
      roots.push(path.join(openpressConfig.paths.documentRoot, entry.name, "media"));
    }
  } catch {
    // Missing press/ is handled by the render/validate commands.
  }
  return uniquePaths(roots);
}

function uniquePaths(paths: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const candidate of paths) {
    const normalized = path.resolve(candidate);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function isInsideRoot(candidate: string, rootDir: string): boolean {
  const relative = path.relative(rootDir, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function readRequestBuffer(req: IncomingMessage, maxBytes: number) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.length;
      if (total > maxBytes) {
        reject(new Error("Uploaded media file is too large."));
        req.destroy();
        return;
      }
      chunks.push(buffer);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function writeJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(`${JSON.stringify(body, null, 2)}\n`);
}

function extractDeployUrl(output: string) {
  const match = output.match(/https:\/\/[^\s]+\.pages\.dev/);
  return match?.[0]?.replace(/\/$/, "");
}
