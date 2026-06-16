import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildContentCss } from "../engine/runtime/file-utils.mjs";
import { buildSectionScopedCss, scopeSectionCss } from "../engine/react/section-css.mjs";
import { discoverSectionStyles, validateCssImportBoundaries } from "../engine/react/style-discovery.mjs";
import { rmWithRetry } from "./_temp.mjs";

const FRAMEWORK_PAGE_CONTRACT = path.resolve(import.meta.dirname, "../src/styles/openpress/page-contract.css");

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
    await writeFile(path.join(root, "press/report/chapters/04-linked-list/content/01.mdx"), "# List\n");
    await writeFile(path.join(root, "press/report/chapters/04-linked-list/styles/chapter.css"), "h2 { color: red; }\n");
    await writeFile(path.join(root, "press/report/chapters/05-tree/content/01.mdx"), "# Tree\n");
    await writeFile(path.join(root, "press/report/chapters/05-tree/styles/tree.css"), ".node { color: green; }\n");

    const workspace = await discoverSectionStyles(root, {}, {
      sectionRoots: [path.join(root, "press", "report", "chapters")],
    });
    const css = await buildSectionScopedCss(workspace);

    assert.match(css, /report\/chapters\/04-linked-list\/styles\/chapter\.css/);
    assert.match(css, /\[data-section-id="linked-list"\] :where\(h2\)/);
    assert.match(css, /report\/chapters\/05-tree\/styles\/tree\.css/);
    assert.match(css, /\[data-section-id="tree"\] :where\(\.node\)/);
  } finally {
    await rmWithRetry(root);
  }
});

test("buildContentCss ignores workspace shared base and page-surface CSS", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-content-css-"));
  try {
    const themeRoot = path.join(root, "press/shared/theme");
    const files = {
      // page-contract.css is now framework-owned; workspace does not need to provide it
      "base/typography.css": ".legacy-typography { color: black; }",
      "page-surfaces/cover.css": ".cover { color: black; }",
      "page-surfaces/back-cover.css": ".back-cover { color: black; }",
      "page-surfaces/slide.css": ".slide-surface { color: blue; }",
      "page-surfaces/social.css": ".social-surface { color: green; }",
      "base/print.css": "@media print { .legacy-print { color: black; } }",
    };
    for (const [relativePath, source] of Object.entries(files)) {
      await writeFile(path.join(themeRoot, relativePath), source);
    }

    const css = await buildContentCss(root, {
      paths: {
        documentRoot: path.join(root, "press"),
        themeDir: themeRoot,
        componentsDir: path.join(root, "press/shared/components"),
      },
    });

    // Framework-owned page-contract.css is always prepended first
    assert.match(css, /framework\/openpress\/page-contract\.css/);
    assert.doesNotMatch(css, /base\/typography\.css/);
    assert.doesNotMatch(css, /\.legacy-typography/);
    assert.doesNotMatch(css, /page-surfaces\/slide\.css/);
    assert.doesNotMatch(css, /\.slide-surface/);
    assert.doesNotMatch(css, /page-surfaces\/social\.css/);
    assert.doesNotMatch(css, /\.social-surface/);
    assert.doesNotMatch(css, /base\/print\.css/);
    assert.doesNotMatch(css, /\.legacy-print/);
    assert.doesNotMatch(css, /shell\/reader-controls\.css/);
  } finally {
    await rmWithRetry(root);
  }
});

test("framework page contract stays generic and project-neutral", async () => {
  const css = await fs.readFile(FRAMEWORK_PAGE_CONTRACT, "utf8");

  assert.doesNotMatch(css, /\b(thesis|nycu|watermark)\b/i);
});

test("CSS boundaries reject press.tsx CSS imports and slide/layout theme imports", () => {
  assert.deepEqual(validateCssImportBoundaries({
    filePath: "/repo/press/deck/press.tsx",
    source: 'import "./slides/cover/style.css";',
  }), ["press.tsx must not import CSS"]);

  assert.deepEqual(validateCssImportBoundaries({
    filePath: "/repo/press/deck/slides/cover/slide.tsx",
    source: 'import tokens from "../../theme/tokens.css";',
  }), ["slide and layout files must not import from theme/ directly"]);

  assert.deepEqual(validateCssImportBoundaries({
    filePath: "/repo/press/deck/layouts/TitleSlide.tsx",
    source: 'import "../../theme/reset.css";',
  }), ["slide and layout files must not import from theme/ directly"]);
});
