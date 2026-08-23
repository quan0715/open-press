import ts from "typescript";

export function extractSlideMetaFromSource(source, filename = "slide.tsx") {
  const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement) || !hasExport(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== "meta") continue;
      if (!declaration.initializer) return {};
      const expr = unwrapStaticMetaExpression(declaration.initializer);
      if (!ts.isObjectLiteralExpression(expr)) {
        throw new Error(`${filename}: export const meta must be a literal object expression`);
      }
      return objectLiteralToJson(expr, filename);
    }
  }

  for (const statement of sourceFile.statements) {
    if (isMetaReExport(statement)) {
      throw new Error(`${filename}: re-exported meta is not supported; define export const meta as a literal object`);
    }
  }

  return {};
}

export function extractSlideNotesFromSource(source, filename = "slide.tsx") {
  const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement) || !hasExport(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== "notes") continue;
      if (!declaration.initializer) return undefined;
      const expr = unwrapStaticMetaExpression(declaration.initializer);
      if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text.trim();
      throw new Error(`${filename}: export const notes must be a static string literal`);
    }
  }

  for (const statement of sourceFile.statements) {
    if (isNamedReExport(statement, "notes")) {
      throw new Error(`${filename}: re-exported notes is not supported; define export const notes as a string literal`);
    }
  }

  return undefined;
}

export function rewriteSlideNotesInSource(source, notes, filename = "slide.tsx") {
  if (typeof notes !== "string") throw new Error(`${filename}: slide notes must be a string`);
  const normalizedNotes = notes.replace(/\r\n?/g, "\n");
  const nextLiteral = JSON.stringify(normalizedNotes);
  const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement) || !hasExport(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== "notes") continue;
      if (!declaration.initializer) throw new Error(`${filename}: export const notes must have a static string literal`);
      const expression = unwrapStaticMetaExpression(declaration.initializer);
      if (!ts.isStringLiteral(expression) && !ts.isNoSubstitutionTemplateLiteral(expression)) {
        throw new Error(`${filename}: export const notes must be a static string literal`);
      }
      return `${source.slice(0, declaration.initializer.getStart(sourceFile))}${nextLiteral}${source.slice(declaration.initializer.getEnd())}`;
    }
  }

  for (const statement of sourceFile.statements) {
    if (isNamedReExport(statement, "notes")) {
      throw new Error(`${filename}: re-exported notes is not supported; define export const notes as a string literal`);
    }
  }

  const defaultExport = sourceFile.statements.find((statement) => (
    ts.isExportAssignment(statement)
    || statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)
  ));
  if (!defaultExport) throw new Error(`${filename}: slide source must define a default export`);
  const insertionPoint = defaultExport.getStart(sourceFile);
  return `${source.slice(0, insertionPoint)}export const notes = ${nextLiteral};\n\n${source.slice(insertionPoint)}`;
}

function objectLiteralToJson(node, filename) {
  const out = {};
  for (const prop of node.properties) {
    if (ts.isSpreadAssignment(prop)) throw new Error(`${filename}: meta must not use spread`);
    if (!ts.isPropertyAssignment(prop)) throw new Error(`${filename}: meta only supports property assignments`);
    const key = propertyName(prop.name, filename);
    out[key] = literalValue(prop.initializer, filename);
  }
  return out;
}

function literalValue(node, filename) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isArrayLiteralExpression(node)) return node.elements.map((element) => literalValue(element, filename));
  throw new Error(`${filename}: meta values must be static literals`);
}

function propertyName(name, filename) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  throw new Error(`${filename}: meta property names must be identifiers or string literals`);
}

function unwrapStaticMetaExpression(node) {
  if (ts.isSatisfiesExpression(node)) return unwrapStaticMetaExpression(node.expression);
  if (ts.isAsExpression(node)) return unwrapStaticMetaExpression(node.expression);
  if (ts.isParenthesizedExpression(node)) return unwrapStaticMetaExpression(node.expression);
  return node;
}

function hasExport(statement) {
  return Boolean(statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

function isMetaReExport(statement) {
  return isNamedReExport(statement, "meta");
}

function isNamedReExport(statement, name) {
  if (!ts.isExportDeclaration(statement) || !statement.exportClause) return false;
  if (!ts.isNamedExports(statement.exportClause)) return false;
  return statement.exportClause.elements.some((element) => {
    const exported = element.name.text;
    const property = element.propertyName?.text;
    return exported === name || property === name;
  });
}
