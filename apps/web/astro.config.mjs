import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";

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

  redirects: {
    "/docs": "/zh-tw/docs/getting-started",
    "/zh-tw/docs": "/zh-tw/docs/getting-started",
    "/en/docs": "/en/docs/getting-started",
    "/ja/docs": "/ja/docs/getting-started",
  },

  integrations: [mdx(), tailwind()],
});