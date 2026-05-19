import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { loadQDocConfig, publicPdfHref } from "../../../engine/config.mjs";

const fixtureRoot = fileURLToPath(new URL("./", import.meta.url));
const appSourceRoot = fileURLToPath(new URL("../../../src", import.meta.url));
const qdocConfig = await loadQDocConfig(fixtureRoot);

const workspaceAliases = {
  "@workspace/content": qdocConfig.paths.sourceDir,
  "@workspace/media": qdocConfig.paths.mediaDir,
  "@workspace/components": qdocConfig.paths.componentsDir,
  "@workspace/design-system": qdocConfig.paths.designSystemDir,
};

function relativeFromFixture(absolutePath: string) {
  const relativePath = path.relative(fixtureRoot, absolutePath).replaceAll("\\", "/");
  return relativePath.endsWith("/") ? relativePath : `${relativePath}`;
}

export default defineConfig({
  base: "./",
  plugins: [react()],
  define: {
    __QDOC_CONTENT_PATH__: JSON.stringify(relativeFromFixture(qdocConfig.paths.sourceDir)),
    __QDOC_MEDIA_PATH__: JSON.stringify(relativeFromFixture(qdocConfig.paths.mediaDir)),
    __QDOC_COMPONENTS_PATH__: JSON.stringify(relativeFromFixture(qdocConfig.paths.componentsDir)),
    __QDOC_DESIGN_SYSTEM_PATH__: JSON.stringify(relativeFromFixture(qdocConfig.paths.designSystemDir)),
    __QDOC_PDF_HREF__: JSON.stringify(publicPdfHref(qdocConfig)),
  },
  resolve: {
    alias: {
      "@": appSourceRoot,
      ...workspaceAliases,
    },
  },
  build: {
    outDir: qdocConfig.paths.outputDir,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash]-qdoc.js",
        chunkFileNames: "assets/[name]-[hash]-qdoc.js",
        assetFileNames: "assets/[name]-[hash]-qdoc[extname]",
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5175,
  },
  preview: {
    host: "127.0.0.1",
    port: 5175,
  },
});
