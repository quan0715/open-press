// slide-deck starter — 16:9 presentation workspace.
export default {
  title: "Slide Deck",
  subtitle: "16:9 OpenPress slides",
  organization: "OpenPress",

  page: "slide-16-9",

  sourceDir: "chapters",
  mediaDir: "media",
  themeDir: "theme",
  designDoc: "design.md",
  componentsDir: "components",
  publicDir: "public/openpress",
  outputDir: "dist-react",

  pdf: {
    filename: "slide-deck.pdf",
  },

  deploy: {
    adapter: "cloudflare-pages",
    source: ".deploy/slide-deck",
    projectName: null,
    commitDirty: false,
    requiresConfirmation: true,
  },
};

