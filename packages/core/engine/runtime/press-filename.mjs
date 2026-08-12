// Per-Press output filename derivation.
//
// Deliberately a leaf module (node:path only) so the CLI command layer and
// both local HTTP hosts — vite.config.ts and output/static-server.mjs — can
// derive the same names without pulling in the export pipeline.

import path from "node:path";

export function pressSuffixedFilename(baseFilename, slug) {
  const normalized = (slug ?? "").replace(/^\/+|\/+$/g, "");
  if (!normalized) return baseFilename;
  const ext = path.extname(baseFilename);
  const stem = ext ? baseFilename.slice(0, -ext.length) : baseFilename;
  return `${stem}-${normalized}${ext}`;
}
