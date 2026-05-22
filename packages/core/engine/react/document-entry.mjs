import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import ts from "typescript";
import { createServer as createViteServer } from "vite";
import { normalizeConfig } from "../config.mjs";

const ENGINE_REACT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = path.resolve(ENGINE_REACT_DIR, "..", "..");
const CORE_ENTRY = path.join(FRAMEWORK_ROOT, "src", "openpress", "core", "index.tsx");
const REACT_PACKAGE_ROOT = path.join(FRAMEWORK_ROOT, "node_modules", "react");
const require = createRequire(import.meta.url);
const REACT_EXPORT_NAMES = Object.keys(require("react")).filter((name) => /^[A-Za-z_$][\w$]*$/.test(name));

export async function loadReactDocumentEntry(root = ".") {
  const workspaceRoot = path.resolve(root);
  const entryPath = path.join(workspaceRoot, "document", "index.tsx");
  if (!(await fileExists(entryPath))) return null;

  const source = await fs.readFile(entryPath, "utf8");
  assertNoObviousTopLevelSideEffects(source, entryPath);

  const server = await createReactSsrServer(workspaceRoot);

  try {
    const mod = await server.ssrLoadModule(entryPath);
    const config = normalizeReactDocumentConfig(workspaceRoot, entryPath, mod.config);
    return {
      entryPath,
      config,
      shell: {
        cover: mod.cover ?? null,
        toc: mod.toc ?? null,
        backCover: mod.backCover ?? null,
      },
    };
  } finally {
    await server.close();
  }
}

export async function createReactSsrServer(workspaceRoot = ".") {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);
  return createViteServer({
    configFile: false,
    root: FRAMEWORK_ROOT,
    appType: "custom",
    logLevel: "silent",
    plugins: [reactRuntimePlugin(), react()],
    resolve: {
      alias: [
        { find: "@openpress/core", replacement: CORE_ENTRY },
        { find: "@/components", replacement: path.join(resolvedWorkspaceRoot, "document", "components") },
      ],
    },
    server: {
      middlewareMode: true,
      fs: {
        allow: [FRAMEWORK_ROOT, resolvedWorkspaceRoot],
      },
    },
  });
}

function normalizeReactDocumentConfig(workspaceRoot, entryPath, config) {
  if (config != null && (typeof config !== "object" || Array.isArray(config))) {
    throw new Error("OpenPress React document entry `config` export must be an object when provided.");
  }
  const rawConfig = config ?? {};
  const paths = rawConfig.paths ?? {};
  return normalizeConfig(workspaceRoot, {
    ...rawConfig,
    documentDir: rawConfig.documentDir ?? paths.documentDir ?? "document",
    sourceDir: rawConfig.sourceDir ?? paths.chaptersDir ?? paths.sourceDir ?? "chapters",
    componentsDir: rawConfig.componentsDir ?? paths.componentsDir ?? "components",
    mediaDir: rawConfig.mediaDir ?? paths.mediaDir ?? "media",
    themeDir: rawConfig.themeDir ?? paths.themeDir ?? "theme",
    designDoc: rawConfig.designDoc ?? paths.designDoc ?? "design.md",
  }, entryPath);
}

function assertNoObviousTopLevelSideEffects(source, entryPath) {
  const sourceFile = ts.createSourceFile(entryPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      assertPureImport(statement, entryPath);
      continue;
    }

    if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) {
      continue;
    }

    if (ts.isExportDeclaration(statement) && statement.isTypeOnly) {
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      assertExportedConstStatement(statement, entryPath);
      continue;
    }

    if (ts.isExpressionStatement(statement)) {
      assertPureTopLevelInitializer(statement.expression, entryPath);
    }

    throw new Error(`OpenPress React document entry has unsupported top-level code in ${entryPath}: ${statementKindName(statement)}`);
  }
}

function assertPureImport(statement, entryPath) {
  if (!statement.importClause) {
    throw new Error(`OpenPress React document entry has an unsupported side-effect import in ${entryPath}`);
  }
  const moduleName = stringLiteralText(statement.moduleSpecifier);
  if (!statement.importClause.isTypeOnly && isFileSystemModule(moduleName)) {
    throw new Error(`OpenPress React document entry imports filesystem APIs at top level in ${entryPath}`);
  }
}

function assertExportedConstStatement(statement, entryPath) {
  if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
    throw new Error(`OpenPress React document entry only allows exported const declarations at top level in ${entryPath}`);
  }
  if ((statement.declarationList.flags & ts.NodeFlags.Const) === 0) {
    throw new Error(`OpenPress React document entry only allows exported const declarations at top level in ${entryPath}`);
  }

  for (const declaration of statement.declarationList.declarations) {
    if (declaration.initializer) assertPureTopLevelInitializer(declaration.initializer, entryPath);
  }
}

function assertPureTopLevelInitializer(node, entryPath) {
  visitNode(node, (child) => {
    if (ts.isAwaitExpression(child)) {
      throw new Error(`OpenPress React document entry has an unsupported top-level side effect: await in ${entryPath}`);
    }

    if (ts.isCallExpression(child)) {
      const callee = skipExpressionWrappers(child.expression);
      if (ts.isIdentifier(callee) && callee.text === "fetch") {
        throw new Error(`OpenPress React document entry has an unsupported top-level side effect: fetch(...) in ${entryPath}`);
      }
      if (ts.isPropertyAccessExpression(callee) && isIdentifierText(callee.expression, "console")) {
        throw new Error(`OpenPress React document entry has an unsupported top-level side effect: console.${callee.name.text}(...) in ${entryPath}`);
      }
      if (ts.isPropertyAccessExpression(callee) && isIdentifierText(callee.expression, "fs")) {
        throw new Error(`OpenPress React document entry has an unsupported top-level side effect: fs.${callee.name.text}(...) in ${entryPath}`);
      }
      throw new Error(`OpenPress React document entry cannot execute top-level function calls in exported config or shell JSX in ${entryPath}`);
    }

    if (ts.isPropertyAccessExpression(child) && isProcessEnvAccess(child)) {
      throw new Error(`OpenPress React document entry cannot read process.env in exported config or shell JSX in ${entryPath}`);
    }
  });
}

function visitNode(node, visitor) {
  visitor(node);
  ts.forEachChild(node, (child) => visitNode(child, visitor));
}

function skipExpressionWrappers(node) {
  let current = node;
  while (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) || ts.isTypeAssertionExpression(current)) {
    current = current.expression;
  }
  return current;
}

function isProcessEnvAccess(node) {
  return node.name.text === "env" && isIdentifierText(skipExpressionWrappers(node.expression), "process");
}

function isIdentifierText(node, text) {
  return ts.isIdentifier(node) && node.text === text;
}

function hasModifier(node, kind) {
  return ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === kind);
}

function statementKindName(node) {
  return ts.SyntaxKind[node.kind] ?? String(node.kind);
}

function stringLiteralText(node) {
  return ts.isStringLiteral(node) ? node.text : "";
}

function isFileSystemModule(moduleName) {
  return moduleName === "fs" || moduleName === "node:fs" || moduleName === "fs/promises" || moduleName === "node:fs/promises";
}

async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function reactRuntimePlugin() {
  const modules = {
    react: "\0openpress-react",
    "react/jsx-runtime": "\0openpress-react-jsx-runtime",
    "react/jsx-dev-runtime": "\0openpress-react-jsx-dev-runtime",
  };
  return {
    name: "openpress-react-runtime",
    enforce: "pre",
    resolveId(id) {
      return modules[id] ?? null;
    },
    load(id) {
      if (id === modules.react) return reactModuleShim();
      if (id === modules["react/jsx-runtime"]) {
        return runtimeModuleShim(path.join(REACT_PACKAGE_ROOT, "jsx-runtime.js"), ["Fragment", "jsx", "jsxs"]);
      }
      if (id === modules["react/jsx-dev-runtime"]) {
        return runtimeModuleShim(path.join(REACT_PACKAGE_ROOT, "jsx-dev-runtime.js"), ["Fragment", "jsxDEV"]);
      }
      return null;
    },
  };
}

function runtimeModuleShim(modulePath, names) {
  const exports = names.map((name) => `export const ${name} = runtime.${name};`).join("\n");
  return `import { createRequire } from "node:module";
const require = createRequire(${JSON.stringify(import.meta.url)});
const runtime = require(${JSON.stringify(modulePath)});
${exports}
export default runtime;
`;
}

function reactModuleShim() {
  const reactPath = require.resolve("react");
  const exports = REACT_EXPORT_NAMES.map((name) => `export const ${name} = React.${name};`).join("\n");
  return `import { createRequire } from "node:module";
const require = createRequire(${JSON.stringify(import.meta.url)});
const React = require(${JSON.stringify(reactPath)});
${exports}
export default React;
`;
}
