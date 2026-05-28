// social-post starter — square social media post workspace.
export default {
  title: "Social Post",
  subtitle: "Square announcement card",
  organization: "OpenPress",

  page: "social-square",

  sourceDir: "chapters",
  mediaDir: "media",
  themeDir: "theme",
  designDoc: "design.md",
  componentsDir: "components",
  publicDir: "public/openpress",
  outputDir: "dist-react",

  pdf: {
    filename: "social-post.pdf",
  },

  deploy: {
    adapter: "cloudflare-pages",
    source: ".deploy/social-post",
    projectName: null,
    commitDirty: false,
    requiresConfirmation: true,
  },
};

