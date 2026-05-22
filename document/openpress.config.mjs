export default {
  title: "OpenPress User Story Book",
  subtitle: "AI 協作文件的使用者指南與公開範例",
  organization: "open-press",

  sourceDir: "chapters",
  mediaDir: "media",
  themeDir: "theme",
  designDoc: "design.md",
  componentsDir: "components",
  publicDir: "public/openpress",
  outputDir: "dist-react",

  pdf: {
    filename: "openpress-user-story-book.pdf",
  },

  deploy: {
    adapter: "cloudflare-pages",
    source: ".deploy/story",
    projectName: "open-press-story",
    commitDirty: false,
    requiresConfirmation: true,
  },
};
