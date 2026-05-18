import fs from "node:fs/promises";
import path from "node:path";
import { copyDirectory } from "./file-utils.mjs";

export async function copyThemeFonts(root, publicQdoc, config) {
  const themeDir = config?.paths?.themeDir ?? path.join(path.resolve(root), "theme");
  const target = path.join(publicQdoc, "fonts.css");
  const themeFonts = path.join(themeDir, "fonts.css");
  if (await isFile(themeFonts)) {
    await fs.copyFile(themeFonts, target);
  } else {
    await fs.writeFile(target, defaultFontsCss(), "utf8");
  }

  const themeFontFiles = path.join(themeDir, "fonts");
  if (await isDirectory(themeFontFiles)) {
    await copyDirectory(themeFontFiles, path.join(publicQdoc, "fonts"));
  } else {
    await fs.rm(path.join(publicQdoc, "fonts"), { recursive: true, force: true });
  }
}

async function isFile(filePath) {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function isDirectory(filePath) {
  try {
    return (await fs.stat(filePath)).isDirectory();
  } catch {
    return false;
  }
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
