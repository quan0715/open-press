import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { loadQDocConfig } from "./engine/config.mjs";

const sourceRoot = fileURLToPath(new URL("./src", import.meta.url));
const workspaceRoot = fileURLToPath(new URL("./", import.meta.url));
const qdocConfig = await loadQDocConfig(workspaceRoot);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": sourceRoot,
      "@workspace/content": qdocConfig.paths.sourceDir,
      "@workspace/media": qdocConfig.paths.mediaDir,
      "@workspace/components": qdocConfig.paths.componentsDir,
      "@workspace/design-system": qdocConfig.paths.designSystemDir,
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
