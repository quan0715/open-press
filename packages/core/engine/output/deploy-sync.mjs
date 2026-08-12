import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { copyDirectory } from "../runtime/file-utils.mjs";

export async function deploySync(root, sourceDir, deployDir) {
  const dist = path.join(root, sourceDir);
  const deploy = path.join(root, deployDir);
  await fs.rm(deploy, { recursive: true, force: true });
  await fs.mkdir(deploy, { recursive: true });
  await copyDirectory(dist, deploy);
}

export async function stagePressDeploy(root, sourceDir, deployDir, pressSlug) {
  const dist = path.join(root, sourceDir);
  const deploy = path.join(root, deployDir);
  const parent = path.dirname(deploy);
  const staging = path.join(parent, `.${path.basename(deploy)}.openpress-${randomUUID()}`);

  await fs.mkdir(parent, { recursive: true });
  await fs.rm(staging, { recursive: true, force: true });
  try {
    await copyDirectory(dist, staging);
    await isolatePressStage(staging, pressSlug);
    await replaceDirectory(staging, deploy);
  } catch (error) {
    await fs.rm(staging, { recursive: true, force: true });
    throw error;
  }
}

async function isolatePressStage(staging, pressSlug) {
  const openpressDir = path.join(staging, "openpress");
  const manifestPath = path.join(openpressDir, "workspace.json");
  const manifest = await readJson(manifestPath, "workspace manifest");
  const presses = Array.isArray(manifest?.presses) ? manifest.presses : [];
  const selected = presses.find((press) => press?.slug === pressSlug);
  if (!selected) {
    throw new Error(`Cannot stage --press ${JSON.stringify(pressSlug)}: it is not present in the rendered workspace manifest.`);
  }

  await fs.writeFile(
    manifestPath,
    `${JSON.stringify({ ...manifest, presses: [selected] }, null, 2)}\n`,
    "utf8",
  );

  const entries = await fs.readdir(openpressDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === pressSlug) continue;
    const candidate = path.join(openpressDir, entry.name);
    if (await exists(path.join(candidate, "document.json"))) {
      await fs.rm(candidate, { recursive: true, force: true });
    }
  }

  const selectedDocument = path.join(openpressDir, pressSlug, "document.json");
  if (!(await exists(selectedDocument))) {
    throw new Error(`Cannot stage --press ${JSON.stringify(pressSlug)}: rendered document is missing at ${selectedDocument}.`);
  }
  await fs.copyFile(selectedDocument, path.join(openpressDir, "document.json"));
  await filterSearchCorpus(path.join(openpressDir, "search-corpus.json"), pressSlug);
  await filterReferencedMedia(openpressDir);
}

async function filterSearchCorpus(corpusPath, pressSlug) {
  if (!(await exists(corpusPath))) return;
  const corpus = await readJson(corpusPath, "search corpus");
  const prefix = `press/${pressSlug}/`;
  const files = Array.isArray(corpus?.files) ? corpus.files : [];
  await fs.writeFile(
    corpusPath,
    `${JSON.stringify({ ...corpus, files: files.filter((file) => typeof file?.path === "string" && file.path.startsWith(prefix)) })}\n`,
    "utf8",
  );
}

async function filterReferencedMedia(openpressDir) {
  const mediaDir = path.join(openpressDir, "media");
  if (!(await exists(mediaDir))) return;
  const references = new Set();
  await collectMediaReferences(openpressDir, references);
  await removeUnreferencedMedia(mediaDir, mediaDir, references);
}

async function collectMediaReferences(dir, references) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const candidate = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "media") continue;
      await collectMediaReferences(candidate, references);
      continue;
    }
    if (!/\.(?:css|html?|json)$/i.test(entry.name)) continue;
    let text = "";
    try {
      text = await fs.readFile(candidate, "utf8");
    } catch {
      continue;
    }
    for (const match of text.matchAll(/\/openpress\/media\/([^"'\s)?#]+)/g)) {
      const decoded = safeDecode(match[1]);
      if (decoded && isSafeRelativeMediaPath(decoded)) references.add(decoded);
    }
  }
}

async function removeUnreferencedMedia(mediaDir, currentDir, references) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const candidate = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await removeUnreferencedMedia(mediaDir, candidate, references);
      const remaining = await fs.readdir(candidate);
      if (remaining.length === 0) await fs.rmdir(candidate);
      continue;
    }
    const relative = path.relative(mediaDir, candidate).replaceAll(path.sep, "/");
    if (!references.has(relative)) await fs.rm(candidate, { force: true });
  }
}

async function replaceDirectory(staging, deploy) {
  const backup = `${deploy}.previous-${randomUUID()}`;
  const hadExisting = await exists(deploy);
  if (hadExisting) await fs.rename(deploy, backup);
  try {
    await fs.rename(staging, deploy);
  } catch (error) {
    if (hadExisting) await fs.rename(backup, deploy);
    throw error;
  }
  if (hadExisting) await fs.rm(backup, { recursive: true, force: true });
}

async function readJson(filePath, label) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read ${label} at ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
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

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isSafeRelativeMediaPath(value) {
  const normalized = value.replaceAll("\\", "/");
  return Boolean(normalized) && !normalized.startsWith("/") && !normalized.split("/").includes("..");
}
