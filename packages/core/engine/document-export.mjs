import path from "node:path";
import { fileURLToPath } from "node:url";
import { exportReactDocument } from "./react/document-export.mjs";

const SELF_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SELF_DIR, "..");

export async function exportDocument(root = ROOT) {
  const reactResult = await exportReactDocument(root);
  if (reactResult) return reactResult;

  throw new Error(
    "React/MDX document entry not found. Expected press/index.tsx with a Press default export before exporting.",
  );
}
