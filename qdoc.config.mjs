// Root pointer. The real workspace config lives at document/qdoc.config.mjs.
//
// document/ is git-ignored in this framework checkout. Populate it locally
// from a style pack's React/MDX document starter:
//   cp -R skills/editorial-monograph/starter/document/. document/
// Or create a separate workspace:
//   node engine/cli.mjs init ../my-qdoc-document

export default {
  documentDir: "document",
  config: "document/qdoc.config.mjs",
};
