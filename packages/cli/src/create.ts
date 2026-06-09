import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { writeSlidesPress } from "./slides-template.js";

export interface CreateOptions {
  name: string;
  type: "slides" | "pages" | undefined;
  title: string | undefined;
}

export async function create(cwd: string, options: CreateOptions): Promise<void> {
  await verifyWorkspace(cwd);

  if (!options.type) {
    throw new Error("open-press create requires --type slides.");
  }
  if (options.type === "pages") {
    throw new Error("--type pages is not yet supported. Use --type slides.");
  }
  if (!options.name) {
    throw new Error("open-press create requires a <name> argument.");
  }

  const pressRoot = path.join(cwd, "press", options.name);
  if (existsSync(pressRoot)) {
    throw new Error(`press/${options.name} already exists.`);
  }

  await mkdir(pressRoot, { recursive: true });
  await writeSlidesPress(pressRoot, {
    pressName: options.name,
    title: options.title ?? options.name,
  });

  process.stdout.write(`> Created press/${options.name}\n`);
}

async function verifyWorkspace(cwd: string): Promise<void> {
  const pkgPath = path.join(cwd, "package.json");
  if (!existsSync(pkgPath)) {
    throw new Error("Not an OpenPress workspace: no package.json found.");
  }
  const pkg = JSON.parse(await readFile(pkgPath, "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const hasCoreInDeps = !!pkg.dependencies?.["@open-press/core"];
  const hasCoreInDevDeps = !!pkg.devDependencies?.["@open-press/core"];
  if (!hasCoreInDeps && !hasCoreInDevDeps) {
    throw new Error("Not an OpenPress workspace: package.json does not list @open-press/core as a dependency.");
  }
}
