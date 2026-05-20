import fs from "node:fs/promises";
import path from "node:path";
import { loadQDocConfig } from "./config.mjs";
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

export async function discoverWorkspace(startPath = ".") {
  let current = path.resolve(startPath);
  try {
    const stat = await fs.stat(current);
    if (!stat.isDirectory()) current = path.dirname(current);
  } catch {
    current = path.dirname(current);
  }
  while (true) {
    const configPath = path.join(current, "qdoc.config.mjs");
    try {
      await fs.access(configPath);
      return current;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) throw new Error(`No QDoc workspace found from ${startPath}`);
      current = parent;
    }
  }
}

export async function validateWorkspace(root) {
  const config = await loadQDocConfig(root);
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
    if (!(await exists(target))) add("error", `config.${key}`, `Configured QDoc path \`${key}\` does not exist.`, target);
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
    add("warning", "config.title", "qdoc.config.mjs `title` is empty; the workbench will show the default placeholder.", activeConfig.configPath);
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
      for (const marker of findQDocCommentMarkers(file.text)) {
        add(
          "warning",
          "react-comments.pending",
          `Pending QDoc comment \`${marker.id}\` remains in React source; run apply-comments or resolve it manually before publishing.`,
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

  mark("react-pagination");
  const documentJsonPath = path.join(activeConfig.paths.publicDir, "document.json");
  const exportedDocument = await readJsonIfExists(documentJsonPath);
  const paginationWarnings = exportedDocument?.source?.pagination?.warnings;
  if (Array.isArray(paginationWarnings)) {
    for (const warning of paginationWarnings) {
      if (warning?.code !== "block-overflows-page") continue;
      const warningPath = typeof warning.path === "string" && warning.path
        ? path.resolve(activeConfig.root, warning.path)
        : documentJsonPath;
      add(
        "warning",
        "react-pagination.block-overflows-page",
        `Block \`${warning.blockId ?? "(unknown)"}\` exceeds the configured page safe area during React pagination.`,
        warningPath,
        {
          blockId: warning.blockId,
          height: warning.height,
          pageSafeHeightPx: warning.pageSafeHeightPx,
          source: warning.source,
        },
      );
    }
  }

  return createIssueReport({
    kind: "validation",
    checked,
    issues,
    okMessage: "QDoc validation OK",
  });
}

function findQDocCommentMarkers(text) {
  const markers = [];
  const lines = String(text ?? "").split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const match = line.match(/@qdoc-comment\b[^}]*\bid="([^"]+)"/);
    if (!match) continue;
    markers.push({ id: match[1], line: index + 1 });
  }
  return markers;
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
