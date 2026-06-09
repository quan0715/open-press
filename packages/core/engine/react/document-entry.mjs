// Layer 1 — Document entry loader.
//
// Discovers `press/*/press.tsx`, generates an internal Workspace entry,
// and sets up the vite SSR server with `@open-press/core` aliases
// (including the subpaths `/mdx` and `/manuscript`).

import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import ts from "typescript";
import { createServer as createViteServer } from "vite";
import { loadConfig } from "../runtime/config.mjs";
import { inspectPressTree } from "./press-tree-inspection.mjs";
import { injectObjectLocators } from "./object-locator-transform.mjs";
import { generateSlidesFolderPressModule } from "./slides-folder-entry.mjs";
import { extractSlideNotesFromSource } from "./slides-folder-meta.mjs";
import { parseSlideIndexSource, pressSourceDeclaresSlidesType, validateSlidesFolderContract } from "./slides-folder-model.mjs";
import { textSourceTransformPlugin } from "./text-source-transform.mjs";

const ENGINE_REACT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = path.resolve(ENGINE_REACT_DIR, "..", "..");
export const CORE_ENTRY = path.join(FRAMEWORK_ROOT, "src", "openpress", "core", "index.tsx");
export const MDX_ENTRY = path.join(FRAMEWORK_ROOT, "src", "openpress", "mdx", "index.ts");
export const MANUSCRIPT_ENTRY = path.join(FRAMEWORK_ROOT, "src", "openpress", "manuscript", "index.tsx");
export const NUMBERING_ENTRY = path.join(FRAMEWORK_ROOT, "src", "openpress", "numbering", "index.ts");
export const SLIDES_ENTRY = path.join(FRAMEWORK_ROOT, "src", "openpress", "slides", "index.tsx");
const REACT_PACKAGE_ROOT = path.join(FRAMEWORK_ROOT, "node_modules", "react");
const require = createRequire(import.meta.url);
const REACT_EXPORT_NAMES = Object.keys(require("react")).filter((name) => /^[A-Za-z_$][\w$]*$/.test(name));

async function resolveEntryPath(workspaceRoot) {
  return createDiscoveredPressEntry(workspaceRoot);
}

async function createDiscoveredPressEntry(workspaceRoot) {
  const pressRoot = path.join(workspaceRoot, "press");
  let entries = [];
  try {
    const children = await fs.readdir(pressRoot, { withFileTypes: true });
    for (const child of children) {
      if (!child.isDirectory()) continue;
      if (child.name === "shared" || child.name.startsWith(".")) continue;
      const entryPath = path.join(pressRoot, child.name, "press.tsx");
      if (await fileExists(entryPath)) entries.push({ folder: child.name, entryPath });
    }
  } catch {
    return null;
  }

  entries = entries.sort((a, b) => a.folder.localeCompare(b.folder));
  if (entries.length === 0) return null;

  const generatedDir = path.join(workspaceRoot, ".openpress", "react");
  await fs.mkdir(generatedDir, { recursive: true });
  const generatedPressEntries = [];
  for (const entry of entries) {
    const source = await fs.readFile(entry.entryPath, "utf8");
    assertNoObviousTopLevelSideEffects(source, entry.entryPath);
    if (pressSourceDeclaresSlidesType(source, entry.entryPath)) {
      const pressDir = path.dirname(entry.entryPath);
      const markers = parseSlideIndexSource(source, entry.entryPath);
      const validation = await validateSlidesFolderContract({ pressDir, pressSource: source });
      if (!validation.ok) throw new Error(validation.errors.join("\n"));
      const discoveredById = new Map(validation.discovered.map((slide) => [slide.id, slide]));
      const markersWithNotes = [];
      for (const marker of markers) {
        const slide = discoveredById.get(marker.id);
        if (!slide) {
          markersWithNotes.push(marker);
          continue;
        }
        const slideSource = await fs.readFile(slide.absolutePath, "utf8");
        const notes = extractSlideNotesFromSource(slideSource, slide.absolutePath);
        markersWithNotes.push(typeof notes === "string" && notes.trim() ? { ...marker, notes: notes.trim() } : marker);
      }
      const generatedPressPath = path.join(generatedDir, `${entry.folder}.slides.generated.tsx`);
      await fs.writeFile(
        generatedPressPath,
        generateSlidesFolderPressModule({
          pressDir,
          pressPath: entry.entryPath,
          markers: markersWithNotes,
          pressPropsSource: extractPressPropsSource(source, entry.entryPath),
          generatedDir,
        }),
        "utf8",
      );
      generatedPressEntries.push({ ...entry, entryPath: generatedPressPath, slidesIndexExport: true });
    } else {
      generatedPressEntries.push({ ...entry, slidesIndexExport: false });
    }
  }

  const generatedEntry = path.join(generatedDir, "discovered-press-entry.tsx");
  const imports = generatedPressEntries
    .map((entry, index) => entry.slidesIndexExport
      ? `import Press${index}, { __openpressSlidesIndex as Press${index}SlidesIndex } from "${relativeImportPath(generatedDir, entry.entryPath)}";`
      : `import Press${index} from "${relativeImportPath(generatedDir, entry.entryPath)}";`)
    .join("\n");
  const children = generatedPressEntries.map((_, index) => `      <Press${index} />`).join("\n");
  const slidesIndexes = generatedPressEntries
    .map((entry, index) => `  ${JSON.stringify(entry.folder)}: ${entry.slidesIndexExport ? `Press${index}SlidesIndex` : "[]"},`)
    .join("\n");
  const source = `import { Workspace } from "@open-press/core";
${imports}

export const __openpressPressFolders = ${JSON.stringify(generatedPressEntries.map((entry) => entry.folder))};
export const __openpressSlidesIndexes = {
${slidesIndexes}
};

export default function DiscoveredOpenPressWorkspace() {
  return (
    <Workspace>
${children}
    </Workspace>
  );
}
`;
  await fs.writeFile(generatedEntry, source, "utf8");
  return generatedEntry;
}

function relativeImportPath(fromDir, toFile) {
  let relative = path.relative(fromDir, toFile).replaceAll(path.sep, "/");
  if (!relative.startsWith(".")) relative = `./${relative}`;
  return relative;
}

function extractPressPropsSource(source, filename) {
  const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let props = "";
  visit(sourceFile, (node) => {
    if (props || !ts.isJsxElement(node)) return;
    if (!ts.isIdentifier(node.openingElement.tagName) || node.openingElement.tagName.text !== "Press") return;
    props = source.slice(node.openingElement.tagName.end, node.openingElement.end - 1).trim();
  });
  if (!props) throw new Error(`No <Press> props found in ${filename}`);
  return props;
}

function visit(node, fn) {
  fn(node);
  ts.forEachChild(node, (child) => visit(child, fn));
}

export async function loadReactDocumentEntry(root = ".", { server: externalServer } = {}) {
  const workspaceRoot = path.resolve(root);
  const entryPath = await resolveEntryPath(workspaceRoot);
  if (!entryPath) return null;

  const source = await fs.readFile(entryPath, "utf8");
  assertNoObviousTopLevelSideEffects(source, entryPath);

  // If caller provides a server, reuse it so module identity is shared
  // across the pipeline (PressContext, React, etc.). Otherwise open a
  // temporary server for one-shot config reads.
  const ownServer = externalServer ?? (await createReactSsrServer(workspaceRoot));
  try {
    const mod = await ownServer.ssrLoadModule(entryPath);

    // Press default export is required for export/render but not for
    // config-only commands (search, replace, validate). Validate if present;
    // export pipeline throws separately if it's missing when actually needed.
    const Press = typeof mod.default === "function" ? mod.default : null;

    // Inspect the JSX tree returned by the user's default export to
    // pull <Workspace> / <Press> props declared inline. The 1.0 contract
    // treats workspaces uniformly as "array of Press children" — the
    // single-doc case is just length 1.
    let inspection = { workspaceProps: {}, presses: [], wrappedInWorkspace: false };
    if (Press) {
      const coreModule = await ownServer.ssrLoadModule(
        path.join(FRAMEWORK_ROOT, "src", "openpress", "core", "index.tsx"),
      );
      inspection = inspectPressTree({
        UserComponent: Press,
        PRESS_MARKER: coreModule.PRESS_MARKER,
        WORKSPACE_MARKER: coreModule.WORKSPACE_MARKER,
      });
    }

    // Workspace-level config (deploy, pdf, captionNumbering defaults)
    // comes from package.json "openpress" via loadConfig. Each Press
    // overlays its own metadata via JSX props at export time.
    const config = await loadConfig(workspaceRoot);

    return {
      entryPath,
      config,
      Press,
      presses: inspection.presses,
      workspaceProps: inspection.workspaceProps,
      pressCount: inspection.presses.length,
      wrappedInWorkspace: inspection.wrappedInWorkspace,
      pressFolders: Array.isArray(mod.__openpressPressFolders)
        ? mod.__openpressPressFolders.filter((item) => typeof item === "string")
        : [],
      slidesIndexes: mod.__openpressSlidesIndexes && typeof mod.__openpressSlidesIndexes === "object"
        ? mod.__openpressSlidesIndexes
        : {},
    };
  } finally {
    if (!externalServer) await ownServer.close();
  }
}

export async function createReactSsrServer(workspaceRoot = ".") {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);
  return createViteServer({
    configFile: false,
    root: FRAMEWORK_ROOT,
    cacheDir: path.join(resolvedWorkspaceRoot, ".openpress", "vite-ssr"),
    appType: "custom",
    logLevel: "silent",
    plugins: [
      textSourceTransformPlugin({
        workspaceRoot: resolvedWorkspaceRoot,
        documentRoot: path.join(resolvedWorkspaceRoot, "press"),
      }),
      objectLocatorTransformPlugin({ workspaceRoot: resolvedWorkspaceRoot }),
      reactRuntimePlugin(),
      react(),
    ],
    resolve: {
      alias: [
        // ORDER MATTERS: subpath aliases must precede the base alias so that
        // `@open-press/core/mdx` doesn't resolve to `@open-press/core` + `/mdx`.
        { find: "@open-press/core/mdx", replacement: MDX_ENTRY },
        { find: "@open-press/core/manuscript", replacement: MANUSCRIPT_ENTRY },
        { find: "@open-press/core/numbering", replacement: NUMBERING_ENTRY },
        { find: "@open-press/core/slides", replacement: SLIDES_ENTRY },
        { find: "@open-press/core", replacement: CORE_ENTRY },
        { find: "@/components", replacement: path.join(resolvedWorkspaceRoot, "press", "shared", "components") },
      ],
    },
    optimizeDeps: {
      include: [
        "@mdx-js/react",
        "react",
        "react-dom",
        "react-dom/server",
        "react/jsx-dev-runtime",
        "react/jsx-runtime",
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

function objectLocatorTransformPlugin({ workspaceRoot }) {
  const locatorMap = {};
  async function writeLocatorMap() {
    const outPath = path.join(workspaceRoot, ".openpress", "react", "object-locators.json");
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, JSON.stringify(locatorMap, null, 2), "utf8");
  }

  return {
    name: "openpress-object-locator-transform",
    enforce: "pre",
    transform(source, id) {
      const normalized = id.split("?")[0];
      const match = normalized.match(/\/slides\/([^/]+)\/slide\.tsx$/);
      if (!match || !normalized.startsWith(workspaceRoot)) return null;
      const result = injectObjectLocators({ source, filename: normalized, slideId: match[1] });
      Object.assign(locatorMap, result.map);
      void writeLocatorMap();
      return { code: result.code, map: null };
    },
    configureServer(server) {
      server.middlewares.use("/__openpress/object-locators.json", (_req, res) => {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(locatorMap));
      });
    },
  };
}

function assertNoObviousTopLevelSideEffects(source, entryPath) {
  const sourceFile = ts.createSourceFile(entryPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      assertPureImport(statement, entryPath);
      continue;
    }

    if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) continue;
    if (ts.isExportDeclaration(statement) && statement.isTypeOnly) continue;
    if (ts.isFunctionDeclaration(statement)) continue;
    if (ts.isVariableStatement(statement)) {
      assertTopLevelVariableStatement(statement, entryPath);
      continue;
    }
    if (ts.isExportAssignment(statement)) {
      assertPureDefaultExport(statement.expression, entryPath);
      continue;
    }

    throw new Error(`OpenPress document entry has unsupported top-level code in ${entryPath}: ${statementKindName(statement)}`);
  }
}

function assertPureImport(statement, entryPath) {
  const moduleName = stringLiteralText(statement.moduleSpecifier);
  if (!statement.importClause) {
    if (typeof moduleName === "string" && moduleName.endsWith(".css")) return;
    throw new Error(`OpenPress document entry has an unsupported side-effect import in ${entryPath}`);
  }
  if (!statement.importClause.isTypeOnly && isFileSystemModule(moduleName)) {
    throw new Error(`OpenPress document entry imports filesystem APIs at top level in ${entryPath}`);
  }
}

function assertTopLevelVariableStatement(statement, entryPath) {
  if ((statement.declarationList.flags & ts.NodeFlags.Const) === 0) {
    throw new Error(`OpenPress document entry only allows top-level const declarations in ${entryPath}`);
  }

  const exported = hasModifier(statement, ts.SyntaxKind.ExportKeyword);
  for (const declaration of statement.declarationList.declarations) {
    if (!ts.isIdentifier(declaration.name)) {
      throw new Error(`OpenPress document entry only allows identifier const declarations at top level in ${entryPath}`);
    }
    const name = declaration.name.text;
    if (
      exported &&
      name !== "config" &&
      name !== "sources" &&
      name !== "__openpressPressFolders" &&
      name !== "__openpressSlidesIndexes"
    ) {
      throw new Error(`OpenPress document entry only allows exported const config, sources, and engine metadata in ${entryPath}`);
    }
    if (!declaration.initializer) {
      throw new Error(`OpenPress document entry const "${name}" must have an initializer in ${entryPath}`);
    }
    if (name === "config") {
      assertPureExpression(declaration.initializer, entryPath, { allowMdxSourceCall: false });
    } else if (name === "sources") {
      assertPureSourcesInitializer(declaration.initializer, entryPath);
    } else {
      assertPureStaticInitializer(declaration.initializer, entryPath);
    }
  }
}

function assertPureSourcesInitializer(node, entryPath) {
  const expression = skipExpressionWrappers(node);
  if (!ts.isObjectLiteralExpression(expression)) {
    throw new Error(`OpenPress document entry exported sources must be an object literal in ${entryPath}`);
  }
  assertPureExpression(expression, entryPath, { allowMdxSourceCall: true });
}

function assertPureStaticInitializer(node, entryPath) {
  const expression = skipExpressionWrappers(node);
  if (ts.isFunctionExpression(expression) || ts.isArrowFunction(expression) || ts.isClassExpression(expression)) return;
  assertPureExpression(expression, entryPath, { allowMdxSourceCall: false });
}

function assertPureDefaultExport(node, entryPath) {
  const expression = skipExpressionWrappers(node);
  if (ts.isFunctionExpression(expression) || ts.isArrowFunction(expression) || ts.isIdentifier(expression)) return;
  throw new Error(`OpenPress document entry default export must be a function component in ${entryPath}`);
}

function assertPureExpression(node, entryPath, { allowMdxSourceCall }) {
  visitExpression(node, (child) => {
    if (ts.isAwaitExpression(child)) {
      throw new Error(`OpenPress document entry has an unsupported top-level side effect: await in ${entryPath}`);
    }
    if (ts.isCallExpression(child)) {
      const callee = skipExpressionWrappers(child.expression);
      if (allowMdxSourceCall && ts.isIdentifier(callee) && callee.text === "mdxSource") return;
      if (ts.isIdentifier(callee) && callee.text === "fetch") {
        throw new Error(`OpenPress document entry has an unsupported top-level side effect: fetch(...) in ${entryPath}`);
      }
      if (ts.isPropertyAccessExpression(callee) && isIdentifierText(callee.expression, "console")) {
        throw new Error(`OpenPress document entry has an unsupported top-level side effect: console.${callee.name.text}(...) in ${entryPath}`);
      }
      if (ts.isPropertyAccessExpression(callee) && isIdentifierText(callee.expression, "fs")) {
        throw new Error(`OpenPress document entry has an unsupported top-level side effect: fs.${callee.name.text}(...) in ${entryPath}`);
      }
      throw new Error(`OpenPress document entry cannot execute top-level function calls outside sources.mdxSource(...) in ${entryPath}`);
    }
    if (ts.isPropertyAccessExpression(child) && isProcessEnvAccess(child)) {
      throw new Error(`OpenPress document entry cannot read process.env at top level in ${entryPath}`);
    }
  });
}

function visitExpression(node, visitor) {
  visitor(node);
  if (node !== undefined && node !== null && isFunctionLikeExpression(node)) return;
  ts.forEachChild(node, (child) => visitExpression(child, visitor));
}

function isFunctionLikeExpression(node) {
  return ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isClassExpression(node);
}

function skipExpressionWrappers(node) {
  let current = node;
  while (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) || ts.isTypeAssertionExpression(current) || ts.isNonNullExpression(current)) {
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
