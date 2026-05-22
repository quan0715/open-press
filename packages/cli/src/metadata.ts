import { readFile, writeFile } from "node:fs/promises";

export interface MetadataPatch {
  title?: string;
  subtitle?: string;
  organization?: string;
  author?: string;
}

/**
 * Patches openpress.config.mjs string fields (title/subtitle/organization/author).
 * Uses regex replace — assumes the export default object literal pattern produced
 * by the bundled style packs.
 */
export async function patchOpenpressConfig(configPath: string, patch: MetadataPatch): Promise<void> {
  let source = await readFile(configPath, "utf8");

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null || value === "") continue;
    const escaped = escapeStringForJs(value);
    const re = new RegExp(`(${key}\\s*:\\s*)("[^"]*"|'[^']*'|\`[^\`]*\`)`, "m");
    if (re.test(source)) {
      source = source.replace(re, `$1"${escaped}"`);
    } else {
      // Field doesn't exist — append before closing brace of `export default {`.
      source = source.replace(/(export\s+default\s*\{)/, `$1\n  ${key}: "${escaped}",`);
    }
  }

  await writeFile(configPath, source);
}

function escapeStringForJs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Patches the workspace package.json: sets name/version/private appropriately and
 * drops framework-distribution fields (publishConfig, files, bin, repository, etc.)
 * that don't make sense for a generated user workspace.
 */
export async function patchPackageJsonName(packagePath: string, newName: string): Promise<string> {
  const text = await readFile(packagePath, "utf8");
  const pkg = JSON.parse(text) as Record<string, unknown>;
  const prevName = typeof pkg.name === "string" ? pkg.name : "";

  pkg.name = newName;
  pkg.version = "0.0.0";
  pkg.private = true;
  pkg.description = `open-press workspace: ${newName}`;

  // Drop fields that only make sense on the framework npm package.
  for (const field of [
    "publishConfig",
    "files",
    "bin",
    "main",
    "types",
    "exports",
    "homepage",
    "repository",
    "bugs",
    "keywords",
    "license",
    "author",
  ]) {
    delete pkg[field];
  }

  await writeFile(packagePath, JSON.stringify(pkg, null, 2) + "\n");
  return prevName;
}
