import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { loadConfig } from "../runtime/config.mjs";

export async function applySlideReorder({ root = ".", slug, order }) {
  const config = await loadConfig(root);
  const pressFilePath = path.resolve(config.paths.documentRoot, slug, "press.tsx");
  const source = await fs.readFile(pressFilePath, "utf8");
  const reordered = reorderSlidesInSource(source, order, pressFilePath);
  await fs.writeFile(pressFilePath, reordered, "utf8");
}

export function reorderSlidesInSource(source, order, filename = "press.tsx") {
  const sourceFile = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  const pressEl = findPressElement(sourceFile);
  if (!pressEl) throw new Error("No <Press> element found in source");

  const slideElements = [];
  for (const child of pressEl.children) {
    if (!ts.isJsxElement(child) && !ts.isJsxSelfClosingElement(child)) continue;
    const opening = ts.isJsxElement(child) ? child.openingElement : child;
    const id = getJsxStringProp(opening, "id");
    if (id) slideElements.push({ id, text: source.slice(child.pos, child.end) });
  }

  if (slideElements.length === 0) throw new Error("<Press> has no JSX children with id props");
  if (order.length !== slideElements.length) {
    throw new Error(`Order length ${order.length} does not match slide count ${slideElements.length}`);
  }

  const slideByKey = Object.fromEntries(slideElements.map((s) => [s.id, s.text]));
  for (const key of order) {
    if (!slideByKey[key]) throw new Error(`Slide id "${key}" not found`);
  }

  let slideIdx = 0;
  const innerParts = [];
  for (const child of pressEl.children) {
    if (ts.isJsxText(child)) {
      innerParts.push(source.slice(child.pos, child.end));
    } else if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
      const opening = ts.isJsxElement(child) ? child.openingElement : child;
      const id = getJsxStringProp(opening, "id");
      if (id) {
        innerParts.push(slideByKey[order[slideIdx++]]);
      } else {
        innerParts.push(source.slice(child.pos, child.end));
      }
    } else {
      innerParts.push(source.slice(child.pos, child.end));
    }
  }

  return (
    source.slice(0, pressEl.openingElement.end) +
    innerParts.join("") +
    source.slice(pressEl.closingElement.pos)
  );
}

function findPressElement(node) {
  if (ts.isJsxElement(node)) {
    const tagName = node.openingElement.tagName;
    if (ts.isIdentifier(tagName) && tagName.text === "Press") return node;
  }
  let found = null;
  ts.forEachChild(node, (child) => {
    if (!found) found = findPressElement(child);
  });
  return found;
}

function getJsxStringProp(element, propName) {
  for (const attr of element.attributes.properties) {
    if (!ts.isJsxAttribute(attr)) continue;
    if (!ts.isIdentifier(attr.name) || attr.name.text !== propName) continue;
    if (!attr.initializer) continue;
    if (ts.isStringLiteral(attr.initializer)) return attr.initializer.text;
    if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
      const expr = attr.initializer.expression;
      if (ts.isStringLiteral(expr)) return expr.text;
    }
  }
  return null;
}
