import { readFile, writeFile } from "node:fs/promises";

/**
 * Patches the <Press title="..."> prop inside a press/<slug>/press.tsx file. If the
 * template's seed value is already `title="..."`, the regex rewrites
 * it in place; if no title prop is present, the function adds one
 * directly after the `<Press` opening token. JSX shape is preserved.
 */
export async function patchPressTitle(entryPath: string, title: string): Promise<void> {
  const source = await readFile(entryPath, "utf8");
  const escaped = escapeStringForJs(title);
  const existing = /(<Press\b[^>]*\btitle\s*=\s*)("[^"]*"|'[^']*'|\{`[^`]*`\})/;
  let next: string;
  if (existing.test(source)) {
    next = source.replace(existing, `$1"${escaped}"`);
  } else {
    // No title prop yet — inject one right after `<Press`.
    next = source.replace(/<Press\b/, `<Press title="${escaped}"`);
  }
  await writeFile(entryPath, next);
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
