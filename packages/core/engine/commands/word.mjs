import fs from "node:fs/promises";
import path from "node:path";
import { exportDocument } from "../document-export.mjs";
import { buildWordDocument, wordFilenameFromPdfFilename } from "../output/word-docx.mjs";
import { formatOpenPressCommand, pressSuffixedFilename } from "./_shared.mjs";

export async function run({ root, config, options }) {
  const outputPath = options.output ? path.resolve(root, options.output) : undefined;
  const pressSlug = normalizePressSlug(options.press);

  if (options.dryRun) {
    if (options.noBuild) {
      console.log("Input: public/openpress/workspace.json");
    } else {
      console.log(`Command: ${formatOpenPressCommand(["export", "."])}`);
    }
    if (pressSlug) console.log(`Press: ${pressSlug} (validated against workspace manifest at run time)`);
    console.log("Format: Word .docx (page Press only)");
    console.log(`Output: ${path.relative(root, outputPath ?? defaultWordOutputPath(config, pressSlug))}`);
    return 0;
  }

  const result = await buildReactWord({
    root,
    config,
    outPath: outputPath,
    noBuild: options.noBuild,
    pressSlug,
  });
  console.log(`OpenPress Word: ${path.relative(root, result.docxPath)}`);
  return 0;
}

export async function buildReactWord({ root, config, outPath, noBuild = false, pressSlug = "" }) {
  const selection = noBuild
    ? await readRenderedPressDocument(config, pressSlug)
    : await exportPressDocument(root, pressSlug);

  const suffixSlug = pressSlug ? selection.slug : "";
  const docxPath = outPath ?? defaultWordOutputPath(config, suffixSlug);
  const docx = buildWordDocument({ document: selection.document });
  await fs.mkdir(path.dirname(docxPath), { recursive: true });
  await fs.writeFile(docxPath, docx);
  return {
    docxPath,
    pressSlug: selection.slug,
    title: selection.title,
  };
}

function defaultWordOutputPath(config, pressSlug = "") {
  const base = wordFilenameFromPdfFilename(config.pdf.filename);
  const filename = pressSlug ? pressSuffixedFilename(base, pressSlug) : base;
  return path.join(config.paths.outputDir, filename);
}

async function exportPressDocument(root, pressSlug) {
  const result = await exportDocument(root);
  return selectExportedPress(result?.presses ?? [], pressSlug);
}

async function readRenderedPressDocument(config, pressSlug) {
  const manifestPath = path.join(config.paths.publicDir, "workspace.json");
  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(
        `Cannot export Word with --no-build: workspace manifest not found at ${manifestPath}. ` +
          "Run open-press export . first, or drop --no-build.",
      );
    }
    throw error;
  }

  const manifestPress = selectManifestPress(Array.isArray(manifest?.presses) ? manifest.presses : [], pressSlug);
  const documentPath = path.join(config.paths.publicDir, manifestPress.slug, "document.json");
  const document = JSON.parse(await fs.readFile(documentPath, "utf8"));
  return {
    slug: manifestPress.slug,
    title: manifestPress.title ?? document?.meta?.title ?? "",
    document,
  };
}

function selectExportedPress(presses, pressSlug) {
  if (presses.length === 0) {
    throw new Error("OpenPress export produced no Press documents.");
  }
  const normalized = normalizePressSlug(pressSlug);
  if (!normalized) {
    const firstPagePress = presses.find(isPageExportedPress);
    if (!firstPagePress) {
      throw new Error("Word export only supports page Press documents; this workspace has no page Press entries.");
    }
    return {
      slug: firstPagePress.slug,
      title: firstPagePress.readerDocument?.meta?.title ?? "",
      document: firstPagePress.readerDocument,
    };
  }
  const match = presses.find((press) => normalizePressSlug(press.slug) === normalized);
  if (!match) throw unknownPressError(pressSlug, presses.map((press) => press.slug));
  return {
    slug: match.slug,
    title: match.readerDocument?.meta?.title ?? "",
    document: match.readerDocument,
  };
}

function selectManifestPress(presses, pressSlug) {
  if (presses.length === 0) {
    throw new Error("Workspace manifest declares no Press entries.");
  }
  const normalized = normalizePressSlug(pressSlug);
  if (!normalized) {
    const firstPagePress = presses.find(isPageManifestPress);
    if (!firstPagePress) {
      throw new Error("Word export only supports page Press documents; this workspace has no page Press entries.");
    }
    return firstPagePress;
  }
  const match = presses.find((press) => normalizePressSlug(press.slug) === normalized);
  if (!match) throw unknownPressError(pressSlug, presses.map((press) => press.slug));
  return match;
}

function isPageExportedPress(press) {
  return (press?.pressType ?? press?.readerDocument?.meta?.type ?? "pages") === "pages";
}

function isPageManifestPress(press) {
  return (press?.type ?? "pages") === "pages";
}

function unknownPressError(pressSlug, knownSlugs) {
  const listed = knownSlugs.filter(Boolean).join(", ") || "(none)";
  return new Error(`Unknown --press "${pressSlug}". Known slugs: ${listed}.`);
}

function normalizePressSlug(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^\/+|\/+$/g, "");
}
