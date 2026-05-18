// Root pointer. The real workspace config lives at document/qdoc.config.mjs.
//
// document/ is git-ignored — populate it locally from a style pack starter:
//   cp -r skills/editorial-monograph/starter/. document/
// Or any other pack:
//   cp -r skills/<pack>/starter/. document/

export default {
  documentDir: "document",
  config: "document/qdoc.config.mjs",
};
