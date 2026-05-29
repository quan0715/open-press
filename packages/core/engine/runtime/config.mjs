import fs from "node:fs/promises";
import path from "node:path";
import { normalizePageGeometry } from "./page-geometry.mjs";

const DEFAULT_CONFIG = {
  title: "OpenPress Document",
  subtitle: "",
  organization: "",
  workspaceLabel: "",
  documentDir: ".",
  sourceDir: "content",
  mediaDir: "media",
  themeDir: "theme",
  designDoc: "design.md",
  componentsDir: "components",
  publicDir: "public/openpress",
  outputDir: "dist",
  captionNumbering: {
    figure: "Figure",
    table: "Table",
    separator: " ",
  },
  pdf: {
    filename: "document.pdf",
  },
  deploy: {
    adapter: "cloudflare-pages",
    source: ".deploy/openpress",
    projectName: null,
    commitDirty: false,
    requiresConfirmation: true,
  },
  page: null,
};

// 1.0 contract: the only user-writable config lives in package.json
// under the "openpress" field. The engine reads it synchronously so
// the deploy command can resolve its adapter before any React render.
//
// Everything else is convention (path layout) or declared on
// <Press> / <Workspace> JSX props (document metadata).
export async function loadConfig(root = ".") {
  const workspaceRoot = path.resolve(root);
  const packageOpenpress = await readPackageOpenpressField(workspaceRoot);
  return normalizeConfig(workspaceRoot, packageOpenpress ?? {});
}

async function readPackageOpenpressField(workspaceRoot) {
  const pkgPath = path.join(workspaceRoot, "package.json");
  try {
    const raw = await fs.readFile(pkgPath, "utf8");
    const parsed = JSON.parse(raw);
    const field = parsed?.openpress;
    return (field && typeof field === "object" && !Array.isArray(field)) ? field : null;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    if (error instanceof SyntaxError) {
      throw new Error(`Malformed package.json at ${pkgPath}: ${error.message}`);
    }
    throw error;
  }
}

// Convention-only fields. The user can't override these — they're part
// of OpenPress's product surface. If you don't like the layout, your
// project isn't an OpenPress workspace.
const CONVENTION = {
  documentDir: "press",
  sourceDir: "chapters",
  mediaDir: "media",
  themeDir: "theme",
  componentsDir: "components",
  designDoc: "design.md",
  publicDir: "public/openpress",
  outputDir: "dist-react",
};

export function normalizeConfig(root, userConfig = {}, configPath = path.join(root, "package.json")) {
  const config = {
    root: path.resolve(root),
    configPath,
    // Document metadata defaults — actual values are merged in by
    // loadReactDocumentEntry from <Press> / <Workspace> JSX props.
    title: DEFAULT_CONFIG.title,
    subtitle: "",
    organization: "",
    workspaceLabel: "",
    // Paths — fixed conventions, not user-configurable.
    documentDir: CONVENTION.documentDir,
    sourceDir: CONVENTION.sourceDir,
    mediaDir: CONVENTION.mediaDir,
    themeDir: CONVENTION.themeDir,
    designDoc: CONVENTION.designDoc,
    componentsDir: CONVENTION.componentsDir,
    publicDir: CONVENTION.publicDir,
    outputDir: CONVENTION.outputDir,
    captionNumbering: captionNumberingValue(userConfig.captionNumbering, DEFAULT_CONFIG.captionNumbering),
    page: normalizePageGeometry(userConfig.page ?? DEFAULT_CONFIG.page),
    pdf: {
      filename: fileNameValue(userConfig.pdf?.filename, DEFAULT_CONFIG.pdf.filename),
    },
    deploy: {
      adapter: stringValue(userConfig.deploy?.adapter, DEFAULT_CONFIG.deploy.adapter),
      source: relativePathValue(userConfig.deploy?.source, DEFAULT_CONFIG.deploy.source),
      projectName: optionalStringValue(userConfig.deploy?.projectName, DEFAULT_CONFIG.deploy.projectName),
      commitDirty: booleanValue(userConfig.deploy?.commitDirty, DEFAULT_CONFIG.deploy.commitDirty),
      requiresConfirmation: booleanValue(userConfig.deploy?.requiresConfirmation, DEFAULT_CONFIG.deploy.requiresConfirmation),
    },
  };

  const documentRoot = config.documentDir === "." ? config.root : path.join(config.root, config.documentDir);
  config.paths = {
    documentRoot,
    sourceDir: path.join(documentRoot, config.sourceDir),
    mediaDir: path.join(documentRoot, config.mediaDir),
    themeDir: path.join(documentRoot, config.themeDir),
    designDoc: path.join(documentRoot, config.designDoc),
    componentsDir: path.join(documentRoot, config.componentsDir),
    publicDir: path.join(config.root, config.publicDir),
    outputDir: path.join(config.root, config.outputDir),
    pdf: path.join(config.root, config.outputDir, config.pdf.filename),
    deploySource: path.join(config.root, config.deploy.source),
    deployMetadata: path.join(config.root, config.deploy.source, "openpress", "deploy.json"),
  };

  return config;
}

export function publicPdfHref(config) {
  return `/${config.pdf.filename}`;
}

function stringValue(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function optionalStringValue(value, fallback) {
  if (value === null) return null;
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function captionNumberingValue(value, fallback) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    figure: optionalStringValue(input.figure, fallback.figure) ?? fallback.figure,
    table: optionalStringValue(input.table, fallback.table) ?? fallback.table,
    separator: typeof input.separator === "string" ? input.separator : fallback.separator,
  };
}

function booleanValue(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function fileNameValue(value, fallback) {
  const fileName = stringValue(value, fallback);
  if (fileName.includes("/") || fileName.includes("\\") || fileName === "." || fileName === "..") {
    throw new Error(`OpenPress config pdf.filename must be a file name, got: ${fileName}`);
  }
  return fileName;
}

function relativePathValue(value, fallback) {
  const raw = stringValue(value, fallback).replaceAll("\\", "/");
  if (path.isAbsolute(raw)) throw new Error(`OpenPress config paths must be relative, got: ${raw}`);
  const normalized = path.posix.normalize(raw).replace(/^\.\//, "");
  if (!normalized || normalized === "." || normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`OpenPress config path escapes workspace: ${raw}`);
  }
  return normalized;
}
