import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { loadConfig, publicPdfHref } from "../../../engine/runtime/config.mjs";

const fixtureRoot = fileURLToPath(new URL("./", import.meta.url));
const appSourceRoot = fileURLToPath(new URL("../../../src", import.meta.url));
const openpressConfig = await loadConfig(fixtureRoot);

const workspaceAliases = {
  "@workspace/content": openpressConfig.paths.sourceDir,
  "@workspace/media": openpressConfig.paths.mediaDir,
  "@workspace/components": openpressConfig.paths.componentsDir,
};

function relativeFromFixture(absolutePath: string) {
  const relativePath = path.relative(fixtureRoot, absolutePath).replaceAll("\\", "/");
  return relativePath.endsWith("/") ? relativePath : `${relativePath}`;
}

export default defineConfig({
  base: "./",
  plugins: [react()],
  define: {
    __OPENPRESS_CONTENT_PATH__: JSON.stringify(relativeFromFixture(openpressConfig.paths.sourceDir)),
    __OPENPRESS_MEDIA_PATH__: JSON.stringify(relativeFromFixture(openpressConfig.paths.mediaDir)),
    __OPENPRESS_COMPONENTS_PATH__: JSON.stringify(relativeFromFixture(openpressConfig.paths.componentsDir)),
    __OPENPRESS_PDF_HREF__: JSON.stringify(publicPdfHref(openpressConfig)),
  },
  resolve: {
    alias: {
      "@": appSourceRoot,
      ...workspaceAliases,
    },
  },
  build: {
    outDir: openpressConfig.paths.outputDir,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash]-openpress.js",
        chunkFileNames: "assets/[name]-[hash]-openpress.js",
        assetFileNames: "assets/[name]-[hash]-openpress[extname]",
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
