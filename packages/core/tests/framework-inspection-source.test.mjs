import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadConfig } from "../engine/runtime/config.mjs";
import { collectInspectionSources } from "../engine/runtime/inspection.mjs";
import { rmWithRetry } from "./_temp.mjs";

async function withTempWorkspace(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-inspection-source-"));
  try {
    return await fn(dir);
  } finally {
    await rmWithRetry(dir);
  }
}

async function writeFile(filePath, source) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, source, "utf8");
}

test("inspection source scan reads React MDX chapters from a press folder entry", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeFile(
      path.join(workspace, "package.json"),
      JSON.stringify({ name: "inspection-source-fixture", private: true, openpress: {} }, null, 2),
    );
    await writeFile(
      path.join(workspace, "press/report/press.tsx"),
      `import { Press, Frame } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";

export default function Doc() {
  return (
    <Press
      slug="report"
      title="Inspection Source Fixture"
      componentsDir="./components"
      sources={[mdxSource({ id: "story", preset: "section-folders", root: "report/chapters" })]}
    >
      <Frame frameKey="cover" role="manuscript.cover">Cover</Frame>
    </Press>
  );
}
`,
    );
    await writeFile(path.join(workspace, "press/design.md"), "# Design\n");
    await writeFile(path.join(workspace, "press/report/components/Widget.tsx"), "export default function Widget() { return null; }\n");
    await writeFile(
      path.join(workspace, "press/report/chapters/01-intro/content/01-start.mdx"),
      [
        "## Intro",
        "",
        "<Widget />",
      ].join("\n"),
    );

    const config = await loadConfig(workspace);
    const sources = await collectInspectionSources(config);

    assert.equal(sources.sourceKind, "react-mdx");
    assert.deepEqual(sources.contentFiles.map((file) => file.relativePath), [
      "press/report/chapters/01-intro/content/01-start.mdx",
    ]);
    assert.deepEqual(sources.componentUsage, [
      {
        name: "Widget",
        count: 1,
        files: ["press/report/chapters/01-intro/content/01-start.mdx"],
      },
    ]);
    assert.equal(sources.summary.sourceFiles, 1);
  });
});
