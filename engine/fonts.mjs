import fs from "node:fs/promises";
import path from "node:path";
import { copyDirectory } from "./file-utils.mjs";

export async function copyWorkspaceFonts(root, publicQdoc, config) {
  const fontSources = fontSourceDirectories(root, config);
  const target = path.join(publicQdoc, "fonts.css");
  const workspaceFonts = await firstExistingPath(fontSources.map((source) => path.join(source, "fonts.css")));
  if (workspaceFonts) {
    await fs.copyFile(workspaceFonts, target);
  } else {
    await fs.writeFile(target, defaultFontsCss(), "utf8");
  }

  const workspaceFontFiles = await firstExistingDirectory(fontSources.map((source) => path.join(source, "fonts")));
  if (workspaceFontFiles) {
    await copyDirectory(workspaceFontFiles, path.join(publicQdoc, "fonts"));
  } else {
    await fs.rm(path.join(publicQdoc, "fonts"), { recursive: true, force: true });
  }
}

function fontSourceDirectories(root, config) {
  const candidates = [];
  if (config?.paths?.documentRoot) candidates.push(path.join(config.paths.documentRoot, ".qdoc"));
  candidates.push(path.join(path.resolve(root), ".qdoc"));
  return [...new Set(candidates)];
}

async function firstExistingPath(candidates) {
  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch {
      // Try the next configured font source.
    }
  }
  return null;
}

async function firstExistingDirectory(candidates) {
  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) return candidate;
    } catch {
      // Try the next configured font source.
    }
  }
  return null;
}

function defaultFontsCss() {
  return `@font-face {
  font-family: "QDoc Body";
  src: local("PingFang TC"), local("Noto Sans TC"), local("Hiragino Sans"), local("Microsoft JhengHei");
  font-weight: 300 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "QDoc Serif";
  src: local("Noto Serif TC"), local("Songti TC"), local("Source Han Serif TC"), local("PMingLiU");
  font-weight: 300 700;
  font-style: normal;
  font-display: swap;
}

:root {
  --qd-font-body: "QDoc Body", "PingFang TC", "Noto Sans TC", "Hiragino Sans", "Microsoft JhengHei", sans-serif;
  --qd-font-serif: "QDoc Serif", "Noto Serif TC", "Songti TC", "Source Han Serif TC", "PMingLiU", serif;
  --qd-font-mono: "SFMono-Regular", "Menlo", "Consolas", monospace;
}
`;
}
