// Shared implementation of the local `/__openpress/status` and
// `/__openpress/deploy` endpoints.
//
// Vite serves these routes in both dev and preview modes. Keeping the deploy
// behavior here prevents local API wiring from carrying a second copy of the
// status, dirty-check, and deploy lifecycle.

import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { publicPdfHref } from "../runtime/config.mjs";
import { normalizeDeployPressSlug, resolveDeployTarget } from "../runtime/deploy-target.mjs";
import { pressSuffixedFilename } from "../runtime/press-filename.mjs";

/**
 * @param {object} opts
 * @param {object} opts.config         Resolved OpenPress config for the workspace.
 * @param {string} opts.workspaceRoot  Absolute workspace root.
 * @param {string} opts.frameworkRoot  Absolute @open-press/core package root.
 * @param {string} opts.cliEntry       Absolute path to engine/cli.mjs.
 */
export function createDeployEndpoints({ config, workspaceRoot, frameworkRoot, cliEntry }) {
  return {
    handleStatusRequest,
    handleDeployRequest,
  };

  async function handleStatusRequest(req, res, url) {
    if (req.method !== "GET") {
      writeJson(res, 405, { ok: false, message: "Status endpoint requires GET." });
      return;
    }

    const requestUrl = url ?? new URL(req.url ?? "/", "http://localhost");
    const slug = normalizeDeployPressSlug(requestUrl.searchParams.get("press"));
    const resolution = resolveStatusTarget(slug);
    const target = resolution.target;
    const deployConfigured = resolution.configured && isDeployConfigured(target);
    const deploymentInfo = deployConfigured
      ? await readDeploymentInfo(target)
      : { deployed_at: undefined, pdf: publicPdfHref(config), public_url: undefined };
    const dirty = deployConfigured ? await isDeploymentDirty(deploymentInfo.deployed_at, target.pressSlug) : false;

    writeJson(res, 200, {
      ok: true,
      deployed_at: deploymentInfo.deployed_at,
      pdf: deploymentInfo.pdf,
      public_url: deploymentInfo.public_url,
      dirty,
      deploy_configured: deployConfigured,
      deploy_adapter: config.deploy.adapter,
      deploy_source: target.source,
      deploy_project_name: target.projectName,
      deploy_setup_message: deploySetupMessage(target, resolution.message),
    });
  }

  async function handleDeployRequest(req, res) {
    if (req.method !== "POST") {
      writeJson(res, 405, { ok: false, message: "Deploy endpoint requires POST." });
      return;
    }

    const body = await readJsonBody(req);
    const slug = normalizeDeployPressSlug(body?.press);
    const command = slug ? `open-press deploy . --confirm --press ${slug}` : "open-press deploy . --confirm";
    const pdfFilename = pressSuffixedFilename(config.pdf.filename, slug);
    const resolution = resolveStatusTarget(slug);
    const target = resolution.target;

    if (!resolution.configured || !isDeployConfigured(target)) {
      writeJson(res, 400, {
        ok: false,
        code: 2,
        message: deploySetupMessage(target, resolution.message),
        deploy_configured: false,
        deploy_adapter: config.deploy.adapter,
        deploy_source: target.source,
        deploy_project_name: target.projectName,
        command,
      });
      return;
    }

    const result = await runDeploy(slug);
    const deployedUrl = extractDeployUrl(result.stdout);
    if (result.code === 0 && deployedUrl) {
      await writeDeploymentPublicUrl(target, deployedUrl, pdfFilename);
    }
    const deploymentInfo = await readDeploymentInfo(target);

    writeJson(res, result.code === 0 ? 200 : 500, {
      ok: result.code === 0,
      code: result.code,
      deployed_at: deploymentInfo.deployed_at,
      pdf: deployedUrl ? `${deployedUrl}/${pdfFilename}` : deploymentInfo.pdf,
      public_url: deployedUrl ?? deploymentInfo.public_url,
      dirty: false,
      command,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  }

  // `resolveDeployTarget` throws when `--press <slug>` has no
  // `deploy.presses.<slug>` entry. That is the right behavior for the CLI,
  // which must abort. Here the same condition is an expected state the UI
  // renders as a setup prompt, so fall back to the workspace target and carry
  // the message through.
  function resolveStatusTarget(slug) {
    try {
      return { target: resolveDeployTarget(config, slug), configured: true, message: undefined };
    } catch (error) {
      return {
        target: {
          pressSlug: slug,
          source: config.deploy.source,
          projectName: config.deploy.projectName,
        },
        configured: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  function isDeployConfigured(target) {
    if (config.deploy.adapter === "cloudflare-pages") {
      return typeof target.projectName === "string" && target.projectName.trim().length > 0;
    }
    return true;
  }

  function deploySetupMessage(target, resolutionMessage) {
    if (resolutionMessage) return resolutionMessage;
    if (isDeployConfigured(target)) return undefined;
    if (config.deploy.adapter === "cloudflare-pages") {
      return target.pressSlug
        ? `Cloudflare Pages deployment requires deploy.presses.${target.pressSlug}.projectName in openpress/settings.json.`
        : "Cloudflare Pages deployment requires `deploy.projectName` in openpress/settings.json.";
    }
    return `Deployment adapter \`${config.deploy.adapter}\` is not configured.`;
  }

  function runDeploy(slug) {
    const args = [cliEntry, "deploy", ".", "--confirm"];
    if (slug) args.push("--press", slug);
    return new Promise((resolve) => {
      const child = spawn("node", args, { cwd: workspaceRoot, shell: false });
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

  function deployMetadataPath(target) {
    return path.join(workspaceRoot, target.source, "openpress", "deploy.json");
  }

  async function readDeploymentInfo(target) {
    try {
      const deployConfig = JSON.parse(await fs.readFile(deployMetadataPath(target), "utf8"));
      return {
        deployed_at: typeof deployConfig.deployed_at === "string" ? deployConfig.deployed_at : undefined,
        pdf: typeof deployConfig.pdf === "string" ? deployConfig.pdf : publicPdfHref(config),
        public_url: typeof deployConfig.public_url === "string" ? deployConfig.public_url : undefined,
      };
    } catch {
      return { deployed_at: undefined, pdf: publicPdfHref(config), public_url: undefined };
    }
  }

  async function writeDeploymentPublicUrl(target, publicUrl, pdfFilename) {
    const metadataPath = deployMetadataPath(target);
    let deployConfig = {};
    try {
      deployConfig = JSON.parse(await fs.readFile(metadataPath, "utf8"));
    } catch {
      deployConfig = {};
    }
    await fs.mkdir(path.dirname(metadataPath), { recursive: true });
    await fs.writeFile(
      metadataPath,
      `${JSON.stringify({ ...deployConfig, pdf: `${publicUrl}/${pdfFilename}`, public_url: publicUrl }, null, 2)}\n`,
      "utf8",
    );
  }

  async function isDeploymentDirty(deployedAt, pressSlug) {
    if (!deployedAt) return false;
    const deployedTime = new Date(deployedAt).getTime();
    if (Number.isNaN(deployedTime)) return false;
    const newest = await findNewestSourceMtime(deploymentSourcePaths(pressSlug));
    return newest > deployedTime + 1000;
  }

  function deploymentSourcePaths(pressSlug) {
    return [
      pressSlug ? path.join(config.paths.documentRoot, pressSlug) : config.paths.documentRoot,
      path.join(frameworkRoot, "src"),
      path.join(frameworkRoot, "index.html"),
      path.join(frameworkRoot, "vite.config.ts"),
      path.join(workspaceRoot, "package.json"),
      // Appearance, page geometry, caption numbering, and the PDF filename all
      // change rendered output, so settings edits must mark the site dirty.
      config.configPath,
    ];
  }
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

async function readJsonBody(req) {
  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    if (chunks.length === 0) return null;
    const text = Buffer.concat(chunks).toString("utf8");
    if (!text.trim()) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function writeJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(`${JSON.stringify(body, null, 2)}\n`);
}
