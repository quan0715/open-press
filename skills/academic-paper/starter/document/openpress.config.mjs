// academic-paper starter — replace with your paper's metadata.
export default {
  title: "Paper Title",
  subtitle: "An academic-paper draft built with open-press",
  organization: "Department · Institution",
  page: "a4",

  sourceDir: "chapters",
  mediaDir: "media",
  themeDir: "theme",
  designDoc: "design.md",
  componentsDir: "components",
  publicDir: "public/openpress",
  outputDir: "dist-react",

  pdf: {
    filename: "paper.pdf",
  },

  deploy: {
    adapter: "cloudflare-pages",
    source: ".deploy/document",
    projectName: null,
    commitDirty: false,
    requiresConfirmation: true,
  },
};
