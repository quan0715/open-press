import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("public identity subtitle stays compact in the side panel", async () => {
  const css = await fs.readFile(new URL("../src/styles/openpress/public-viewer.css", import.meta.url), "utf8");

  assert.match(css, /\.openpress-public-title-sub\s*{[^}]*white-space:\s*nowrap/s);
  assert.match(css, /\.openpress-public-title-sub\s*{[^}]*text-overflow:\s*ellipsis/s);
});
