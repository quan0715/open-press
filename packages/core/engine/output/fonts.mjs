import fs from "node:fs/promises";
import path from "node:path";
import { copyDirectory } from "../runtime/file-utils.mjs";

export async function copyThemeFonts(root, publicOutputDir, config) {
  const themeDir = config?.paths?.themeDir ?? path.join(path.resolve(root), "theme");
  const target = path.join(publicOutputDir, "fonts.css");
  const themeFonts = path.join(themeDir, "fonts.css");
  if (await isFile(themeFonts)) {
    await fs.copyFile(themeFonts, target);
  } else {
    await fs.writeFile(target, defaultFontsCss(), "utf8");
  }

  const themeFontFiles = path.join(themeDir, "fonts");
  if (await isDirectory(themeFontFiles)) {
    await copyDirectory(themeFontFiles, path.join(publicOutputDir, "fonts"));
  } else {
    await fs.rm(path.join(publicOutputDir, "fonts"), { recursive: true, force: true });
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
  font-family: "OpenPress Body";
  src: local("PingFang TC"), local("Noto Sans TC"), local("Hiragino Sans"), local("Microsoft JhengHei");
  font-weight: 300 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "OpenPress Serif";
  src: local("Noto Serif TC"), local("Songti TC"), local("Source Han Serif TC"), local("PMingLiU");
  font-weight: 300 700;
  font-style: normal;
  font-display: swap;
}

:root {
  --openpress-font-body: "OpenPress Body", "PingFang TC", "Noto Sans TC", "Hiragino Sans", "Microsoft JhengHei", sans-serif;
  --openpress-font-serif: "OpenPress Serif", "Noto Serif TC", "Songti TC", "Source Han Serif TC", "PMingLiU", serif;
  --openpress-font-mono: "SFMono-Regular", "Menlo", "Consolas", monospace;
}
`;
}
