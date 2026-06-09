import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { rmWithRetry } from "./_temp.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "engine", "cli.mjs");

test("migrate reports legacy objectId props and deck.yml", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-slides-migration-"));
  try {
    await fs.writeFile(path.join(workspace, "package.json"), JSON.stringify({ openpress: {} }), "utf8");
    await fs.mkdir(path.join(workspace, "press", "deck"), { recursive: true });
    await fs.writeFile(path.join(workspace, "press", "deck", "deck.yml"), "slides: []\n", "utf8");
    await fs.writeFile(
      path.join(workspace, "press", "deck", "press.tsx"),
      `import { Press, Slide } from "@open-press/core";
export default function Deck() { return <Press slug="deck" type="slides"><Slide id="cover"><h1 objectId="cover::title">Hi</h1></Slide></Press> }
`,
      "utf8",
    );

    const result = spawnSync("node", [CLI, "migrate", workspace, "--dry-run"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.match(result.stdout, /deck\.yml/);
    assert.match(result.stdout, /objectId|object identity/);
  } finally {
    await rmWithRetry(workspace);
  }
});
