import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const KATEX_OVERRIDES = `

/* OpenPress math sizing keeps inline equations aligned with document typography. */
.reader-page--report .katex {
  font-size: 1em;
}

.reader-page--report .katex-display {
  display: block;
  width: fit-content;
  max-width: 100%;
  margin: var(--openpress-space-2) auto var(--openpress-space-3);
  border-block: 1px solid color-mix(in srgb, var(--openpress-color-line) 76%, transparent);
  padding: 0.55em 1.15em;
  background: color-mix(in srgb, var(--openpress-color-panel) 78%, var(--openpress-color-document));
  color: var(--openpress-color-ink);
  overflow-x: auto;
  overflow-y: hidden;
  text-align: center;
}

.reader-page--report .katex-display > .katex {
  font-size: 1.05em;
}
`;

export async function readKatexCss() {
  const cssPath = require.resolve("katex/dist/katex.min.css");
  const css = await fs.readFile(cssPath, "utf8");
  return `${css.replace(/url\(fonts\/([^)]+)\)/g, 'url("/openpress/katex-fonts/$1")')}${KATEX_OVERRIDES}`;
}

export async function copyKatexFonts(publicOutputDir) {
  const sampleFont = require.resolve("katex/dist/fonts/KaTeX_Main-Regular.woff2");
  const sourceDir = path.dirname(sampleFont);
  const targetDir = path.join(publicOutputDir, "katex-fonts");
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.cp(sourceDir, targetDir, { recursive: true });
}
