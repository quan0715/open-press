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

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "qdoc-runtime-test-"));
  const tmpFile = path.join(tmpDir, `${path.basename(relPath, ".ts")}.mjs`);
  await fs.writeFile(tmpFile, output.outputText, "utf8");
  return import(pathToFileURL(tmpFile).href);
}

test("reader page registry reports same-index DOM replacements", async () => {
  const { createReaderPageRegistry } = await importTsModule("src/qdoc/readerPageRegistry.ts");
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
  const { pageHashFromIndex, pageIndexFromHash } = await importTsModule("src/qdoc/pageRoute.ts");

  assert.equal(pageHashFromIndex(0), "#page-01");
  assert.equal(pageHashFromIndex(12), "#page-13");
  assert.equal(pageIndexFromHash("#page-03", 58), 2);
  assert.equal(pageIndexFromHash("#page-003", 58), 2);
  assert.equal(pageIndexFromHash("#toc", 58), null);
  assert.equal(pageIndexFromHash("#page-00", 58), null);
  assert.equal(pageIndexFromHash("#page-99", 58), null);
});

test("reader runtime leaves touch gestures to scrolling instead of page turns", async () => {
  const source = await fs.readFile(path.join(ROOT, "src/qdoc/readerRuntime.ts"), "utf8");

  assert.doesNotMatch(source, /addEventListener\("touchstart"/);
  assert.doesNotMatch(source, /addEventListener\("touchend"/);
});
