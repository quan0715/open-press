import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "./config.mjs";
import { createIssue, createIssueReport } from "./issue-report.mjs";
import { collectSourceTextFiles } from "./source-text-tools.mjs";
import { collectActiveContentFiles, resolveActiveSourceWorkspace, sourceDirectoryExists } from "./source-workspace.mjs";

// Adapters that publish the document to a URL anyone on the internet can reach.
// `deploy.requiresConfirmation: true` is mandatory for these so an automated
// pipeline (or a careless command) cannot ship without an explicit human step.
// Adapters not in this set (local file copy, custom in-house tooling, null)
// can opt out of the confirmation gate.
const PUBLIC_DEPLOY_ADAPTERS = new Set([
  "cloudflare-pages",
  "github-pages",
  "netlify",
  "vercel",
]);

// A directory is an OpenPress workspace if it contains a
// press/index.tsx entry, or a package.json with an "openpress" field.
async function isWorkspaceRoot(dir) {
  try {
    await fs.access(path.join(dir, "press", "index.tsx"));
    return true;
  } catch {}
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(dir, "package.json"), "utf8"));
    if (pkg?.openpress && typeof pkg.openpress === "object") return true;
  } catch {}
  return false;
}

export async function discoverWorkspace(startPath = ".") {
  let current = path.resolve(startPath);
  try {
    const stat = await fs.stat(current);
    if (!stat.isDirectory()) current = path.dirname(current);
  } catch {
    current = path.dirname(current);
  }
  while (true) {
    if (await isWorkspaceRoot(current)) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error(`No OpenPress workspace found from ${startPath}`);
    current = parent;
  }
}

export async function validateWorkspace(root) {
  const config = await loadConfig(root);
  const sourceWorkspace = await resolveActiveSourceWorkspace(config);
  const activeConfig = sourceWorkspace.config;
  const issues = [];
  const checked = [];
  const mark = (name) => {
    if (!checked.includes(name)) checked.push(name);
  };
  const add = (level, code, message, filePath = null, detail = undefined) => issues.push(createIssue({ level, code, message, path: filePath, detail }));

  mark("config");
  for (const [key, target] of [
    ["sourceDir", sourceWorkspace.sourceDir],
    ["mediaDir", activeConfig.paths.mediaDir],
    ["themeDir", activeConfig.paths.themeDir],
    ["designDoc", activeConfig.paths.designDoc],
    ["componentsDir", activeConfig.paths.componentsDir],
  ]) {
    if (!(await exists(target))) add("error", `config.${key}`, `Configured OpenPress path \`${key}\` does not exist.`, target);
  }

  mark("design-doc");
  const designDoc = activeConfig.paths.designDoc;
  if (!(await exists(designDoc))) {
    add("error", "design-doc.missing", "Design document must exist.", designDoc);
  }

  mark("deploy-gate");
  if (PUBLIC_DEPLOY_ADAPTERS.has(config.deploy.adapter) && config.deploy.requiresConfirmation !== true) {
    add(
      "error",
      "deploy.confirmation",
      `Public deploy adapter \`${config.deploy.adapter}\` must require user confirmation (set deploy.requiresConfirmation: true).`,
      config.configPath,
    );
  }

  mark(sourceWorkspace.checkedName);
  if (!(typeof activeConfig.title === "string" && activeConfig.title.trim())) {
    add("warning", "press.title", "<Press title> is missing in press/index.tsx; the workbench will show the default placeholder.", activeConfig.configPath);
  }
  if (!(await sourceDirectoryExists(sourceWorkspace))) {
    add("warning", sourceWorkspace.missingCode, sourceWorkspace.missingMessage, sourceWorkspace.sourceDir);
  } else {
    const contentFiles = await collectActiveContentFiles(sourceWorkspace, { skipUnderscoreFiles: true });
    if (contentFiles.length === 0) {
      add("warning", sourceWorkspace.emptyCode, sourceWorkspace.emptyMessage, sourceWorkspace.sourceDir);
    }
  }

  if (sourceWorkspace.kind === "react-mdx") {
    mark("react-comments");
    const sourceFiles = await collectSourceTextFiles(activeConfig, { scope: "all" });
    for (const file of sourceFiles) {
      for (const marker of findCommentMarkers(file.text)) {
        add(
          "warning",
          "react-comments.pending",
          `Pending OpenPress comment \`${marker.id}\` remains in React source; run apply-comments or resolve it manually before publishing.`,
          file.absolutePath,
          {
            id: marker.id,
            line: marker.line,
            path: file.path ?? file.relativePath,
          },
        );
      }
    }
  }

  mark("react-source");
  const documentJsonPath = path.join(activeConfig.paths.publicDir, "document.json");
  const exportedDocument = await readJsonIfExists(documentJsonPath);
  const pressWarnings = exportedDocument?.source?.warnings;
  if (Array.isArray(pressWarnings)) {
    for (const warning of pressWarnings) {
      const code = typeof warning?.code === "string" && warning.code ? warning.code : "warning";
      add(
        "warning",
        `react-source.${code}`,
        pressWarningMessage(warning),
        documentJsonPath,
        warning,
      );
    }
  }

  return createIssueReport({
    kind: "validation",
    checked,
    issues,
    okMessage: "OpenPress validation OK",
  });
}

function findCommentMarkers(text) {
  const markers = [];
  const lines = String(text ?? "").split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const match = line.match(/@openpress-comment\b[^}]*\bid="([^"]+)"/);
    if (!match) continue;
    markers.push({ id: match[1], line: index + 1 });
  }
  return markers;
}

function pressWarningMessage(warning) {
  if (warning?.code === "chain-overflowed") {
    return `Content chain \`${warning.chainId ?? "(unknown)"}\` overflowed during Press Tree allocation.`;
  }
  if (warning?.code === "chain-has-no-area") {
    return `Content chain \`${warning.chainId ?? "(unknown)"}\` has blocks but no matching MdxArea.`;
  }
  return `Press Tree export warning: ${warning?.code ?? "warning"}.`;
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
