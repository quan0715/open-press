import fs from "node:fs/promises";
import path from "node:path";

export async function walkFiles(directory, visit) {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(absolutePath, visit);
    } else if (entry.isFile()) {
      await visit(absolutePath);
    }
  }
}
