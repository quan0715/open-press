import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const TEXT_SOURCE_FILE_RE = /\.[jt]sx$/;

export function textSourceTransformPlugin({ workspaceRoot, documentRoot }) {
  const resolvedWorkspaceRoot = realpathIfExists(path.resolve(workspaceRoot));
  const resolvedDocumentRoot = realpathIfExists(path.resolve(documentRoot));

  return {
    name: "openpress-text-source-transform",
    enforce: "pre",
    transform(code, id) {
      const filePath = cleanViteId(id);
      if (!TEXT_SOURCE_FILE_RE.test(filePath)) return null;
      if (!isInsidePath(filePath, resolvedDocumentRoot)) return null;

      const relativePath = path.relative(resolvedWorkspaceRoot, filePath).replaceAll(path.sep, "/");
      if (!relativePath || relativePath.startsWith("..")) return null;

      const nextCode = addLiteralTextSourceProps(code, {
        filePath,
        sourcePath: relativePath,
      });
      if (nextCode === code) return null;
      return { code: nextCode, map: null };
    },
  };
}

export function addLiteralTextSourceProps(code, { filePath = "index.tsx", sourcePath = "press/index.tsx" } = {}) {
  const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const textRefs = collectOpenPressTextRefs(sourceFile);
  if (textRefs.identifiers.size === 0 && textRefs.namespaces.size === 0) return code;

  const insertions = [];

  const visit = (node) => {
    if (ts.isJsxElement(node) && isTextElementName(node.openingElement.tagName, textRefs)) {
      const opening = node.openingElement;
      if (!hasJsxAttribute(opening, "source")) {
        const literal = literalTextChildRange(node, sourceFile, code);
        if (literal) {
          insertions.push({
            offset: opening.end - 1,
            text: ` source={${sourcePropExpression({
              sourcePath,
              objectId: stringLiteralAttribute(opening, "objectId"),
              range: literal.range,
            })}}`,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (insertions.length === 0) return code;
  let out = code;
  for (const insertion of insertions.sort((a, b) => b.offset - a.offset)) {
    out = `${out.slice(0, insertion.offset)}${insertion.text}${out.slice(insertion.offset)}`;
  }
  return out;
}

function collectOpenPressTextRefs(sourceFile) {
  const identifiers = new Set();
  const namespaces = new Set();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!statement.importClause) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (statement.moduleSpecifier.text !== "@open-press/core") continue;

    const bindings = statement.importClause.namedBindings;
    if (!bindings) continue;
    if (ts.isNamespaceImport(bindings)) {
      namespaces.add(bindings.name.text);
      continue;
    }
    if (!ts.isNamedImports(bindings)) continue;

    for (const element of bindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      if (importedName === "Text") identifiers.add(element.name.text);
    }
  }

  return { identifiers, namespaces };
}

function literalTextChildRange(node, sourceFile, code) {
  const textChildren = [];
  for (const child of node.children) {
    if (ts.isJsxText(child)) {
      const raw = code.slice(child.pos, child.end);
      if (raw.trim()) textChildren.push({ child, raw });
      continue;
    }
    if (ts.isJsxExpression(child) && !child.expression && code.slice(child.pos, child.end).trim() === "{}") continue;
    if (code.slice(child.pos, child.end).trim()) return null;
  }
  if (textChildren.length !== 1) return null;

  const { child, raw } = textChildren[0];
  const text = raw.trim();
  const startInRaw = raw.indexOf(text);
  const startOffset = child.pos + startInRaw;
  const endOffset = startOffset + text.length;
  const start = sourceFile.getLineAndCharacterOfPosition(startOffset);
  const end = sourceFile.getLineAndCharacterOfPosition(endOffset);
  return {
    text,
    range: {
      line: start.line + 1,
      column: start.character + 1,
      endLine: end.line + 1,
      endColumn: end.character + 1,
    },
  };
}

function sourcePropExpression({ sourcePath, objectId, range }) {
  const props = [
    `path: ${JSON.stringify(sourcePath)}`,
    `kind: "tsx-text"`,
    `source: { line: ${range.line}, column: ${range.column}, endLine: ${range.endLine}, endColumn: ${range.endColumn} }`,
  ];
  if (objectId) props.splice(2, 0, `objectId: ${JSON.stringify(objectId)}`);
  return `{ ${props.join(", ")} }`;
}

function isTextElementName(name, refs) {
  if (ts.isIdentifier(name)) return refs.identifiers.has(name.text);
  if (!ts.isJsxMemberExpression(name)) return false;
  if (name.name.text !== "Text") return false;
  return ts.isIdentifier(name.expression) && refs.namespaces.has(name.expression.text);
}

function hasJsxAttribute(opening, name) {
  return opening.attributes.properties.some((prop) =>
    ts.isJsxAttribute(prop) && prop.name.text === name
  );
}

function stringLiteralAttribute(opening, name) {
  const attr = opening.attributes.properties.find((prop) =>
    ts.isJsxAttribute(prop) && prop.name.text === name
  );
  if (!attr || !ts.isJsxAttribute(attr) || !attr.initializer) return undefined;
  if (ts.isStringLiteral(attr.initializer)) return attr.initializer.text;
  return undefined;
}

function cleanViteId(id) {
  const withoutQuery = String(id ?? "").split("?")[0];
  const fsPath = withoutQuery.startsWith("/@fs/") ? withoutQuery.slice("/@fs".length) : withoutQuery;
  return realpathIfExists(path.resolve(fsPath));
}

function realpathIfExists(filePath) {
  try {
    return fs.realpathSync.native(filePath);
  } catch {
    return filePath;
  }
}

function isInsidePath(filePath, parentPath) {
  const relative = path.relative(parentPath, filePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
