import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));

test("workbench stage stays centered inside the main grid cell when both panels are open", async () => {
  const css = await fs.readFile(new URL("../src/styles/openpress/workbench.css", import.meta.url), "utf8");

  assert.doesNotMatch(
    css,
    /openpress-workbench__stage\s*{[^}]*padding-inline-start:\s*max\(0px,\s*calc\(var\(--openpress-workbench-right-width\)/s,
  );
});

test("reader page content keeps canonical page geometry instead of responsive width rules", async () => {
  const runtimeCss = await fs.readFile(new URL("../src/styles/openpress/reader-runtime.css", import.meta.url), "utf8");
  const responsiveCss = await fs.readFile(new URL("../src/styles/openpress/responsive.css", import.meta.url), "utf8");
  const publicViewerCss = await fs.readFile(new URL("../src/styles/openpress/public-viewer.css", import.meta.url), "utf8");
  const publicReaderSource = await fs.readFile(new URL("../src/openpress/reader/PublicReaderPage.tsx", import.meta.url), "utf8");
  const workbenchSource = await fs.readFile(new URL("../src/openpress/workbench/Workbench.tsx", import.meta.url), "utf8");

  assert.match(
    runtimeCss,
    /\.openpress-html-page__html\s*{\s*[^}]*width:\s*var\(--openpress-page-width\);[^}]*height:\s*var\(--openpress-page-height\);/s,
  );
  assert.match(
    runtimeCss,
    /\.openpress-html-page__html\s*\.reader-page\s*{[^}]*width:\s*var\(--openpress-page-width\);[^}]*height:\s*var\(--openpress-page-height\);/s,
  );
  assert.doesNotMatch(
    runtimeCss,
    /\.openpress-html-page__html\s*\.reader-page\s*{[^}]*width:\s*min\(/s,
  );
  assert.doesNotMatch(
    responsiveCss,
    /\.openpress-public-viewer\s+\.openpress-html-page__html\s+\.reader-page[\s\S]*?width:\s*100%/,
  );
  assert.doesNotMatch(publicViewerCss, /data-openpress-view-mode="reading"/);
  assert.doesNotMatch(publicViewerCss, /--openpress-reading-/);
  assert.doesNotMatch(publicReaderSource, /viewMode\s*===\s*"reading"/);
  assert.doesNotMatch(workbenchSource, /viewMode\s*===\s*"reading"/);
  assert.doesNotMatch(
    publicViewerCss,
    /\.openpress-public-viewer\s+\.reader-stage\s*{[^}]*overflow-x:\s*hidden/s,
  );
  assert.doesNotMatch(
    responsiveCss,
    /\.openpress-public-viewer\s+\.reader-pages\s*{/,
  );
  assert.doesNotMatch(
    responsiveCss,
    /\.openpress-public-viewer\s+\.openpress-html-page\s*{/,
  );
});

test("reader pages use a compact fixed gap and spread grid outside page content", async () => {
  const runtimeCss = await fs.readFile(new URL("../src/styles/openpress/reader-runtime.css", import.meta.url), "utf8");
  const publicViewerCss = await fs.readFile(new URL("../src/styles/openpress/public-viewer.css", import.meta.url), "utf8");

  assert.match(runtimeCss, /\.openpress-reader-app\s+\.reader-pages\s*{[^}]*--openpress-page-gap:\s*8px;/s);
  assert.match(
    runtimeCss,
    /\.openpress-reader-app\s+\.reader-pages\[data-openpress-page-layout="spread"\]\s*{[^}]*grid-template-columns:\s*repeat\(2,\s*calc\(var\(--openpress-page-width\)\s*\*\s*var\(--openpress-page-viewport-scale,\s*1\)\)\);/s,
  );
  assert.doesNotMatch(runtimeCss, /\.openpress-html-page\s*{[^}]*margin:\s*0\s+auto\s+12px;/s);
  assert.doesNotMatch(publicViewerCss, /\.openpress-public-viewer\s+\.openpress-html-page\s*{[^}]*margin:\s*0\s+auto\s+12px;/s);
});

test("dogfood document theme keeps page geometry fixed instead of viewport-responsive", async () => {
  const pageContractCss = await fs.readFile(path.join(repoRoot, "press/theme/base/page-contract.css"), "utf8");

  assert.match(pageContractCss, /--reader-page-width:\s*var\(--openpress-page-width\);/);
  assert.doesNotMatch(pageContractCss, /--reader-page-width:[^;]*(?:100cqw|100vw|calc\(|min\()/);
  assert.match(
    pageContractCss,
    /\.reader-page\s*{[^}]*width:\s*var\(--reader-page-width,\s*var\(--openpress-page-width\)\);[^}]*height:\s*var\(--openpress-page-height\);/s,
  );
  assert.doesNotMatch(pageContractCss, /\.reader-page\s*{[^}]*height:\s*calc\(var\(--reader-page-width/s);
});

test("dogfood document content is not rewritten by viewport media queries", async () => {
  const cssFiles = await listCssFiles([
    path.join(repoRoot, "press/theme"),
    path.join(repoRoot, "press/components"),
  ]);
  const offenders = [];

  for (const filePath of cssFiles) {
    const relativePath = path.relative(repoRoot, filePath);
    const css = await fs.readFile(filePath, "utf8");
    for (const block of extractMediaBlocks(css)) {
      if (!isViewportMediaPrelude(block.prelude)) continue;

      if (relativePath === "press/theme/shell/reader-controls.css") {
        if (containsDocumentContentSelector(block.body)) offenders.push(`${relativePath}: @media ${block.prelude.trim()}`);
        continue;
      }

      if (relativePath !== "press/theme/base/print.css") {
        offenders.push(`${relativePath}: @media ${block.prelude.trim()}`);
      }
    }
  }

  assert.deepEqual(offenders, []);
});

async function listCssFiles(roots) {
  const files = [];
  for (const root of roots) await collectCssFiles(root, files);
  return files.sort();
}

async function collectCssFiles(directory, files) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectCssFiles(entryPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".css")) {
      files.push(entryPath);
    }
  }
}

function extractMediaBlocks(css) {
  const blocks = [];
  let cursor = 0;
  while (cursor < css.length) {
    const mediaIndex = css.indexOf("@media", cursor);
    if (mediaIndex === -1) break;
    const blockStart = css.indexOf("{", mediaIndex);
    if (blockStart === -1) break;
    const blockEnd = findCssBlockEnd(css, blockStart);
    if (blockEnd === -1) break;
    blocks.push({
      prelude: css.slice(mediaIndex + "@media".length, blockStart),
      body: css.slice(blockStart + 1, blockEnd),
    });
    cursor = blockEnd + 1;
  }
  return blocks;
}

function isViewportMediaPrelude(prelude) {
  const normalized = prelude.toLowerCase();
  return /(?:^|[^\w-])(?:min|max)-(?:width|height)(?:[^\w-]|$)/.test(normalized)
    || /(?:^|[^\w-])(?:width|height|device-width|device-height|orientation|aspect-ratio)(?:\s*[<>=:]|\s*\))/.test(normalized);
}

function containsDocumentContentSelector(css) {
  return /(?:^|[,{]\s*)(?:\.reader-pages|\.reader-page|\.page-frame|\.page-body|\.reader-page--content|\.[\w-]+-(?:figure|showcase|specimen)|h2|h3|h4|p|ol|ul|table|figcaption|caption|th|td)\b/s.test(css);
}

function findCssBlockEnd(css, blockStart) {
  let depth = 0;
  let quote = "";
  let inComment = false;
  for (let index = blockStart; index < css.length; index += 1) {
    const current = css[index];
    const next = css[index + 1];
    if (inComment) {
      if (current === "*" && next === "/") {
        inComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (current === "\\") {
        index += 1;
      } else if (current === quote) {
        quote = "";
      }
      continue;
    }
    if (current === "/" && next === "*") {
      inComment = true;
      index += 1;
      continue;
    }
    if (current === "\"" || current === "'") {
      quote = current;
      continue;
    }
    if (current === "{") {
      depth += 1;
    } else if (current === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}
