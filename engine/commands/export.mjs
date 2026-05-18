import path from "node:path";
import { exportQDocDocument } from "../document-export.mjs";

export async function run({ root }) {
  const result = await exportQDocDocument(root);
  console.log(`QDoc export: ${path.relative(root, result.documentPath)} (${result.pageCount} pages)`);
  return 0;
}
