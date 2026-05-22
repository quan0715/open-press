import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://open-press.dev",
  trailingSlash: "never",
  build: {
    format: "directory",
  },
});
