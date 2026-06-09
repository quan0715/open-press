import fs from "node:fs/promises";
import path from "node:path";
import {
  discoverSlideFiles,
  parseSlideIndexSource,
  pressSourceDeclaresSlidesType,
  validateSlidesFolderContract,
} from "../react/slides-folder-model.mjs";
import { extractSlideMetaFromSource } from "../react/slides-folder-meta.mjs";

export async function run({ config, options }) {
  const [subcommand = "status", ...args] = options.commandArgs ?? [];
  if (subcommand === "status") return status({ config, options });
  if (subcommand === "add") return addSlide({ config, options, id: args[0] });
  if (subcommand === "remove") return removeSlide({ config, options, id: args[0] });
  if (subcommand === "rename") return renameSlide({ config, options, oldId: args[0], newId: args[1] });
  if (subcommand === "skip") return setSkip({ config, options, id: args[0], skip: true });
  if (subcommand === "unskip") return setSkip({ config, options, id: args[0], skip: false });
  if (subcommand === "reorder") return reorder({ config, options, id: args[0] });
  throw new Error(`Unknown slide subcommand: ${subcommand}`);
}

async function status({ config, options }) {
  const press = await resolveSlidesPress(config.paths.documentRoot, options.press);
  const pressSource = await fs.readFile(press.pressPath, "utf8");
  const validation = await validateSlidesFolderContract({ pressDir: press.pressDir, pressSource });
  if (!validation.ok) throw new Error(validation.errors.join("\n"));

  const slides = new Map();
  for (const slide of await discoverSlideFiles(press.pressDir)) {
    const source = await fs.readFile(slide.absolutePath, "utf8");
    slides.set(slide.id, { ...slide, meta: extractSlideMetaFromSource(source, slide.absolutePath) });
  }

  const markers = parseSlideIndexSource(pressSource, press.pressPath);
  const active = markers.filter((marker) => !marker.skip);
  const skipped = markers.filter((marker) => marker.skip);

  console.log(`slug: ${press.slug}  (${active.length + skipped.length} slides)`);
  console.log("");
  for (const marker of active) printSlide(marker, slides.get(marker.id));
  if (skipped.length > 0) {
    console.log("");
    for (const marker of skipped) printSlide(marker, slides.get(marker.id), "[skip] ");
  }
  return 0;
}

function printSlide(marker, slide, prefix = "  ") {
  const layout = slide?.meta?.layout || "—";
  console.log(`${prefix}${marker.id.padEnd(12)} ${layout}`);
}

export async function resolveSlidesPress(documentRoot, requestedSlug) {
  const presses = [];
  let entries = [];
  try {
    entries = await fs.readdir(documentRoot, { withFileTypes: true });
  } catch {
    entries = [];
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "shared") continue;
    const pressDir = path.join(documentRoot, entry.name);
    const pressPath = path.join(pressDir, "press.tsx");
    try {
      const source = await fs.readFile(pressPath, "utf8");
      if (pressSourceDeclaresSlidesType(source, pressPath)) presses.push({ slug: entry.name, pressDir, pressPath });
    } catch {}
  }

  if (requestedSlug) {
    const match = presses.find((press) => press.slug === requestedSlug);
    if (!match) {
      throw new Error(`Unknown --press "${requestedSlug}". Available presses: ${presses.map((press) => press.slug).join(", ")}`);
    }
    return match;
  }

  if (presses.length === 1) return presses[0];
  if (presses.length === 0) throw new Error("No Slides press found in workspace");
  throw new Error(`multiple presses found. specify one with --press <slug>\n  ${presses.map((press) => press.slug).join("\n  ")}`);
}

async function addSlide({ config, options, id }) {
  assertSlideId(id);
  const press = await resolveSlidesPress(config.paths.documentRoot, options.press);
  const slideDir = path.join(press.pressDir, "slides", id);
  const slidePath = path.join(slideDir, "slide.tsx");
  const source = await fs.readFile(press.pressPath, "utf8");
  const nextSource = appendSlideMarker(source, id);
  await assertPathMissing(slideDir, `Slide ${id} already exists`);

  let created = false;
  try {
    await fs.mkdir(path.dirname(slideDir), { recursive: true });
    await fs.mkdir(slideDir, { recursive: false });
    created = true;
    await fs.writeFile(slidePath, stubSlideSource(id), "utf8");
    await writeFileAtomically(press.pressPath, nextSource);
  } catch (error) {
    if (created) await fs.rm(slideDir, { recursive: true, force: true });
    throw error;
  }

  console.log(`added slide ${id}`);
  return 0;
}

async function removeSlide({ config, options, id }) {
  assertSlideId(id);
  const press = await resolveSlidesPress(config.paths.documentRoot, options.press);
  const slideDir = path.join(press.pressDir, "slides", id);
  const trashDir = path.join(press.pressDir, "slides", `.${id}.remove-${process.pid}-${Date.now()}`);
  const source = await fs.readFile(press.pressPath, "utf8");
  const nextSource = removeSlideMarker(source, id);

  await fs.rename(slideDir, trashDir);
  try {
    await writeFileAtomically(press.pressPath, nextSource);
  } catch (error) {
    await fs.rename(trashDir, slideDir).catch(() => {});
    throw error;
  }
  await fs.rm(trashDir, { recursive: true, force: true });

  console.log(`removed slide ${id}`);
  return 0;
}

async function renameSlide({ config, options, oldId, newId }) {
  assertSlideId(oldId);
  assertSlideId(newId);
  const press = await resolveSlidesPress(config.paths.documentRoot, options.press);
  const oldDir = path.join(press.pressDir, "slides", oldId);
  const newDir = path.join(press.pressDir, "slides", newId);
  await assertPathMissing(newDir, `Slide ${newId} already exists`);

  const source = await fs.readFile(press.pressPath, "utf8");
  const nextSource = replaceSlideId(source, oldId, newId);
  await fs.rename(oldDir, newDir);
  try {
    await writeFileAtomically(press.pressPath, nextSource);
  } catch (error) {
    await fs.rename(newDir, oldDir).catch(() => {});
    throw error;
  }

  console.log(`renamed slide ${oldId} -> ${newId}`);
  return 0;
}

async function setSkip({ config, options, id, skip }) {
  assertSlideId(id);
  const press = await resolveSlidesPress(config.paths.documentRoot, options.press);
  const source = await fs.readFile(press.pressPath, "utf8");
  await writeFileAtomically(press.pressPath, rewriteSkipProp(source, id, skip));
  console.log(`${skip ? "skipped" : "unskipped"} slide ${id}`);
  return 0;
}

async function reorder({ config, options, id }) {
  const press = await resolveSlidesPress(config.paths.documentRoot, options.press);
  const source = await fs.readFile(press.pressPath, "utf8");
  const current = parseSlideIndexSource(source, press.pressPath).map((marker) => marker.id);
  let order = options.order;

  if (!order) {
    assertSlideId(id);
    if (options.after && options.before) throw new Error("slide reorder accepts only one of --after or --before");
    if (!options.after && !options.before) throw new Error("slide reorder requires --order, --after, or --before");
    const target = options.after ?? options.before;
    assertSlideId(target);
    order = moveSlideInOrder(current, id, { after: options.after, before: options.before });
  }

  const { reorderSlidesInSource } = await import("../react/slide-reorder.mjs");
  await writeFileAtomically(press.pressPath, reorderSlidesInSource(source, order, press.pressPath));
  console.log(`reordered slides: ${order.join(" ")}`);
  return 0;
}

function moveSlideInOrder(order, id, { after, before }) {
  if (!order.includes(id)) throw new Error(`Slide id "${id}" not found`);
  const target = after ?? before;
  if (!order.includes(target)) throw new Error(`Target slide id "${target}" not found`);
  const next = order.filter((item) => item !== id);
  const targetIndex = next.indexOf(target);
  next.splice(after ? targetIndex + 1 : targetIndex, 0, id);
  return next;
}

function stubSlideSource(id) {
  const name = `${toPascalCase(id)}Slide`;
  return `import type { SlideMeta } from "@open-press/core";

export const meta = {} satisfies SlideMeta;

export default function ${name}() {
  return null;
}
`;
}

function appendSlideMarker(source, id) {
  const next = source.replace(/(\s*)<\/Press>/, `$1  <Slide id="${id}" />$1</Press>`);
  if (next === source) throw new Error("No </Press> closing tag found in press.tsx");
  return next;
}

function removeSlideMarker(source, id) {
  const next = source.replace(new RegExp(`\\s*<Slide\\b[^>]*\\bid=["']${escapeRegExp(id)}["'][^>]*/>`), "");
  if (next === source) throw new Error(`Slide id ${id} not found in press.tsx`);
  return next;
}

function replaceSlideId(source, oldId, newId) {
  const next = source.replace(
    new RegExp(`(<Slide\\s+[^>]*\\bid=)["']${escapeRegExp(oldId)}["']`),
    `$1"${newId}"`,
  );
  if (next === source) throw new Error(`Slide id ${oldId} not found in press.tsx`);
  return next;
}

function rewriteSkipProp(source, id, skip) {
  const pattern = new RegExp(`<Slide\\b([^>]*)\\bid=["']${escapeRegExp(id)}["']([^>]*)/>`);
  if (!pattern.test(source)) throw new Error(`Slide id ${id} not found in press.tsx`);
  return source.replace(pattern, (_match, beforeId, afterId) => {
    const attrs = `${beforeId} id="${id}"${afterId}`
      .replace(/\s+skip(?:=(?:\{true\}|"true"|'true'))?/g, "")
      .trim();
    return `<Slide ${attrs}${skip ? " skip" : ""} />`;
  });
}

function assertSlideId(id) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id ?? "")) throw new Error(`Invalid slide id: ${id}`);
}

function toPascalCase(id) {
  return id.split("-").filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join("");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function writeFileAtomically(filePath, contents) {
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmp, contents, "utf8");
  await fs.rename(tmp, filePath);
}

async function assertPathMissing(target, message) {
  try {
    await fs.stat(target);
    throw new Error(message);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
}
