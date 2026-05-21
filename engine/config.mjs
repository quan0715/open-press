import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

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
};

export async function loadConfig(root = ".") {
  const workspaceRoot = path.resolve(root);
  const configPath = path.join(workspaceRoot, "openpress.config.mjs");
  const rootConfig = await readUserConfig(configPath);
  const { config, sourceConfigPath } = await resolveUserConfig(workspaceRoot, rootConfig, configPath);
  return normalizeConfig(workspaceRoot, config, sourceConfigPath);
}

export function normalizeConfig(root, userConfig = {}, configPath = path.join(root, "openpress.config.mjs")) {
  const config = {
    root: path.resolve(root),
    configPath,
    title: stringValue(userConfig.title, DEFAULT_CONFIG.title),
    subtitle: optionalStringValue(userConfig.subtitle, DEFAULT_CONFIG.subtitle) ?? "",
    organization: optionalStringValue(userConfig.organization, DEFAULT_CONFIG.organization) ?? "",
    workspaceLabel: optionalStringValue(userConfig.workspaceLabel, DEFAULT_CONFIG.workspaceLabel) ?? "",
    documentDir: documentPathValue(userConfig.documentDir, DEFAULT_CONFIG.documentDir),
    sourceDir: relativePathValue(userConfig.sourceDir, DEFAULT_CONFIG.sourceDir),
    mediaDir: relativePathValue(userConfig.mediaDir, DEFAULT_CONFIG.mediaDir),
    themeDir: relativePathValue(userConfig.themeDir, DEFAULT_CONFIG.themeDir),
    designDoc: relativePathValue(userConfig.designDoc, DEFAULT_CONFIG.designDoc),
    componentsDir: relativePathValue(userConfig.componentsDir, DEFAULT_CONFIG.componentsDir),
    publicDir: relativePathValue(userConfig.publicDir, DEFAULT_CONFIG.publicDir),
    outputDir: relativePathValue(userConfig.outputDir, DEFAULT_CONFIG.outputDir),
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

async function readUserConfig(configPath) {
  try {
    const stat = await fs.stat(configPath);
    const configUrl = `${pathToFileURL(configPath).href}?mtime=${stat.mtimeMs}`;
    const mod = await import(configUrl);
    return mod.default ?? {};
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

async function resolveUserConfig(root, rootConfig, configPath) {
  const documentConfigPath = configPathValue(rootConfig.config ?? rootConfig.documentConfig);
  if (!documentConfigPath) {
    return { config: rootConfig, sourceConfigPath: configPath };
  }

  const sourceConfigPath = path.resolve(root, documentConfigPath);
  const documentConfig = await readUserConfig(sourceConfigPath);
  return {
    config: { ...documentConfig, ...rootConfig },
    sourceConfigPath,
  };
}

function stringValue(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function optionalStringValue(value, fallback) {
  if (value === null) return null;
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
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

function configPathValue(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  return relativePathValue(value, null);
}

function documentPathValue(value, fallback) {
  const raw = stringValue(value, fallback).replaceAll("\\", "/");
  if (path.isAbsolute(raw)) throw new Error(`OpenPress config paths must be relative, got: ${raw}`);
  const normalized = path.posix.normalize(raw).replace(/^\.\//, "");
  if (normalized === ".") return ".";
  if (!normalized || normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`OpenPress config path escapes workspace: ${raw}`);
  }
  return normalized;
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
