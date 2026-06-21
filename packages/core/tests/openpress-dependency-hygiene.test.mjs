import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CORE_ROOT = fileURLToPath(new URL("..", import.meta.url));

test("openpress ui does not keep a second class-name helper stack", async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(CORE_ROOT, "package.json"), "utf8"));
  assert.equal(pkg.dependencies?.clsx, undefined, "clsx should not be a direct core dependency");
  assert.equal(
    pkg.dependencies?.["tailwind-merge"],
    undefined,
    "tailwind-merge should not be a direct core dependency",
  );

  const sourceFiles = await collectSourceFiles(path.join(CORE_ROOT, "src", "openpress"));
  for (const filePath of sourceFiles) {
    const source = await fs.readFile(filePath, "utf8");
    assert.equal(
      source.includes("@/openpress/lib/utils"),
      false,
      `${path.relative(CORE_ROOT, filePath)} should import the shared core/cn helper instead`,
    );
  }
});

async function collectSourceFiles(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectSourceFiles(entryPath));
      continue;
    }
    if (/\.[cm]?[tj]sx?$/.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}
