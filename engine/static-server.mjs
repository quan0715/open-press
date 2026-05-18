import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { loadQDocConfig, publicPdfHref } from "./config.mjs";

const [rootArg = "dist", ...rest] = process.argv.slice(2);
const host = valueAfter(rest, "--host") ?? "127.0.0.1";
const port = Number(valueAfter(rest, "--port") ?? "8765");
const root = path.resolve(rootArg);
const workspace = path.resolve(valueAfter(rest, "--workspace") ?? await inferWorkspaceRoot(root));
const config = await loadQDocConfig(workspace);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${host}:${port}`);
    if (url.pathname === "/__qdoc/status") {
      await handleStatusRequest(req, res);
      return;
    }
    if (url.pathname === "/__qdoc/local-pdf-export") {
      await handleLocalPdfExportRequest(req, res);
      return;
    }
    if (url.pathname === "/__qdoc/local-pdf-file") {
      await handleLocalPdfFileRequest(req, res);
      return;
    }
    if (url.pathname === "/__qdoc/deploy") {
      await handleDeployRequest(req, res);
      return;
    }
    const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const target = path.resolve(root, `.${requested}`);
    if (!target.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    const stat = await fs.stat(target);
    const filePath = stat.isDirectory() ? path.join(target, "index.html") : target;
    const body = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(port, host, () => {
  console.log(`QDoc static preview: http://${host}:${port}/`);
});

async function handleStatusRequest(req, res) {
  if (req.method !== "GET") {
    writeJson(res, 405, { ok: false, message: "Status endpoint requires GET." });
    return;
  }

  const deploymentInfo = await readDeploymentInfo();
  const dirty = await isDeploymentDirty(deploymentInfo.deployed_at);
  writeJson(res, 200, {
    ok: true,
    deployed_at: deploymentInfo.deployed_at,
    pdf: deploymentInfo.pdf,
    public_url: deploymentInfo.public_url,
    dirty,
  });
}

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

async function inferWorkspaceRoot(staticRoot) {
  for (const candidate of [staticRoot, path.dirname(staticRoot), path.dirname(path.dirname(staticRoot))]) {
    if (await fileExists(path.join(candidate, "qdoc.config.mjs"))) return candidate;
  }
  if (path.basename(path.dirname(staticRoot)) === ".deploy") {
    return path.dirname(path.dirname(staticRoot));
  }
  return process.cwd();
}

async function handleLocalPdfExportRequest(req, res) {
  if (req.method !== "POST") {
    writeJson(res, 405, { ok: false, message: "Local PDF export endpoint requires POST." });
    return;
  }

  const result = await runLocalPdfExport();
  const exists = await fileExists(config.paths.pdf);
  writeJson(res, result.code === 0 && exists ? 200 : 500, {
    ok: result.code === 0 && exists,
    code: result.code,
    pdf: `/__qdoc/local-pdf-file?ts=${Date.now()}`,
    command: "node engine/cli.mjs pdf .",
    stdout: result.stdout,
    stderr: result.stderr,
  });
}

async function handleLocalPdfFileRequest(req, res) {
  if (req.method !== "GET") {
    writeJson(res, 405, { ok: false, message: "Local PDF file endpoint requires GET." });
    return;
  }

  try {
    const body = await fs.readFile(config.paths.pdf);
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${config.pdf.filename}"`,
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch {
    writeJson(res, 404, { ok: false, message: "Local PDF has not been generated yet." });
  }
}

async function handleDeployRequest(req, res) {
  if (req.method !== "POST") {
    writeJson(res, 405, { ok: false, message: "Deploy endpoint requires POST." });
    return;
  }

  const result = await runDeploy();
  const deployedUrl = extractDeployUrl(result.stdout);
  if (result.code === 0 && deployedUrl) {
    await writeDeploymentPublicUrl(deployedUrl);
  }
  const deploymentInfo = await readDeploymentInfo();
  const publicUrl = deployedUrl ?? deploymentInfo.public_url;
  writeJson(res, result.code === 0 ? 200 : 500, {
    ok: result.code === 0,
    code: result.code,
    deployed_at: deploymentInfo.deployed_at,
    pdf: deployedUrl ? `${deployedUrl}/${config.pdf.filename}` : deploymentInfo.pdf,
    public_url: publicUrl,
    dirty: false,
    command: "node engine/cli.mjs deploy . --confirm",
    stdout: result.stdout,
    stderr: result.stderr,
  });
}

function runLocalPdfExport() {
  return new Promise((resolve) => {
    const child = spawn("node", ["engine/cli.mjs", "pdf", "."], {
      cwd: workspace,
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

function runDeploy() {
  return new Promise((resolve) => {
    const child = spawn("node", ["engine/cli.mjs", "deploy", ".", "--confirm"], {
      cwd: workspace,
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

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function writeJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(`${JSON.stringify(body, null, 2)}\n`);
}

async function readDeploymentInfo() {
  try {
    const text = await fs.readFile(config.paths.deployMetadata, "utf8");
    const deployConfig = JSON.parse(text);
    return {
      deployed_at: typeof deployConfig.deployed_at === "string" ? deployConfig.deployed_at : undefined,
      pdf: typeof deployConfig.pdf === "string" ? deployConfig.pdf : publicPdfHref(config),
      public_url: typeof deployConfig.public_url === "string" ? deployConfig.public_url : undefined,
    };
  } catch {
    return { deployed_at: undefined, pdf: publicPdfHref(config), public_url: undefined };
  }
}

async function writeDeploymentPublicUrl(publicUrl) {
  let deployConfig = {};
  try {
    deployConfig = JSON.parse(await fs.readFile(config.paths.deployMetadata, "utf8"));
  } catch {
    deployConfig = {};
  }
  await fs.mkdir(path.dirname(config.paths.deployMetadata), { recursive: true });
  await fs.writeFile(
    config.paths.deployMetadata,
    `${JSON.stringify({ ...deployConfig, pdf: `${publicUrl}/${config.pdf.filename}`, public_url: publicUrl }, null, 2)}\n`,
    "utf8",
  );
}

async function isDeploymentDirty(deployedAt) {
  if (!deployedAt) return false;
  const deployedTime = new Date(deployedAt).getTime();
  if (Number.isNaN(deployedTime)) return false;
  const newestSourceMtime = await findNewestSourceMtime(getDeploymentSourcePaths());
  return newestSourceMtime > deployedTime + 1000;
}

function getDeploymentSourcePaths() {
  return [
    config.paths.sourceDir,
    config.paths.mediaDir,
    config.paths.themeDir,
    config.paths.designSystemDir,
    config.paths.componentsDir,
    path.join(workspace, "src"),
    path.join(workspace, "index.html"),
    path.join(workspace, "package.json"),
    path.join(workspace, "qdoc.config.mjs"),
    config.configPath,
    path.join(workspace, "vite.config.ts"),
  ];
}

async function findNewestSourceMtime(paths) {
  const times = await Promise.all(paths.map((sourcePath) => findNewestMtime(sourcePath)));
  return Math.max(0, ...times);
}

async function findNewestMtime(sourcePath) {
  try {
    const stat = await fs.stat(sourcePath);
    if (!stat.isDirectory()) return stat.mtimeMs;
    const entries = await fs.readdir(sourcePath, { withFileTypes: true });
    const times = await Promise.all(entries.map((entry) => findNewestMtime(path.join(sourcePath, entry.name))));
    return Math.max(stat.mtimeMs, ...times);
  } catch {
    return 0;
  }
}

function extractDeployUrl(output) {
  const match = output.match(/https:\/\/[^\s]+\.pages\.dev/);
  return match?.[0]?.replace(/\/$/, "");
}
