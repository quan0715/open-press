import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { loadConfig } from "./engine/config.mjs";

const sourceRoot = fileURLToPath(new URL("./src", import.meta.url));
const workspaceRoot = fileURLToPath(new URL("./", import.meta.url));
const openpressConfig = await loadConfig(workspaceRoot);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": sourceRoot,
      "@workspace/content": openpressConfig.paths.sourceDir,
      "@workspace/media": openpressConfig.paths.mediaDir,
      "@workspace/components": openpressConfig.paths.componentsDir,
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
