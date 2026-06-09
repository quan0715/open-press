import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "./config.mjs";
import { createIssue, createIssueReport } from "./issue-report.mjs";
import { pressSourceDeclaresSlidesType, validateSlidesFolderContract } from "../react/slides-folder-model.mjs";
import { validateCssImportBoundaries } from "../react/style-discovery.mjs";
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

// A directory is an OpenPress workspace if it contains folder-convention
// Press entries, or a package.json with an "openpress" field.
async function isWorkspaceRoot(dir) {
  try {
    const pressEntries = await fs.readdir(path.join(dir, "press"), { withFileTypes: true });
    if (pressEntries.some((entry) => entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "shared")) {
      for (const entry of pressEntries) {
        if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "shared") continue;
        try {
          await fs.access(path.join(dir, "press", entry.name, "press.tsx"));
          return true;
        } catch {}
      }
    }
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
    ["designDoc", activeConfig.paths.designDoc],
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
    add("warning", "press.title", "<Press title> is missing in press/*/press.tsx; the workbench will show the default placeholder.", activeConfig.configPath);
  }
  if (sourceWorkspace.hasRegisteredSources && !(await sourceDirectoryExists(sourceWorkspace))) {
    add("warning", sourceWorkspace.missingCode, sourceWorkspace.missingMessage, sourceWorkspace.sourceDir);
  } else if (sourceWorkspace.hasRegisteredSources) {
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
  for (const exported of await readExportedPressDocuments(activeConfig.paths.publicDir)) {
    const pressWarnings = exported.document?.source?.warnings;
    if (Array.isArray(pressWarnings)) {
      for (const warning of pressWarnings) {
        const code = typeof warning?.code === "string" && warning.code ? warning.code : "warning";
        add(
          "warning",
          `react-source.${code}`,
          pressWarningMessage(warning),
          exported.path,
          warning,
        );
      }
    }
  }

  mark("slides-folder");
  for (const pressDir of await discoverPressDirs(activeConfig.paths.documentRoot)) {
    const pressPath = path.join(pressDir, "press.tsx");
    let pressSource = "";
    try {
      pressSource = await fs.readFile(pressPath, "utf8");
    } catch {
      continue;
    }
    if (!pressSourceDeclaresSlidesType(pressSource, pressPath)) continue;
    for (const message of validateCssImportBoundaries({ filePath: pressPath, source: pressSource })) {
      add("error", "slides-folder.css", message, pressPath);
    }
    const result = await validateSlidesFolderContract({ pressDir, pressSource });
    for (const message of result.errors) {
      add("error", "slides-folder.contract", message, pressPath);
    }
    for (const slide of result.discovered) {
      const slideSource = await fs.readFile(slide.absolutePath, "utf8");
      for (const message of validateCssImportBoundaries({ filePath: slide.absolutePath, source: slideSource })) {
        add("error", "slides-folder.css", message, slide.absolutePath);
      }
    }
    for (const layoutFile of await collectLayoutFiles(path.join(pressDir, "layouts"))) {
      const layoutSource = await fs.readFile(layoutFile, "utf8");
      for (const message of validateCssImportBoundaries({ filePath: layoutFile, source: layoutSource })) {
        add("error", "slides-folder.css", message, layoutFile);
      }
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

async function readExportedPressDocuments(publicDir) {
  const manifestPath = path.join(publicDir, "workspace.json");
  const manifest = await readJsonIfExists(manifestPath);
  if (!Array.isArray(manifest?.presses)) return [];
  const out = [];
  for (const press of manifest.presses) {
    if (typeof press?.slug !== "string" || !press.slug.trim()) continue;
    const documentJsonPath = path.join(publicDir, press.slug.trim(), "document.json");
    const document = await readJsonIfExists(documentJsonPath);
    if (document) out.push({ path: documentJsonPath, document });
  }
  return out;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function discoverPressDirs(documentRoot) {
  let entries = [];
  try {
    entries = await fs.readdir(documentRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "shared")
    .map((entry) => path.join(documentRoot, entry.name));
}

async function collectLayoutFiles(layoutsDir) {
  const out = [];
  let entries = [];
  try {
    entries = await fs.readdir(layoutsDir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(layoutsDir, entry.name);
    if (entry.isDirectory()) out.push(...await collectLayoutFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}
