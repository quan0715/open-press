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
  i18n: {
    defaultLocale: "zh-tw",
    locales: ["zh-tw", "en", "ja"],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },
});
