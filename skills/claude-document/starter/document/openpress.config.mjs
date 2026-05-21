// claude-document starter — apply, then fill in project metadata.
export default {
  title: "Claude Document",
  subtitle: "Warm Editorial Working Notes",
  organization: "OpenPress",

  sourceDir: "chapters",
  mediaDir: "media",
  themeDir: "theme",
  designDoc: "design.md",
  componentsDir: "components",
  publicDir: "public/openpress",
  outputDir: "dist-react",

  pdf: {
    filename: "claude-document.pdf",
  },

  deploy: {
    adapter: "cloudflare-pages",
    source: ".deploy/claude-document",
    projectName: null,
    commitDirty: false,
    requiresConfirmation: true,
  },
};
