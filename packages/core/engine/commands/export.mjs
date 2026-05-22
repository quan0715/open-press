import path from "node:path";
import { exportDocument } from "../document-export.mjs";

export async function run({ root }) {
  const result = await exportDocument(root);
  console.log(`OpenPress export: ${path.relative(root, result.documentPath)} (${result.pageCount} pages)`);
  return 0;
}
