import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createReactSsrServer, loadReactDocumentEntry } from "../engine/react/document-entry.mjs";
import { rmWithRetry } from "./_temp.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function withTempWorkspace(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-react-entry-"));
  try {
    return await fn(dir);
  } finally {
    await rmWithRetry(dir);
  }
}

async function writeDocumentEntry(workspace, source) {
  await writePressEntry(workspace, "report", source);
}

async function writePressEntry(workspace, folder, source) {
  const pressDir = path.join(workspace, "press", folder);
  await fs.mkdir(pressDir, { recursive: true });
  await fs.writeFile(path.join(pressDir, "press.tsx"), source, "utf8");
}

async function writeSlideFile(workspace, folder, id, source = null) {
  const slidePath = path.join(workspace, "press", folder, "slides", id, "slide.tsx");
  await fs.mkdir(path.dirname(slidePath), { recursive: true });
  await fs.writeFile(
    slidePath,
    source ?? `import { Frame } from "@open-press/core";

export default function FixtureSlide() {
  return <Frame frameKey="${id}" role="canvas.slide">${id}</Frame>;
}
`,
    "utf8",
  );
}

const PRESS_TREE_FIXTURE = `import { Press, Frame } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";

export default function FixturePress() {
  return (
    <Press
      slug="report"
      title="Fixture Doc"
      sources={[mdxSource({ id: "story", preset: "section-folders", root: "report/chapters" })]}
    >
      <Frame frameKey="cover" role="manuscript.cover">Cover</Frame>
    </Press>
  );
}
`;

test("loadReactDocumentEntry returns Press JSX metadata for each press in the workspace", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeDocumentEntry(workspace, PRESS_TREE_FIXTURE);
    const entry = await loadReactDocumentEntry(workspace);
    assert.ok(entry);
    assert.equal(entry.config.documentDir, "press");
    assert.equal(entry.config.publicDir, "public/openpress");
    assert.equal(entry.config.outputDir, "dist-react");
    assert.equal(typeof entry.Press, "function");
    assert.equal(entry.presses.length, 1);
    assert.equal(entry.presses[0].metadata.title, "Fixture Doc");
    assert.ok(entry.presses[0].sources?.story);
    assert.equal(entry.presses[0].sources.story.type, "mdx");
    assert.equal(entry.presses[0].sources.story.preset, "section-folders");
  });
});

test("loadReactDocumentEntry expands inert Press wrapper components inside Workspace", async () => {
  await withTempWorkspace(async (workspace) => {
    await writePressEntry(
      workspace,
      "social",
      `import { Workspace, Press, Frame } from "@open-press/core";

function SocialPress() {
  return (
    <Press slug="social" title="Social Fixture" page="social-square">
      <Frame frameKey="card-01" role="canvas.card">Social</Frame>
    </Press>
  );
}

function SlidePress() {
  return (
    <Press slug="slide" title="Slide Fixture" type="slides" page="slide-16-9">
      <Frame frameKey="slide-01" role="canvas.slide">Slide</Frame>
    </Press>
  );
}

export default function FixtureWorkspace() {
  return (
    <Workspace>
      <SocialPress />
    </Workspace>
  );
}
`,
    );
    await writePressEntry(
      workspace,
      "slide",
      `import { Press, Slide } from "@open-press/core";

function SlidePress() {
  return (
    <Press slug="slide" title="Slide Fixture" type="slides" page="slide-16-9">
      <Slide id="slide-01" />
    </Press>
  );
}

export default function FixtureWorkspace() {
  return <SlidePress />;
}
`,
    );
    await writeSlideFile(workspace, "slide", "slide-01");

    const entry = await loadReactDocumentEntry(workspace);

    assert.ok(entry);
    assert.equal(entry.presses.length, 2);
    const presses = new Map(entry.presses.map((press) => [press.metadata.slug, press.metadata]));
    assert.equal(presses.get("social")?.title, "Social Fixture");
    assert.equal(presses.get("social")?.page, "social-square");
    assert.equal(presses.get("slide")?.title, "Slide Fixture");
    assert.equal(presses.get("slide")?.type, "slides");
    assert.equal(presses.get("slide")?.page, "slide-16-9");
  });
});

test("loadReactDocumentEntry discovers press folder entries when root entry is absent", async () => {
  await withTempWorkspace(async (workspace) => {
    await writePressEntry(
      workspace,
      "slide",
      `import { Press, Slide } from "@open-press/core";

export default function SlidePress() {
  return (
    <Press slug="slide" title="Slide Fixture" type="slides" page="slide-16-9">
      <Slide id="cover" />
    </Press>
  );
}
`,
    );
    await writeSlideFile(workspace, "slide", "cover");
    await writePressEntry(
      workspace,
      "shared",
      `import { Press } from "@open-press/core";
export default function SharedPress() {
  return <Press slug="shared" title="Should be ignored" />;
}
`,
    );

    const entry = await loadReactDocumentEntry(workspace);

    assert.ok(entry);
    assert.match(entry.entryPath, /\.openpress[/\\]react[/\\]discovered-press-entry\.tsx$/);
    assert.equal(entry.wrappedInWorkspace, true);
    assert.deepEqual(entry.pressFolders, ["slide"]);
    assert.equal(entry.presses.length, 1);
    assert.equal(entry.presses[0].metadata.slug, "slide");
    assert.equal(entry.presses[0].metadata.title, "Slide Fixture");
    assert.equal(entry.presses[0].metadata.type, "slides");
    assert.equal(entry.presses[0].metadata.page, "slide-16-9");
  });
});

test("loadReactDocumentEntry preserves the optional Press type metadata", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeDocumentEntry(
      workspace,
      `import { Press, Slide } from "@open-press/core";

export default function FixturePress() {
  return (
    <Press slug="report" title="Fixture Doc" type="slides" page="slide-16-9">
      <Slide id="cover" />
    </Press>
  );
}
`,
    );
    await writeSlideFile(workspace, "report", "cover");

    const entry = await loadReactDocumentEntry(workspace);

    assert.ok(entry);
    assert.equal(entry.presses[0].metadata.type, "slides");
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
    assert.equal(entry.presses[0].metadata.title, "Fixture Doc");
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

// Removed in 1.0: tests for `paths.*` overrides. 1.0 paths are fixed
// conventions under `press/<slug>/`, so the old override contract no
// longer exists.

test("loadReactDocumentEntry returns null Press when default export is missing", async () => {
  await withTempWorkspace(async (workspace) => {
    // No press/<name>/press.tsx entries exist.
    await fs.mkdir(path.join(workspace, "press"), { recursive: true });
    const entry = await loadReactDocumentEntry(workspace);
    assert.equal(entry, null);
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
