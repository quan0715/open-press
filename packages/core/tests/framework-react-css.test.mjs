import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildSectionScopedCss, scopeSectionCss } from "../engine/react/section-css.mjs";
import { discoverSectionStyles } from "../engine/react/style-discovery.mjs";

async function writeFile(filePath, source) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, source, "utf8");
}

test("scopeSectionCss prefixes ordinary selectors and nested media rules", async () => {
  const css = await scopeSectionCss(
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
    { sectionSlug: "linked-list", from: "chapter.css" },
  );

  assert.match(css, /\[data-section-id="linked-list"\] :where\(h2, \.callout > p\)/);
  assert.match(css, /@media print\s*{\s*\[data-section-id="linked-list"\] :where\(\.print-note\)/);
  assert.match(css, /@keyframes pulse\s*{\s*from\s*{\s*opacity: 0/);
  assert.doesNotMatch(css, /\[data-section-id="linked-list"\] :where\(from\)/);
});

test("buildSectionScopedCss reads chapter styles in discovery order", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-react-css-"));
  try {
    await writeFile(path.join(root, "press/chapters/04-linked-list/content/01.mdx"), "# List\n");
    await writeFile(path.join(root, "press/chapters/04-linked-list/styles/chapter.css"), "h2 { color: red; }\n");
    await writeFile(path.join(root, "press/chapters/05-tree/content/01.mdx"), "# Tree\n");
    await writeFile(path.join(root, "press/chapters/05-tree/styles/tree.css"), ".node { color: green; }\n");

    const workspace = await discoverSectionStyles(root);
    const css = await buildSectionScopedCss(workspace);

    assert.match(css, /chapters\/04-linked-list\/styles\/chapter\.css/);
    assert.match(css, /\[data-section-id="linked-list"\] :where\(h2\)/);
    assert.match(css, /chapters\/05-tree\/styles\/tree\.css/);
    assert.match(css, /\[data-section-id="tree"\] :where\(\.node\)/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
