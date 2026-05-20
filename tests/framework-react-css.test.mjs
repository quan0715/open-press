import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildChapterScopedCss, scopeChapterCss } from "../engine/react/chapter-css.mjs";
import { discoverReactWorkspace } from "../engine/react/workspace-discovery.mjs";

async function writeFile(filePath, source) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, source, "utf8");
}

test("scopeChapterCss prefixes ordinary selectors and nested media rules", async () => {
  const css = await scopeChapterCss(
    [
      "h2, .callout > p {",
      "  color: var(--accent);",
      "}",
      "",
      "@media print {",
      "  .print-note { display: none; }",
      "}",
      "",
      "@keyframes pulse {",
      "  from { opacity: 0; }",
      "  to { opacity: 1; }",
      "}",
    ].join("\n"),
    { chapterSlug: "linked-list", from: "chapter.css" },
  );

  assert.match(css, /\[data-chapter-slug="linked-list"\] :where\(h2, \.callout > p\)/);
  assert.match(css, /@media print\s*{\s*\[data-chapter-slug="linked-list"\] :where\(\.print-note\)/);
  assert.match(css, /@keyframes pulse\s*{\s*from\s*{\s*opacity: 0/);
  assert.doesNotMatch(css, /\[data-chapter-slug="linked-list"\] :where\(from\)/);
});

test("buildChapterScopedCss reads chapter styles in discovery order", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "qdoc-react-css-"));
  try {
    await writeFile(path.join(root, "document/chapters/04-linked-list/content/01.mdx"), "# List\n");
    await writeFile(path.join(root, "document/chapters/04-linked-list/styles/chapter.css"), "h2 { color: red; }\n");
    await writeFile(path.join(root, "document/chapters/05-tree/content/01.mdx"), "# Tree\n");
    await writeFile(path.join(root, "document/chapters/05-tree/styles/tree.css"), ".node { color: green; }\n");

    const workspace = await discoverReactWorkspace(root);
    const css = await buildChapterScopedCss(workspace);

    assert.match(css, /chapters\/04-linked-list\/styles\/chapter\.css/);
    assert.match(css, /\[data-chapter-slug="linked-list"\] :where\(h2\)/);
    assert.match(css, /chapters\/05-tree\/styles\/tree\.css/);
    assert.match(css, /\[data-chapter-slug="tree"\] :where\(\.node\)/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
