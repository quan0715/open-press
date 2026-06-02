import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseOptions, resolvePressSelection } from "../engine/commands/_shared.mjs";

async function withWorkspaceManifest(presses) {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-press-selector-"));
  await fs.mkdir(path.join(outputDir, "openpress"), { recursive: true });
  await fs.writeFile(
    path.join(outputDir, "openpress", "workspace.json"),
    JSON.stringify({ version: 1, name: "Test Workspace", presses }, null, 2),
  );
  return outputDir;
}

test("parseOptions captures --press <slug>", () => {
  const options = parseOptions(["--press", "slide"]);
  assert.equal(options.press, "slide");
});

test("parseOptions captures --press alongside --pages and --output", () => {
  const options = parseOptions(["--press", "slide", "--pages", "3-7", "--output", "out"]);
  assert.equal(options.press, "slide");
  assert.equal(options.pages, "3-7");
  assert.equal(options.output, "out");
});

test("resolvePressSelection returns the first press when slug is empty", async () => {
  const outputDir = await withWorkspaceManifest([
    { slug: "userstory", title: "User Story", documentUrl: "/openpress/userstory/document.json", type: "pages", page: null, pageCount: 46 },
    { slug: "slide", title: "Hello, slide", documentUrl: "/openpress/slide/document.json", type: "slides", page: null, pageCount: 5 },
  ]);
  try {
    const selection = await resolvePressSelection({ outputDir, slug: "" });
    assert.equal(selection.slug, "userstory");
    assert.equal(selection.title, "User Story");
    assert.deepEqual(selection.knownSlugs, ["userstory", "slide"]);
  } finally {
    await fs.rm(outputDir, { recursive: true, force: true });
  }
});

test("resolvePressSelection matches a slug exactly", async () => {
  const outputDir = await withWorkspaceManifest([
    { slug: "userstory", title: "User Story", documentUrl: "/x", type: "pages", page: null, pageCount: 1 },
    { slug: "slide", title: "Hello, slide", documentUrl: "/x", type: "slides", page: null, pageCount: 1 },
  ]);
  try {
    const selection = await resolvePressSelection({ outputDir, slug: "slide" });
    assert.equal(selection.slug, "slide");
    assert.equal(selection.title, "Hello, slide");
  } finally {
    await fs.rm(outputDir, { recursive: true, force: true });
  }
});

test("resolvePressSelection ignores leading/trailing slashes on the supplied slug", async () => {
  const outputDir = await withWorkspaceManifest([
    { slug: "slide", title: "Hello, slide", documentUrl: "/x", type: "slides", page: null, pageCount: 1 },
  ]);
  try {
    const selection = await resolvePressSelection({ outputDir, slug: "/slide/" });
    assert.equal(selection.slug, "slide");
  } finally {
    await fs.rm(outputDir, { recursive: true, force: true });
  }
});

test("resolvePressSelection raises a clear error when the slug is unknown", async () => {
  const outputDir = await withWorkspaceManifest([
    { slug: "userstory", title: "User Story", documentUrl: "/x", type: "pages", page: null, pageCount: 1 },
    { slug: "slide", title: "Hello, slide", documentUrl: "/x", type: "slides", page: null, pageCount: 1 },
  ]);
  try {
    await assert.rejects(
      resolvePressSelection({ outputDir, slug: "ghost" }),
      (error) => {
        assert.match(error.message, /Unknown --press "ghost"/);
        assert.match(error.message, /Known slugs: userstory, slide/);
        return true;
      },
    );
  } finally {
    await fs.rm(outputDir, { recursive: true, force: true });
  }
});

test("resolvePressSelection raises a clear error when the manifest is missing", async () => {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-press-selector-empty-"));
  try {
    await assert.rejects(
      resolvePressSelection({ outputDir, slug: "slide" }),
      /workspace manifest not found/,
    );
  } finally {
    await fs.rm(outputDir, { recursive: true, force: true });
  }
});

test("resolvePressSelection raises a clear error when the manifest declares no presses", async () => {
  const outputDir = await withWorkspaceManifest([]);
  try {
    await assert.rejects(
      resolvePressSelection({ outputDir, slug: "slide" }),
      /declares no Press entries/,
    );
  } finally {
    await fs.rm(outputDir, { recursive: true, force: true });
  }
});
