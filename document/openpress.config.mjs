export default {
  title: "OpenPress User Story Book",
  subtitle: "框架開發、dogfood 工作流與公開文件驗證",
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
