import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { extractSlideMetaFromSource, extractSlideNotesFromSource } from "./slides-folder-meta.mjs";

export async function discoverSlideFiles(pressDir) {
  const slidesRoot = path.join(pressDir, "slides");
  let entries = [];
  try {
    entries = await fs.readdir(slidesRoot, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const out = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const absolutePath = path.join(slidesRoot, entry.name, "slide.tsx");
    try {
      const stat = await fs.stat(absolutePath);
      if (stat.isFile()) out.push({ id: entry.name, absolutePath, pressDir });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

export function parseSlideIndexSource(source, filename = "press.tsx") {
  return collectSlideIndex(source, filename).markers;
}

export function pressSourceDeclaresSlidesType(source, filename = "press.tsx") {
  const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const press = findPressElement(sourceFile);
  if (!press) return false;
  const type = getJsxStringProp(press.openingElement, "type");
  return type === "slides";
}

export function validateSlideSource(source, filename = "slide.tsx") {
  const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const errors = [];
  let hasDefaultExport = false;

  visit(sourceFile, (node) => {
    if (isDefaultExported(node)) hasDefaultExport = true;
    if (ts.isExportAssignment(node)) hasDefaultExport = true;
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name)) {
      if (node.name.text === "objectId" || node.name.text === "data-op-id") {
        errors.push(`${filename}: hand-authored ${node.name.text} is forbidden`);
      }
    }
  });

  if (!hasDefaultExport) errors.push(`${filename}: missing default export`);
  try {
    extractSlideMetaFromSource(source, filename);
  } catch (error) {
    errors.push(error?.message ?? String(error));
  }
  try {
    extractSlideNotesFromSource(source, filename);
  } catch (error) {
    errors.push(error?.message ?? String(error));
  }
  return errors;
}

export async function validateSlidesFolderContract({ pressDir, pressSource }) {
  const discovered = await discoverSlideFiles(pressDir);
  const index = collectSlideIndex(pressSource, path.join(pressDir, "press.tsx"));
  const markers = index.markers;
  const errors = [...index.errors];
  const markerCounts = new Map();
  for (const marker of markers) markerCounts.set(marker.id, (markerCounts.get(marker.id) ?? 0) + 1);

  const discoveredIds = new Set(discovered.map((slide) => slide.id));
  for (const marker of markers) {
    if (!discoveredIds.has(marker.id)) {
      errors.push(`Slide marker ${marker.id} has no matching slides/${marker.id}/slide.tsx`);
    }
  }
  for (const [id, count] of markerCounts) {
    if (count !== 1) errors.push(`Slide marker ${id} appears ${count} times; expected exactly once`);
  }
  for (const slide of discovered) {
    if (!markerCounts.has(slide.id)) errors.push(`slides/${slide.id}/slide.tsx is unreferenced`);
    const source = await fs.readFile(slide.absolutePath, "utf8");
    errors.push(...validateSlideSource(source, slide.absolutePath));
  }

  return { ok: errors.length === 0, errors, discovered, markers };
}

function collectSlideIndex(source, filename) {
  const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const press = findPressElement(sourceFile);
  const markers = [];
  const errors = [];
  if (!press) return { markers, errors };

  for (const child of press.children) {
    if (ts.isJsxText(child)) {
      if (child.text.trim()) errors.push(`${filename}: <Press type="slides"> may only contain <Slide id /> children`);
      continue;
    }
    if (ts.isJsxExpression(child)) {
      if (child.expression) errors.push(`${filename}: <Press type="slides"> may only contain <Slide id /> children`);
      continue;
    }
    if (!ts.isJsxSelfClosingElement(child) && !ts.isJsxElement(child)) {
      errors.push(`${filename}: <Press type="slides"> may only contain <Slide id /> children`);
      continue;
    }

    const opening = ts.isJsxElement(child) ? child.openingElement : child;
    if (!isTag(opening.tagName, "Slide")) {
      errors.push(`${filename}: <Press type="slides"> may only contain <Slide id /> children`);
      continue;
    }
    if (ts.isJsxElement(child)) {
      errors.push(`${filename}: <Slide id> markers in press.tsx must be self-closing; put content in slides/<id>/slide.tsx`);
    }
    const id = getJsxStringProp(opening, "id");
    if (!id) {
      errors.push(`${filename}: <Slide> marker is missing a string id prop`);
      continue;
    }
    markers.push({ id, skip: hasBooleanProp(opening, "skip") });
  }

  return { markers, errors };
}

function findPressElement(node) {
  if (ts.isJsxElement(node) && isTag(node.openingElement.tagName, "Press")) return node;
  let found = null;
  ts.forEachChild(node, (child) => {
    if (!found) found = findPressElement(child);
  });
  return found;
}

function isTag(tagName, name) {
  return ts.isIdentifier(tagName) && tagName.text === name;
}

function getJsxStringProp(element, propName) {
  for (const attr of element.attributes.properties) {
    if (!ts.isJsxAttribute(attr) || !ts.isIdentifier(attr.name) || attr.name.text !== propName) continue;
    if (ts.isStringLiteral(attr.initializer)) return attr.initializer.text;
    if (ts.isJsxExpression(attr.initializer) && ts.isStringLiteral(attr.initializer.expression)) {
      return attr.initializer.expression.text;
    }
  }
  return null;
}

function hasBooleanProp(element, propName) {
  for (const attr of element.attributes.properties) {
    if (!ts.isJsxAttribute(attr) || !ts.isIdentifier(attr.name) || attr.name.text !== propName) continue;
    if (!attr.initializer) return true;
    if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression?.kind === ts.SyntaxKind.TrueKeyword) {
      return true;
    }
  }
  return false;
}

function isDefaultExported(node) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword));
}

function visit(node, fn) {
  fn(node);
  ts.forEachChild(node, (child) => visit(child, fn));
}
