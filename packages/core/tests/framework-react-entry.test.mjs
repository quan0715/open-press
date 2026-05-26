import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createReactSsrServer, loadReactDocumentEntry } from "../engine/react/document-entry.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function withTempWorkspace(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-react-entry-"));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 });
  }
}

async function writeDocumentEntry(workspace, source) {
  const documentDir = path.join(workspace, "document");
  await fs.mkdir(documentDir, { recursive: true });
  await fs.writeFile(path.join(documentDir, "index.tsx"), source, "utf8");
}

const PRESS_TREE_FIXTURE = `import { Press, Frame } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";

export const config = {
  title: "Fixture Doc",
  publicDir: "public/openpress",
  outputDir: "dist",
};

export const sources = {
  story: mdxSource({ preset: "section-folders", root: "chapters" }),
};

export default function FixturePress() {
  return (
    <Press>
      <Frame frameKey="cover" role="manuscript.cover">Cover</Frame>
    </Press>
  );
}
`;

test("loadReactDocumentEntry loads Press tree default export with config and sources", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeDocumentEntry(workspace, PRESS_TREE_FIXTURE);
    const entry = await loadReactDocumentEntry(workspace);
    assert.ok(entry);
    assert.equal(entry.config.title, "Fixture Doc");
    assert.equal(entry.config.documentDir, "document");
    assert.equal(entry.config.publicDir, "public/openpress");
    assert.equal(entry.config.outputDir, "dist");
    assert.equal(typeof entry.Press, "function");
    assert.ok(entry.sources.story);
    assert.equal(entry.sources.story.type, "mdx");
    assert.equal(entry.sources.story.preset, "section-folders");
  });
});

test("loadReactDocumentEntry accepts top-level OpenPress block comment markers", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeDocumentEntry(
      workspace,
      `/* @openpress-comment id="c-entrytop" ts="2026-05-20T00:00:00.000Z" text="eyJub3RlIjoi5qqi5p-lIn0" */
${PRESS_TREE_FIXTURE}`,
    );

    const entry = await loadReactDocumentEntry(workspace);

    assert.ok(entry);
    assert.equal(entry.config.title, "Fixture Doc");
    assert.equal(typeof entry.Press, "function");
  });
});

test("React SSR loader isolates its Vite optimizer cache from the client dev server", async () => {
  await withTempWorkspace(async (workspace) => {
    const server = await createReactSsrServer(workspace);
    try {
      assert.equal(server.config.cacheDir, path.join(workspace, ".openpress", "vite-ssr"));
    } finally {
      await server.close();
    }
  });
});

test("loadReactDocumentEntry maps manifest path overrides into normalized config", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeDocumentEntry(
      workspace,
      `import { Press } from "@open-press/core";
export const config = {
  title: "Custom Paths",
  paths: {
    chaptersDir: "book",
    componentsDir: "ui",
    mediaDir: "assets",
    themeDir: "visual",
    designDoc: "guide.md",
  },
};
export default function() {
  return <Press />;
}
`,
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

test("loadReactDocumentEntry returns null Press when default export is missing", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeDocumentEntry(
      workspace,
      `export const config = { title: "Config Only" };\n`,
    );
    const entry = await loadReactDocumentEntry(workspace);
    assert.ok(entry);
    assert.equal(entry.Press, null);
    assert.equal(entry.config.title, "Config Only");
  });
});

test("loadReactDocumentEntry rejects top-level side effects before executing them", async () => {
  await withTempWorkspace(async (workspace) => {
    const sideEffectPath = path.join(workspace, "side-effect.txt");
    await writeDocumentEntry(
      workspace,
      `import fs from "node:fs";

fs.writeFileSync(${JSON.stringify(sideEffectPath)}, "executed");

export const config = { title: "Bad Entry" };
`,
    );

    await assert.rejects(
      () => loadReactDocumentEntry(workspace),
      /unsupported top-level side effect|imports filesystem APIs/i,
    );
    await assert.rejects(() => fs.stat(sideEffectPath), /ENOENT/);
  });
});

test("Vite and TypeScript expose @open-press/core subpath aliases", async () => {
  const viteConfig = await fs.readFile(path.join(ROOT, "vite.config.ts"), "utf8");
  assert.ok(viteConfig.includes('"@open-press/core"'), "vite config must alias @open-press/core");
  assert.ok(viteConfig.includes('"@open-press/core/mdx"'), "vite config must alias @open-press/core/mdx");
  assert.ok(viteConfig.includes('"@open-press/core/manuscript"'), "vite config must alias @open-press/core/manuscript");

  const tsconfig = JSON.parse(await fs.readFile(path.join(ROOT, "tsconfig.json"), "utf8"));
  assert.equal(tsconfig.compilerOptions.paths["@open-press/core"][0], "./src/openpress/core/index.tsx");
  assert.equal(tsconfig.compilerOptions.paths["@open-press/core/mdx"][0], "./src/openpress/mdx/index.ts");
  assert.equal(tsconfig.compilerOptions.paths["@open-press/core/manuscript"][0], "./src/openpress/manuscript/index.tsx");
});
