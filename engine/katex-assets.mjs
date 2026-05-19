import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const QDOC_KATEX_OVERRIDES = `

/* QDoc math sizing keeps inline equations aligned with document typography. */
.report-page .katex {
  font-size: 1em;
}

.report-page .katex-display {
  margin: var(--qd-space-2) 0 var(--qd-space-3);
  overflow-x: auto;
  overflow-y: hidden;
  padding: 1mm 0;
}

.report-page .katex-display > .katex {
  font-size: 1.05em;
}
`;

export async function readKatexCss() {
  const cssPath = require.resolve("katex/dist/katex.min.css");
  const css = await fs.readFile(cssPath, "utf8");
  return `${css.replace(/url\(fonts\/([^)]+)\)/g, 'url("/qdoc/katex-fonts/$1")')}${QDOC_KATEX_OVERRIDES}`;
}

export async function copyKatexFonts(publicQdoc) {
  const sampleFont = require.resolve("katex/dist/fonts/KaTeX_Main-Regular.woff2");
  const sourceDir = path.dirname(sampleFont);
  const targetDir = path.join(publicQdoc, "katex-fonts");
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.cp(sourceDir, targetDir, { recursive: true });
}
