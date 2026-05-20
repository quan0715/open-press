export default {
  title: "Reader E2E Fixture",
  subtitle: "Navigation contract",
  organization: "QDoc",
  workspaceLabel: "Reader fixture",

  sourceDir: "content",
  mediaDir: "media",
  themeDir: "theme",
  designDoc: "design.md",
  componentsDir: "components",
  publicDir: "public/qdoc",
  outputDir: "dist",

  pdf: {
    filename: "reader-e2e-fixture.pdf",
  },

  deploy: {
    adapter: "cloudflare-pages",
    source: ".deploy/reader-e2e-fixture",
    projectName: "reader-e2e-fixture",
    commitDirty: false,
    requiresConfirmation: true,
  },
};
