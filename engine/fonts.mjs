import fs from "node:fs/promises";
import path from "node:path";
import { copyDirectory } from "./file-utils.mjs";

export async function copyWorkspaceFonts(root, publicQdoc) {
  const workspaceFonts = path.join(root, ".qdoc", "fonts.css");
  const target = path.join(publicQdoc, "fonts.css");
  try {
    await fs.copyFile(workspaceFonts, target);
  } catch {
    await fs.writeFile(target, defaultFontsCss(), "utf8");
  }

  const workspaceFontFiles = path.join(root, ".qdoc", "fonts");
  try {
    await copyDirectory(workspaceFontFiles, path.join(publicQdoc, "fonts"));
  } catch {
    await fs.rm(path.join(publicQdoc, "fonts"), { recursive: true, force: true });
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
