import path from "node:path";
import { normalizePageGeometry } from "./page-geometry.mjs";
import {
  loadWorkspaceSettings,
  normalizeWorkspaceSettings,
  workspaceSettingsPath,
} from "./workspace-settings.mjs";

const DEFAULT_CONFIG = {
  title: "OpenPress Document",
  subtitle: "",
  organization: "",
  workspaceLabel: "",
  documentDir: ".",
  sourceDir: ".",
  mediaDir: "shared/media",
  themeDir: "shared/theme",
  designDoc: "design.md",
  componentsDir: "shared/components",
  publicDir: "public/openpress",
  outputDir: "dist",
};

export async function loadConfig(root = ".") {
  const workspaceRoot = path.resolve(root);
  const loaded = await loadWorkspaceSettings(workspaceRoot);
  return normalizeConfig(workspaceRoot, loaded.settings, loaded.settingsPath, {
    settingsSource: loaded.source,
    hasLegacySettings: loaded.hasLegacy,
    legacyUnknownKeys: loaded.legacyUnknownKeys,
  });
}

// Convention-only fields. The user can't override these — they're part
// of OpenPress's product surface. If you don't like the layout, your
// project isn't an OpenPress workspace.
const CONVENTION = {
  documentDir: "press",
  sourceDir: ".",
  mediaDir: "shared/media",
  themeDir: "shared/theme",
  componentsDir: "shared/components",
  designDoc: "design.md",
  publicDir: "public/openpress",
  outputDir: "dist-react",
};

export function normalizeConfig(
  root,
  userConfig = {},
  configPath = workspaceSettingsPath(root),
  metadata = {},
) {
  const settings = normalizeWorkspaceSettings(userConfig);
  const config = {
    root: path.resolve(root),
    configPath,
    settings,
    settingsSource: metadata.settingsSource ?? "defaults",
    hasLegacySettings: metadata.hasLegacySettings ?? false,
    legacyUnknownKeys: metadata.legacyUnknownKeys ?? [],
    appearance: settings.appearance,
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
    captionNumbering: settings.captionNumbering,
    page: normalizePageGeometry(settings.page),
    pdf: settings.pdf,
    deploy: settings.deploy,
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
    settings: workspaceSettingsPath(config.root),
  };

  return config;
}

export function publicPdfHref(config) {
  return `/${config.pdf.filename}`;
}
