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

test("inspection source scan reads React MDX chapters when press/index.tsx is present", async () => {
  await withTempWorkspace(async (workspace) => {
    await writeFile(
      path.join(workspace, "package.json"),
      JSON.stringify({ name: "inspection-source-fixture", private: true, openpress: {} }, null, 2),
    );
    await writeFile(
      path.join(workspace, "press/index.tsx"),
      `import { Workspace, Press, Frame } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";

export default function Doc() {
  return (
    <Workspace>
      <Press
        title="Inspection Source Fixture"
        sources={[mdxSource({ id: "story", preset: "section-folders", root: "chapters" })]}
      >
        <Frame frameKey="cover" role="manuscript.cover">Cover</Frame>
      </Press>
    </Workspace>
  );
}
`,
    );
    await writeFile(path.join(workspace, "press/design.md"), "# Design\n");
    await writeFile(path.join(workspace, "press/components/Widget.tsx"), "export default function Widget() { return null; }\n");
    await writeFile(
      path.join(workspace, "press/chapters/01-intro/content/01-start.mdx"),
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
      "press/chapters/01-intro/content/01-start.mdx",
    ]);
    assert.deepEqual(sources.componentUsage, [
      {
        name: "Widget",
        count: 1,
        files: ["press/chapters/01-intro/content/01-start.mdx"],
      },
    ]);
    assert.equal(sources.summary.sourceFiles, 1);
  });
});
