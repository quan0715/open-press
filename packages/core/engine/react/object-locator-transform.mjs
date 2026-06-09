import ts from "typescript";

export function injectObjectLocators({ source, filename, slideId }) {
  const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  const map = {};
  let ordinal = 0;

  visit(sourceFile, (node, astPath) => {
    if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) return;
    const elementType = tagNameText(node.tagName);
    if (!elementType || isStructuralElement(elementType)) return;

    for (const attr of node.attributes.properties) {
      if (ts.isJsxAttribute(attr) && ts.isIdentifier(attr.name) && (attr.name.text === "objectId" || attr.name.text === "data-op-id")) {
        throw new Error(`${filename}: hand-authored ${attr.name.text} is forbidden`);
      }
    }

    const id = `${slideId}::${locatorElementName(elementType)}:${ordinal++}`;
    edits.push({ pos: node.tagName.end, text: ` data-op-id="${id}"` });
    map[id] = { slideId, sourceFile: filename, astPath: astPath.join("."), elementType };
  });

  let code = source;
  for (const edit of edits.sort((a, b) => b.pos - a.pos)) {
    code = code.slice(0, edit.pos) + edit.text + code.slice(edit.pos);
  }
  return { code, map };
}

function visit(node, fn, astPath = []) {
  fn(node, astPath);
  let index = 0;
  ts.forEachChild(node, (child) => visit(child, fn, [...astPath, index++]));
}

function tagNameText(tagName) {
  if (ts.isIdentifier(tagName)) return tagName.text;
  if (ts.isPropertyAccessExpression(tagName)) {
    const left = tagNameText(tagName.expression);
    return left ? `${left}.${tagName.name.text}` : tagName.name.text;
  }
  return null;
}

function isStructuralElement(elementType) {
  return new Set(["Press", "Workspace", "Slide", "Fragment", "React.Fragment"]).has(elementType);
}

function locatorElementName(elementType) {
  return elementType
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
