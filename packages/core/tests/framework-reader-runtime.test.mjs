import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ts from "typescript";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function importTsModule(relPath) {
  const sourcePath = path.join(ROOT, relPath);
  const source = await fs.readFile(sourcePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  });

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-runtime-test-"));
  const tmpFile = path.join(tmpDir, `${path.basename(relPath, ".ts")}.mjs`);
  await fs.writeFile(tmpFile, output.outputText, "utf8");
  return import(pathToFileURL(tmpFile).href);
}

test("reader page registry reports same-index DOM replacements", async () => {
  const { createReaderPageRegistry } = await importTsModule("src/openpress/reader/readerPageRegistry.ts");
  const versions = [];
  const registry = createReaderPageRegistry((version) => versions.push(version));

  const firstCallback = registry.registerPage(1);
  const secondCallback = registry.registerPage(1);
  assert.equal(secondCallback, firstCallback, "page ref callbacks should be stable per page index");

  const initialNode = { id: "initial-page" };
  firstCallback(initialNode);
  assert.equal(registry.refs[1], initialNode);
  assert.deepEqual(versions, [1]);

  secondCallback(initialNode);
  assert.deepEqual(versions, [1], "unchanged nodes should not create extra observer refreshes");

  const paginatedNode = { id: "paginated-page" };
  secondCallback(paginatedNode);
  assert.equal(registry.refs[1], paginatedNode);
  assert.deepEqual(versions, [1, 2], "replaced nodes should trigger observer refresh");
});

test("page route serializes and validates reader page hashes", async () => {
  const { pageHashFromIndex, pageIndexFromHash } = await importTsModule("src/openpress/reader/readerPageRoute.ts");

  assert.equal(pageHashFromIndex(0), "#page-01");
  assert.equal(pageHashFromIndex(12), "#page-13");
  assert.equal(pageIndexFromHash("#page-03", 58), 2);
  assert.equal(pageIndexFromHash("#page-003", 58), 2);
  assert.equal(pageIndexFromHash("#toc", 58), null);
  assert.equal(pageIndexFromHash("#page-00", 58), null);
  assert.equal(pageIndexFromHash("#page-99", 58), null);
});

test("reader runtime leaves touch gestures to scrolling instead of page turns", async () => {
  const source = await fs.readFile(path.join(ROOT, "src/openpress/reader/useReaderRuntime.ts"), "utf8");

  assert.doesNotMatch(source, /addEventListener\("touchstart"/);
  assert.doesNotMatch(source, /addEventListener\("touchend"/);
});

test("reader runtime only restores a routed page during its initial registration", async () => {
  const source = await fs.readFile(path.join(ROOT, "src/openpress/reader/useReaderRuntime.ts"), "utf8");

  assert.match(source, /const hasRestoredInitialRouteRef = useRef\(false\);/);
  assert.match(source, /if \(hasRestoredInitialRouteRef\.current\) return undefined;/);
  assert.match(source, /hasRestoredInitialRouteRef\.current = true;/);
});

test("inline source saves refresh the document before closing the editor", async () => {
  const [editorSource, workbenchSource] = await Promise.all([
    fs.readFile(path.join(ROOT, "src/openpress/workbench/document/components/InlineSourceEditorLayer.tsx"), "utf8"),
    fs.readFile(path.join(ROOT, "src/openpress/workbench/Workbench.tsx"), "utf8"),
  ]);

  assert.match(editorSource, /onDocumentEdited\?: \(options\?: DocumentRefreshOptions\) => void \| Promise<void>;/);
  assert.match(editorSource, /await onDocumentEdited\?\.\(\{ expectedRenderId: result\?\.document\?\.renderId \}\);/);
  assert.match(workbenchSource, /<InlineSourceEditorLayer[\s\S]*onDocumentEdited=\{handleInlineDocumentEdited\}/);
});

test("workbench search uses the persisted reader right-panel state", async () => {
  const source = await fs.readFile(path.join(ROOT, "src/openpress/workbench/Workbench.tsx"), "utf8");

  assert.doesNotMatch(source, /const \[searchOpen, setSearchOpen\] = useState\(false\);/);
  assert.match(source, /rightPanelOpen=\{reader\.rightPanelOpen\}/);
  assert.match(source, /<SearchControl[\s\S]*open=\{reader\.rightPanelOpen\}/);
  assert.match(source, /<SearchPanel[\s\S]*open=\{reader\.rightPanelOpen\}/);
});

test("reader panel drawers do not add shadows", async () => {
  const source = await fs.readFile(path.join(ROOT, "src/openpress/workbench/shell/WorkbenchShell.tsx"), "utf8");

  assert.doesNotMatch(source, /shadow-\[16px_0_34px_rgb\(0_0_0_\/_0\.36\)\]/);
  assert.doesNotMatch(source, /shadow-\[-16px_0_34px_rgb\(0_0_0_\/_0\.36\)\]/);
});
