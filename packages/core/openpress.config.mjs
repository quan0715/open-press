// Legacy root pointer kept for older local workspaces. Current OpenPress
// workspaces use package.json "openpress" config plus a press/ source tree.
// Starter files are supplied by skills, not fetched by the core engine.

export default {
  documentDir: "document",
  config: "document/openpress.config.mjs",
};
