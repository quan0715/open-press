import fs from "node:fs/promises";
import path from "node:path";
import { exportDocument } from "../document-export.mjs";
import { buildVisualWordDocument, buildWordDocument, wordFilenameFromPdfFilename } from "../output/word-docx.mjs";
import { parsePageSelector } from "../runtime/page-selector.mjs";
import { buildReactImages, formatOpenPressCommand, pressSuffixedFilename } from "./_shared.mjs";

export async function run({ root, config, options, recurse }) {
  const outputPath = options.output ? path.resolve(root, options.output) : undefined;
  const pressSlug = normalizePressSlug(options.press);
  const visual = options.visual === true;
  if (options.pages && !visual) {
    throw new Error("Word --pages is only available with --visual.");
  }
  const pageSelector = visual && options.pages ? parsePageSelector(options.pages) : null;

  if (options.dryRun) {
    if (options.noBuild) {
      console.log("Input: public/openpress/workspace.json");
    } else if (visual) {
      console.log(`Command: ${formatOpenPressCommand(["render", ".", "--renderer", "react"])}`);
    } else {
      console.log(`Command: ${formatOpenPressCommand(["export", "."])}`);
    }
    if (pressSlug) console.log(`Press: ${pressSlug} (validated against workspace manifest at run time)`);
    console.log(visual ? "Format: Word .docx (visual snapshot, page Press only)" : "Format: Word .docx (editable semantic, page Press only)");
    if (visual && pageSelector) {
      console.log(`Page selector: ${options.pages} (resolved at capture time against the rendered page count)`);
    }
    if (visual) {
      console.log(`Snapshots: ${path.relative(root, path.join(defaultWordImagesOutputPath(config, pressSlug), "page-001.png"))}`);
    }
    console.log(`Output: ${path.relative(root, outputPath ?? defaultWordOutputPath(config, pressSlug))}`);
    return 0;
  }

  const result = await buildReactWord({
    root,
    config,
    outPath: outputPath,
    noBuild: options.noBuild,
    pressSlug,
    visual,
    recurse,
    host: options.host,
    port: options.port,
    pageSelector,
  });
  console.log(`OpenPress Word: ${path.relative(root, result.docxPath)}`);
  return 0;
}

export async function buildReactWord({
  root,
  config,
  outPath,
  noBuild = false,
  pressSlug = "",
  visual = false,
  recurse,
  host = "127.0.0.1",
  port = "5187",
  pageSelector = null,
}) {
  if (visual) {
    return await buildVisualReactWord({ root, config, outPath, noBuild, pressSlug, recurse, host, port, pageSelector });
  }

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

async function buildVisualReactWord({ root, config, outPath, noBuild = false, pressSlug = "", recurse, host, port, pageSelector }) {
  const selection = noBuild
    ? await readRenderedPressDocument(config, pressSlug)
    : await exportPressDocument(root, pressSlug);

  const suffixSlug = pressSlug ? selection.slug : "";
  const docxPath = outPath ?? defaultWordOutputPath(config, suffixSlug);
  const imagesOutDir = defaultWordImagesOutputPath(config, suffixSlug);
  await fs.rm(imagesOutDir, { recursive: true, force: true });

  const imageResult = await buildReactImages({
    root,
    config,
    outDir: imagesOutDir,
    host,
    port,
    noBuild,
    recurse,
    pageSelector,
    pressSlug: selection.slug || null,
  });
  const images = await Promise.all(imageResult.files.map(async (file, index) => ({
    filename: path.basename(file),
    data: await fs.readFile(file),
    contentType: "image/png",
    alt: `${selection.title || selection.document?.meta?.title || "OpenPress document"} page ${imageResult.selectedPageNumbers?.[index] ?? index + 1}`,
  })));
  const docx = buildVisualWordDocument({ document: selection.document, images });
  await fs.mkdir(path.dirname(docxPath), { recursive: true });
  await fs.writeFile(docxPath, docx);
  return {
    docxPath,
    pressSlug: selection.slug,
    title: selection.title,
    imagesOutDir,
  };
}

function defaultWordOutputPath(config, pressSlug = "") {
  const base = wordFilenameFromPdfFilename(config.pdf.filename);
  const filename = pressSlug ? pressSuffixedFilename(base, pressSlug) : base;
  return path.join(config.paths.outputDir, filename);
}

function defaultWordImagesOutputPath(config, pressSlug = "") {
  const folder = pressSlug ? `word-images-${pressSlug}` : "word-images";
  return path.join(config.paths.outputDir, folder);
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
