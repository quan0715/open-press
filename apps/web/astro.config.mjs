import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://open-press.dev",
  trailingSlash: "never",
  devToolbar: {
    enabled: false,
  },
  build: {
    format: "directory",
  },
});
