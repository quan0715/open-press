import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isValidElement } from "react";
import { loadReactDocumentEntry } from "../engine/react/document-entry.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function withTempWorkspace(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "qdoc-react-entry-"));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function writeDocumentEntry(workspace, source) {
  const documentDir = path.join(workspace, "document");
  await fs.mkdir(documentDir, { recursive: true });
  await fs.writeFile(path.join(documentDir, "index.tsx"), source, "utf8");
}

test("loadReactDocumentEntry loads document/index.tsx and normalizes config defaults", async () => {
  await withTempWorkspace(async (workspace) => {
    await fs.mkdir(path.join(workspace, "document/components"), { recursive: true });
    await fs.writeFile(
      path.join(workspace, "document/components/index.tsx"),
      `export function Cover() { return <div data-index-cover>Cover from index</div>; }\n`,
      "utf8",
    );
    await writeDocumentEntry(
      workspace,
      `import type { QDocManifest } from "@qdoc/core";
import { Cover } from "@/components";

export const config: QDocManifest = {
  title: "Fixture Doc",
  publicDir: "public/qdoc",
  outputDir: "dist",
};

export const cover = <Cover />;
export const toc = <div data-fixture-toc>TOC</div>;
export const backCover = <div data-fixture-back-cover>Back</div>;
`,
    );

    const entry = await loadReactDocumentEntry(workspace);

    assert.ok(entry);
    assert.equal(entry.config.title, "Fixture Doc");
    assert.equal(entry.config.documentDir, "document");
    assert.equal(entry.config.publicDir, "public/qdoc");
    assert.equal(entry.config.outputDir, "dist");
    assert.equal(entry.config.subtitle, "");
    assert.equal(entry.config.pdf.filename, "document.pdf");
    assert.equal(entry.config.paths.documentRoot, path.join(workspace, "document"));
    assert.equal(entry.config.paths.publicDir, path.join(workspace, "public/qdoc"));
    assert.equal(entry.config.paths.outputDir, path.join(workspace, "dist"));
    assert.ok(isValidElement(entry.shell.cover));
    assert.ok(isValidElement(entry.shell.toc));
    assert.ok(isValidElement(entry.shell.backCover));
    assert.equal(entry.shell.cover.type.name, "Cover");
    assert.equal(entry.shell.toc.props["data-fixture-toc"], true);
    assert.equal(entry.shell.backCover.props["data-fixture-back-cover"], true);
  });
});

test("loadReactDocumentEntry maps manifest path overrides into normalized config", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeDocumentEntry(
      workspace,
      `export const config = {
  title: "Custom Paths",
  paths: {
    chaptersDir: "book",
    componentsDir: "ui",
    mediaDir: "assets",
    themeDir: "visual",
    designDoc: "guide.md",
  },
};`,
    );

    const entry = await loadReactDocumentEntry(workspace);

    assert.ok(entry);
    assert.equal(entry.config.sourceDir, "book");
    assert.equal(entry.config.componentsDir, "ui");
    assert.equal(entry.config.mediaDir, "assets");
    assert.equal(entry.config.themeDir, "visual");
    assert.equal(entry.config.designDoc, "guide.md");
    assert.equal(entry.config.paths.sourceDir, path.join(workspace, "document/book"));
    assert.equal(entry.config.paths.componentsDir, path.join(workspace, "document/ui"));
  });
});

test("loadReactDocumentEntry returns null when document/index.tsx is absent", async () => {
  await withTempWorkspace(async (workspace) => {
    const entry = await loadReactDocumentEntry(workspace);

    assert.equal(entry, null);
  });
});

test("loadReactDocumentEntry rejects obvious top-level side effects before import", async () => {
  await withTempWorkspace(async (workspace) => {
    delete globalThis.__qdocSideEffectProbe;
    await writeDocumentEntry(
      workspace,
      `console.log("this must not run");
globalThis.__qdocSideEffectProbe = true;

export const config = {
  title: "Side Effect Fixture",
};
`,
    );

    await assert.rejects(
      () => loadReactDocumentEntry(workspace),
      /top-level side effect.+console\.log/i,
    );
    assert.equal(globalThis.__qdocSideEffectProbe, undefined);
  });
});

test("loadReactDocumentEntry rejects side-effect imports and top-level browser or file IO", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeDocumentEntry(
      workspace,
      `import "./polyfill";

export const config = { title: "Bad Import" };
`,
    );

    await assert.rejects(
      () => loadReactDocumentEntry(workspace),
      /side-effect import/i,
    );
  });

  await withTempWorkspace(async (workspace) => {
    await writeDocumentEntry(
      workspace,
      `export const config = {
  title: "Bad Fetch",
  remote: fetch("https://example.com"),
};
`,
    );

    await assert.rejects(
      () => loadReactDocumentEntry(workspace),
      /top-level side effect.+fetch/i,
    );
  });
});

test("Vite and TypeScript expose React document import aliases", async () => {
  const viteConfig = await fs.readFile(path.join(ROOT, "vite.config.ts"), "utf8");
  assert.ok(viteConfig.includes('"@qdoc/core"'), "vite config must alias @qdoc/core");
  assert.ok(viteConfig.includes('"@/components"'), "vite config must alias document components");

  const tsconfig = JSON.parse(await fs.readFile(path.join(ROOT, "tsconfig.json"), "utf8"));
  assert.equal(tsconfig.compilerOptions.paths["@qdoc/core"][0], "./src/qdoc/core/index.tsx");
  assert.deepEqual(tsconfig.compilerOptions.paths["@/components"], [
    "./document/components/index.ts",
    "./document/components/index.tsx",
  ]);
  assert.equal(tsconfig.compilerOptions.paths["@/components/*"][0], "./document/components/*");
  assert.ok(tsconfig.include.includes("document/**/*.ts"));
  assert.ok(tsconfig.include.includes("document/**/*.tsx"));
});
