// editorial-monograph starter — 套用後請填上專案 metadata。
export default {
  title: "QDoc",
  subtitle: "產品說明、使用流程與 Agent 互動建議",
  organization: "QDoc",

  sourceDir: "chapters",
  mediaDir: "media",
  themeDir: "theme",
  designDoc: "design.md",
  componentsDir: "components",
  publicDir: "public/qdoc",
  outputDir: "dist-react",

  pdf: {
    filename: "document.pdf",
  },

  deploy: {
    adapter: "cloudflare-pages",
    source: ".deploy/document",
    projectName: null,
    commitDirty: false,
    requiresConfirmation: true,
  },
};
