import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { walkFiles } from "../engine/runtime/file-walk.mjs";
import {
  rootRelativePath,
  documentRelativePath,
  resolveDocumentRelativePath,
} from "../engine/runtime/path-utils.mjs";
import { normalizeConfig } from "../engine/runtime/config.mjs";
import {
  normalizePageGeometry,
  pageGeometryToTheme,
} from "../engine/runtime/page-geometry.mjs";
import { parseOptions } from "../engine/commands/_shared.mjs";
import { rmWithRetry } from "./_temp.mjs";

async function makeFixtureDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-runtime-"));
  return dir;
}

test("walkFiles visits every regular file recursively", async () => {
  const root = await makeFixtureDir();
  try {
    await fs.mkdir(path.join(root, "a", "b"), { recursive: true });
    await fs.writeFile(path.join(root, "top.txt"), "1");
    await fs.writeFile(path.join(root, "a", "mid.txt"), "2");
    await fs.writeFile(path.join(root, "a", "b", "leaf.txt"), "3");

    const visited = [];
    await walkFiles(root, async (filePath) => {
      visited.push(path.relative(root, filePath).split(path.sep).join("/"));
    });
    visited.sort();

    assert.deepEqual(visited, ["a/b/leaf.txt", "a/mid.txt", "top.txt"]);
  } finally {
    await rmWithRetry(root);
  }
});

test("walkFiles skips dotfiles and dot-directories", async () => {
  const root = await makeFixtureDir();
  try {
    await fs.mkdir(path.join(root, ".hidden"), { recursive: true });
    await fs.writeFile(path.join(root, ".hidden", "secret.txt"), "x");
    await fs.writeFile(path.join(root, ".dotfile"), "x");
    await fs.writeFile(path.join(root, "visible.txt"), "y");

    const visited = [];
    await walkFiles(root, async (filePath) => {
      visited.push(path.basename(filePath));
    });

    assert.deepEqual(visited.sort(), ["visible.txt"]);
  } finally {
    await rmWithRetry(root);
  }
});

test("walkFiles silently returns when the directory does not exist", async () => {
  const calls = [];
  await walkFiles("/no/such/directory/should/exist", async (filePath) => {
    calls.push(filePath);
  });
  assert.equal(calls.length, 0);
});

test("rootRelativePath normalizes separators relative to config.root", () => {
  const root = "/work/space";
  const absolute = path.join(root, "src", "openpress", "index.tsx");
  assert.equal(rootRelativePath({ root }, absolute), "src/openpress/index.tsx");
});

test("documentRelativePath returns the path relative to a document root", () => {
  const documentRoot = "/doc";
  const absolute = path.join(documentRoot, "chapters", "01", "content", "01.mdx");
  assert.equal(documentRelativePath(absolute, documentRoot), "chapters/01/content/01.mdx");
});

test("resolveDocumentRelativePath resolves a clean relative path inside the document", () => {
  const documentRoot = "/doc";
  const resolved = resolveDocumentRelativePath(documentRoot, "chapters/01/content/01.mdx", "path");
  assert.equal(resolved, path.join(documentRoot, "chapters/01/content/01.mdx"));
});

test("resolveDocumentRelativePath rejects empty input", () => {
  assert.throws(
    () => resolveDocumentRelativePath("/doc", "", "path"),
    /must be a non-empty document-relative path/,
  );
  assert.throws(
    () => resolveDocumentRelativePath("/doc", "   ", "path"),
    /must be a non-empty document-relative path/,
  );
});

test("resolveDocumentRelativePath rejects paths containing ..", () => {
  assert.throws(
    () => resolveDocumentRelativePath("/doc", "../outside.mdx", "path"),
    /contains ".."/,
  );
  assert.throws(
    () => resolveDocumentRelativePath("/doc", "chapters/../../../etc/passwd", "path"),
    /contains ".."/,
  );
});

test("normalizePageGeometry resolves built-in page presets", () => {
  assert.deepEqual(normalizePageGeometry("slide-16-9"), {
    id: "slide-16-9",
    label: "Slide 16:9",
    width: "1920px",
    height: "1080px",
    aspectRatio: "1920 / 1080",
    heightRatio: "0.5625",
  });
});

test("normalizePageGeometry accepts custom fixed-size pages", () => {
  assert.deepEqual(normalizePageGeometry({
    id: "story-card",
    label: "Story Card",
    width: "1080px",
    height: "1350px",
  }), {
    id: "story-card",
    label: "Story Card",
    width: "1080px",
    height: "1350px",
    aspectRatio: "1080 / 1350",
    heightRatio: "1.25",
  });
});

test("normalizeConfig carries page geometry as reusable config data", () => {
  const config = normalizeConfig("/workspace", {
    page: "social-square",
  });

  assert.deepEqual(config.page, {
    id: "social-square",
    label: "Social Square",
    width: "1080px",
    height: "1080px",
    aspectRatio: "1080 / 1080",
    heightRatio: "1",
  });
});

test("pageGeometryToTheme maps page config to reader runtime variables", () => {
  assert.deepEqual(pageGeometryToTheme(normalizePageGeometry("a4")), {
    pagePreset: "a4",
    pageLabel: "A4 Page",
    pageWidth: "210mm",
    pageHeight: "297mm",
    pageAspectRatio: "210 / 297",
    pageHeightRatio: "1.414286",
  });
});

test("parseOptions supports upgrade and migrate workflow flags documented in help", () => {
  assert.deepEqual(parseOptions([".", "--dry-run", "--no-deps", "--no-skills", "--json"]), {
    path: ".",
    positional: ["."],
    dryRun: true,
    noDeps: true,
    noSkills: true,
    json: true,
  });
  assert.deepEqual(parseOptions([".", "--no-cache", "--json"]), {
    path: ".",
    positional: ["."],
    noCache: true,
    json: true,
  });
});
