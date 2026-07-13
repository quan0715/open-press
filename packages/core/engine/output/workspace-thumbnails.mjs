import fs from "node:fs/promises";
import path from "node:path";
import { pressPrintUrl } from "../commands/_shared.mjs";
import { captureUrlPagesToPng } from "./chrome-pdf.mjs";
import { parsePageSelector } from "../runtime/page-selector.mjs";

const FIRST_PAGE_SELECTOR = parsePageSelector("1");

export async function generateWorkspaceThumbnails({
  root,
  config,
  host,
  port,
  startServer,
  stopServer,
  capturePages = captureUrlPagesToPng,
}) {
  const publicOpenpressDir = config.paths.publicDir;
  const builtOpenpressDir = path.join(config.paths.outputDir, "openpress");
  const publicManifestPath = path.join(publicOpenpressDir, "workspace.json");
  const manifest = await readJson(publicManifestPath);
  const presses = Array.isArray(manifest?.presses) ? manifest.presses : [];
  if (presses.length === 0) return [];

  const server = await startServer();
  const generated = [];
  try {
    for (const press of presses) {
      const slug = normalizeSlug(press.slug);
      if (!slug) continue;
      const thumbnailUrl = `/openpress/${slug}/thumbnail.png`;
      const tempDir = path.join(root, ".openpress", "tmp", "workspace-thumbnails", slug);
      await fs.rm(tempDir, { recursive: true, force: true });
      await fs.mkdir(tempDir, { recursive: true });
      const capture = await capturePages({
        root,
        url: pressPrintUrl(host, port, slug),
        outDir: tempDir,
        pageSelector: FIRST_PAGE_SELECTOR,
      });
      const sourceFile = Array.isArray(capture?.files) ? capture.files[0] : null;
      if (!sourceFile) continue;

      const publicTarget = path.join(publicOpenpressDir, slug, "thumbnail.png");
      const builtTarget = path.join(builtOpenpressDir, slug, "thumbnail.png");
      await fs.mkdir(path.dirname(publicTarget), { recursive: true });
      await fs.mkdir(path.dirname(builtTarget), { recursive: true });
      await fs.copyFile(sourceFile, publicTarget);
      await fs.copyFile(sourceFile, builtTarget);
      generated.push({ slug, thumbnailUrl, publicPath: publicTarget, builtPath: builtTarget });
    }
  } finally {
    await stopServer(server);
  }

  await patchManifest(publicManifestPath, generated);
  await patchManifest(path.join(builtOpenpressDir, "workspace.json"), generated);
  return generated;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function patchManifest(manifestPath, generated) {
  let manifest;
  try {
    manifest = await readJson(manifestPath);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  const bySlug = new Map(generated.map((entry) => [entry.slug, entry.thumbnailUrl]));
  const presses = Array.isArray(manifest?.presses) ? manifest.presses : [];
  const next = {
    ...manifest,
    presses: presses.map((press) => {
      const slug = normalizeSlug(press.slug);
      const thumbnailUrl = bySlug.get(slug);
      return thumbnailUrl ? { ...press, thumbnailUrl } : press;
    }),
  };
  await fs.writeFile(manifestPath, JSON.stringify(next, null, 2), "utf8");
}

function normalizeSlug(value) {
  return String(value ?? "").trim().replace(/^\/+|\/+$/g, "");
}
