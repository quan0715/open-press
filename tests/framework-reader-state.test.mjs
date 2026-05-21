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

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-reader-state-test-"));
  const tmpFile = path.join(tmpDir, `${path.basename(relPath, ".ts")}.mjs`);
  await fs.writeFile(tmpFile, output.outputText, "utf8");
  return import(pathToFileURL(tmpFile).href);
}

test("clampReaderPageIndex pins values inside the valid range", async () => {
  const { clampReaderPageIndex } = await importTsModule("src/openpress/readerState.ts");

  assert.equal(clampReaderPageIndex(3, 10), 3);
  assert.equal(clampReaderPageIndex(-1, 10), 0);
  assert.equal(clampReaderPageIndex(99, 10), 9);
  assert.equal(clampReaderPageIndex(3.7, 10), 3);
  assert.equal(clampReaderPageIndex(Number.NaN, 10), 0);
  assert.equal(clampReaderPageIndex(5, 0), 0);
});

test("formatReaderPageNumber zero-pads to two digits with a one-based floor", async () => {
  const { formatReaderPageNumber } = await importTsModule("src/openpress/readerState.ts");

  assert.equal(formatReaderPageNumber(1), "01");
  assert.equal(formatReaderPageNumber(9), "09");
  assert.equal(formatReaderPageNumber(58), "58");
  assert.equal(formatReaderPageNumber(0), "01");
  assert.equal(formatReaderPageNumber(-3), "01");
});

test("normalizeReaderPageCount rejects negatives and non-finite values", async () => {
  const { normalizeReaderPageCount } = await importTsModule("src/openpress/readerState.ts");

  assert.equal(normalizeReaderPageCount(58), 58);
  assert.equal(normalizeReaderPageCount(0), 0);
  assert.equal(normalizeReaderPageCount(-4), 0);
  assert.equal(normalizeReaderPageCount(Number.POSITIVE_INFINITY), 0);
  assert.equal(normalizeReaderPageCount(Number.NaN), 0);
});
