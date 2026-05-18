// editorial-monograph starter — 套用後請填上專案 metadata。
// 路徑欄位（sourceDir / mediaDir / themeDir 等）已是預設值，
// 想換目錄結構再改。
export default {
  title: "QDoc",
  subtitle: "產品說明、使用流程與 Agent 互動建議",
  organization: "QDoc",

  sourceDir: "content",
  mediaDir: "media",
  themeDir: "theme",
  designSystemDir: "design-system",
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
