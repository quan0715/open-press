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

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "qdoc-reader-state-test-"));
  const tmpFile = path.join(tmpDir, `${path.basename(relPath, ".ts")}.mjs`);
  await fs.writeFile(tmpFile, output.outputText, "utf8");
  return import(pathToFileURL(tmpFile).href);
}

test("reader state treats bookmark navigation as one React-owned transition", async () => {
  const { createInitialReaderState, readerReducer } = await importTsModule("src/qdoc/readerState.ts");
  const initial = createInitialReaderState({ pageCount: 58, rightPanelOpen: true });

  const next = readerReducer(initial, {
    type: "navigate",
    pageIndex: 3,
    source: "bookmark",
    behavior: "smooth",
  });

  assert.equal(next.currentPageIndex, 3);
  assert.equal(next.programmaticScrollTarget, 3);
  assert.deepEqual(next.scrollRequest, {
    id: 1,
    pageIndex: 3,
    behavior: "smooth",
    source: "bookmark",
  });
  assert.deepEqual(next.routeRequest, {
    id: 1,
    pageIndex: 3,
    mode: "replace",
    source: "bookmark",
  });
});

test("route navigation scrolls once without writing the same route back", async () => {
  const { createInitialReaderState, readerReducer } = await importTsModule("src/qdoc/readerState.ts");
  const initial = createInitialReaderState({ pageCount: 58, rightPanelOpen: true });

  const next = readerReducer(initial, {
    type: "routeChanged",
    pageIndex: 4,
  });

  assert.equal(next.currentPageIndex, 4);
  assert.equal(next.routeRequest, null);
  assert.deepEqual(next.scrollRequest, {
    id: 1,
    pageIndex: 4,
    behavior: "auto",
    source: "route",
  });
});

test("observer updates cannot override an active programmatic scroll", async () => {
  const { createInitialReaderState, readerReducer } = await importTsModule("src/qdoc/readerState.ts");
  const initial = createInitialReaderState({ pageCount: 58, rightPanelOpen: true });
  const navigating = readerReducer(initial, {
    type: "navigate",
    pageIndex: 5,
    source: "keyboard",
    behavior: "smooth",
  });

  const ignored = readerReducer(navigating, {
    type: "intersectionSettled",
    pageIndex: 1,
  });
  assert.equal(ignored.currentPageIndex, 5);
  assert.equal(ignored.routeRequest.pageIndex, 5);

  const released = readerReducer(navigating, { type: "programmaticScrollReleased" });
  const observed = readerReducer(released, {
    type: "intersectionSettled",
    pageIndex: 7,
  });

  assert.equal(observed.currentPageIndex, 7);
  assert.equal(observed.scrollRequest, null);
  assert.deepEqual(observed.routeRequest, {
    id: 2,
    pageIndex: 7,
    mode: "replace",
    source: "observer",
  });
});

test("layout reanchor keeps the route-selected page stable without route rewrite", async () => {
  const { createInitialReaderState, readerReducer } = await importTsModule("src/qdoc/readerState.ts");
  const initial = createInitialReaderState({ pageCount: 58, rightPanelOpen: true });
  const routed = readerReducer(initial, {
    type: "routeChanged",
    pageIndex: 6,
  });

  const reanchored = readerReducer(routed, {
    type: "layoutReanchor",
    pageIndex: 6,
  });

  assert.equal(reanchored.currentPageIndex, 6);
  assert.equal(reanchored.routeRequest, null);
  assert.deepEqual(reanchored.scrollRequest, {
    id: 2,
    pageIndex: 6,
    behavior: "auto",
    source: "layout",
  });
});

test("page count changes clamp current reader state", async () => {
  const { createInitialReaderState, readerReducer } = await importTsModule("src/qdoc/readerState.ts");
  const initial = createInitialReaderState({ pageCount: 10, rightPanelOpen: true });
  const atLastPage = readerReducer(initial, {
    type: "navigate",
    pageIndex: 9,
    source: "api",
    behavior: "auto",
  });

  const clamped = readerReducer(atLastPage, {
    type: "pageCountChanged",
    pageCount: 4,
  });

  assert.equal(clamped.pageCount, 4);
  assert.equal(clamped.currentPageIndex, 3);
  assert.equal(clamped.programmaticScrollTarget, null);
  assert.equal(clamped.scrollRequest, null);
  assert.equal(clamped.routeRequest, null);
});
