import fs from "node:fs/promises";
import path from "node:path";
import { normalizePageGeometry } from "./page-geometry.mjs";

export const WORKSPACE_SETTINGS_VERSION = 1;
export const WORKSPACE_COLOR_MODES = ["system", "dark", "light"];
export const WORKSPACE_ACCENTS = ["amber", "blue", "emerald", "violet", "rose"];
export const LEGACY_OPENPRESS_KEYS = ["page", "captionNumbering", "pdf", "deploy"];

export const DEFAULT_WORKSPACE_SETTINGS = Object.freeze({
  version: WORKSPACE_SETTINGS_VERSION,
  appearance: Object.freeze({
    colorMode: "dark",
    accent: "amber",
  }),
  page: "a4",
  captionNumbering: Object.freeze({
    figure: "Figure",
    table: "Table",
    separator: " ",
  }),
  pdf: Object.freeze({
    filename: "document.pdf",
  }),
  deploy: Object.freeze({
    adapter: "cloudflare-pages",
    source: ".deploy/openpress",
    projectName: null,
    commitDirty: false,
    requiresConfirmation: true,
  }),
});

export function workspaceSettingsPath(root) {
  return path.join(path.resolve(root), "openpress", "settings.json");
}

export async function loadWorkspaceSettings(root = ".") {
  const workspaceRoot = path.resolve(root);
  const settingsPath = workspaceSettingsPath(workspaceRoot);
  const source = await readOptionalJson(settingsPath, "OpenPress settings");
  const legacy = await readLegacyOpenpress(workspaceRoot);

  if (source.exists) {
    assertPlainObject(source.value, "OpenPress settings");
    if (!Object.hasOwn(source.value, "version")) {
      throw new Error(`OpenPress settings at ${settingsPath} require version ${WORKSPACE_SETTINGS_VERSION}.`);
    }
    assertKnownKeys(source.value, [
      "version",
      "appearance",
      ...LEGACY_OPENPRESS_KEYS,
    ], "OpenPress settings");
  }

  const merged = mergeDefined(legacy.known, source.exists ? source.value : {});
  let settings;
  try {
    settings = normalizeWorkspaceSettings(merged);
  } catch (error) {
    if (source.exists) {
      throw new Error(`Invalid OpenPress settings at ${settingsPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
    throw error;
  }

  return {
    settings,
    source: source.exists ? "settings" : legacy.exists ? "package" : "defaults",
    settingsPath,
    hasSettingsFile: source.exists,
    hasLegacy: legacy.exists,
    legacyOpenpress: legacy.value,
    legacyUnknownKeys: legacy.unknownKeys,
  };
}

export function normalizeWorkspaceSettings(input = {}) {
  assertPlainObject(input, "OpenPress settings");
  assertKnownKeys(input, [
    "version",
    "appearance",
    ...LEGACY_OPENPRESS_KEYS,
  ], "OpenPress settings");

  const version = input.version ?? WORKSPACE_SETTINGS_VERSION;
  if (version !== WORKSPACE_SETTINGS_VERSION) {
    throw new Error(
      `OpenPress settings version must be ${WORKSPACE_SETTINGS_VERSION}, got ${JSON.stringify(version)}.`,
    );
  }

  const appearance = objectValue(input.appearance, "appearance");
  assertKnownKeys(appearance, ["colorMode", "accent"], "appearance");
  const colorMode = enumValue(
    appearance.colorMode,
    WORKSPACE_COLOR_MODES,
    DEFAULT_WORKSPACE_SETTINGS.appearance.colorMode,
    "appearance.colorMode",
  );
  const accent = enumValue(
    appearance.accent,
    WORKSPACE_ACCENTS,
    DEFAULT_WORKSPACE_SETTINGS.appearance.accent,
    "appearance.accent",
  );

  const rawPage = input.page === undefined ? DEFAULT_WORKSPACE_SETTINGS.page : cloneJson(input.page);
  normalizePageGeometry(rawPage);

  const captionNumbering = objectValue(input.captionNumbering, "captionNumbering");
  assertKnownKeys(captionNumbering, ["figure", "table", "separator"], "captionNumbering");

  const pdf = objectValue(input.pdf, "pdf");
  assertKnownKeys(pdf, ["filename"], "pdf");

  const deploy = objectValue(input.deploy, "deploy");
  assertKnownKeys(
    deploy,
    ["adapter", "source", "projectName", "commitDirty", "requiresConfirmation"],
    "deploy",
  );

  return {
    version,
    appearance: {
      colorMode,
      accent,
    },
    page: rawPage,
    captionNumbering: {
      figure: optionalStringValue(
        captionNumbering.figure,
        DEFAULT_WORKSPACE_SETTINGS.captionNumbering.figure,
        "captionNumbering.figure",
      ),
      table: optionalStringValue(
        captionNumbering.table,
        DEFAULT_WORKSPACE_SETTINGS.captionNumbering.table,
        "captionNumbering.table",
      ),
      separator: stringAllowEmptyValue(
        captionNumbering.separator,
        DEFAULT_WORKSPACE_SETTINGS.captionNumbering.separator,
        "captionNumbering.separator",
      ),
    },
    pdf: {
      filename: fileNameValue(pdf.filename, DEFAULT_WORKSPACE_SETTINGS.pdf.filename),
    },
    deploy: {
      adapter: stringValue(deploy.adapter, DEFAULT_WORKSPACE_SETTINGS.deploy.adapter, "deploy.adapter"),
      source: relativePathValue(deploy.source, DEFAULT_WORKSPACE_SETTINGS.deploy.source),
      projectName: nullableStringValue(
        deploy.projectName,
        DEFAULT_WORKSPACE_SETTINGS.deploy.projectName,
        "deploy.projectName",
      ),
      commitDirty: booleanValue(
        deploy.commitDirty,
        DEFAULT_WORKSPACE_SETTINGS.deploy.commitDirty,
        "deploy.commitDirty",
      ),
      requiresConfirmation: booleanValue(
        deploy.requiresConfirmation,
        DEFAULT_WORKSPACE_SETTINGS.deploy.requiresConfirmation,
        "deploy.requiresConfirmation",
      ),
    },
  };
}

export function publicWorkspaceSettings(settings) {
  const normalized = normalizeWorkspaceSettings(settings);
  return {
    version: normalized.version,
    appearance: { ...normalized.appearance },
  };
}

export async function writeWorkspaceSettings(root, input) {
  const normalized = normalizeWorkspaceSettings(input);
  const target = workspaceSettingsPath(root);
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.mkdir(path.dirname(target), { recursive: true });
  try {
    await fs.writeFile(temporary, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
    await fs.rename(temporary, target);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
  return normalized;
}

async function readLegacyOpenpress(root) {
  const packagePath = path.join(root, "package.json");
  const pkg = await readOptionalJson(packagePath, "package.json");
  if (!pkg.exists) {
    return { exists: false, value: null, known: {}, unknownKeys: [] };
  }
  assertPlainObject(pkg.value, "package.json");
  const value = pkg.value.openpress;
  if (value == null) {
    return { exists: false, value: null, known: {}, unknownKeys: [] };
  }
  assertPlainObject(value, "package.json#openpress");
  const unknownKeys = Object.keys(value).filter((key) => !LEGACY_OPENPRESS_KEYS.includes(key));
  return {
    exists: true,
    value,
    known: Object.fromEntries(
      Object.entries(value).filter(([key]) => LEGACY_OPENPRESS_KEYS.includes(key)),
    ),
    unknownKeys,
  };
}

async function readOptionalJson(filePath, label) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    try {
      return { exists: true, value: JSON.parse(raw) };
    } catch (error) {
      throw new Error(`Malformed ${label} at ${filePath}: ${error.message}`);
    }
  } catch (error) {
    if (error?.code === "ENOENT") return { exists: false, value: null };
    throw error;
  }
}

function mergeDefined(base, override) {
  if (!isPlainObject(base)) return cloneJson(override);
  if (!isPlainObject(override)) return cloneJson(override);
  const result = { ...cloneJson(base) };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    result[key] = isPlainObject(value) && isPlainObject(result[key])
      ? mergeDefined(result[key], value)
      : cloneJson(value);
  }
  return result;
}

function objectValue(value, field) {
  if (value === undefined) return {};
  assertPlainObject(value, field);
  return value;
}

function assertPlainObject(value, field) {
  if (!isPlainObject(value)) {
    throw new Error(`${field} must be an object.`);
  }
}

function assertKnownKeys(value, allowed, field) {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    throw new Error(`${field} contains unsupported field${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}.`);
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function enumValue(value, allowed, fallback, field) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error(`${field} must be one of: ${allowed.join(", ")}.`);
  }
  return value;
}

function stringValue(value, fallback, field) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

function optionalStringValue(value, fallback, field) {
  if (value === undefined || value === null) return fallback;
  return stringValue(value, fallback, field);
}

function nullableStringValue(value, fallback, field) {
  if (value === undefined) return fallback;
  if (value === null) return null;
  return stringValue(value, fallback, field);
}

function stringAllowEmptyValue(value, fallback, field) {
  if (value === undefined) return fallback;
  if (typeof value !== "string") throw new Error(`${field} must be a string.`);
  return value;
}

function booleanValue(value, fallback, field) {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw new Error(`${field} must be a boolean.`);
  return value;
}

function fileNameValue(value, fallback) {
  const fileName = stringValue(value, fallback, "pdf.filename");
  if (fileName.includes("/") || fileName.includes("\\") || fileName === "." || fileName === "..") {
    throw new Error(`pdf.filename must be a file name, got: ${fileName}.`);
  }
  return fileName;
}

function relativePathValue(value, fallback) {
  const raw = stringValue(value, fallback, "deploy.source").replaceAll("\\", "/");
  if (path.isAbsolute(raw)) throw new Error(`deploy.source must be relative, got: ${raw}.`);
  const normalized = path.posix.normalize(raw).replace(/^\.\//, "");
  if (!normalized || normalized === "." || normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`deploy.source escapes the workspace: ${raw}.`);
  }
  return normalized;
}

function cloneJson(value) {
  if (value === undefined || value === null || typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value));
}
