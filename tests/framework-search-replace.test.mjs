import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "engine", "cli.mjs");

async function withSearchWorkspace(fn) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "qdoc-search-test-"));
  try {
    await fs.writeFile(
      path.join(workspace, "qdoc.config.mjs"),
      `export default {
  title: "Search Fixture",
  sourceDir: "content",
  mediaDir: "media",
  themeDir: "theme",
  designSystemDir: "design-system",
  componentsDir: "components",
  publicDir: "public/qdoc",
  outputDir: "dist"
};
`,
      "utf8",
    );
    for (const directory of ["content", "media", "theme", "design-system", "components"]) {
      await fs.mkdir(path.join(workspace, directory), { recursive: true });
    }
    await fn(workspace);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

test("search emits source match JSON with file, line, column and preview", async () => {
  await withSearchWorkspace(async (workspace) => {
    await fs.writeFile(
      path.join(workspace, "content", "01-note.md"),
      "## Linked List\n\nA linked list stores nodes with pointers.\n",
      "utf8",
    );

    const result = spawnSync("node", [CLI, "search", workspace, "linked list", "--json"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);

    const report = JSON.parse(result.stdout);
    assert.equal(report.kind, "search");
    assert.equal(report.query, "linked list");
    assert.equal(report.matchCount, 2);
    assert.deepEqual(report.matches.map((match) => match.id), ["match-0001", "match-0002"]);
    assert.deepEqual(report.matches.map((match) => ({
      path: match.path,
      line: match.line,
      column: match.column,
      text: match.text,
    })), [
      { path: "content/01-note.md", line: 1, column: 4, text: "Linked List" },
      { path: "content/01-note.md", line: 3, column: 3, text: "linked list" },
    ]);
    assert.match(report.matches[0].preview, /Linked List/);
  });
});

test("replace preview reports changes without writing files", async () => {
  await withSearchWorkspace(async (workspace) => {
    const filePath = path.join(workspace, "content", "01-note.md");
    await fs.writeFile(filePath, "node points to another node.\n", "utf8");

    const result = spawnSync("node", [CLI, "replace", workspace, "node", "節點", "--json"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);

    const report = JSON.parse(result.stdout);
    assert.equal(report.kind, "replace");
    assert.equal(report.applied, false);
    assert.equal(report.matchCount, 2);
    assert.equal(report.fileCount, 1);
    assert.equal(await fs.readFile(filePath, "utf8"), "node points to another node.\n");
  });
});

test("replace apply writes prose matches and skips fenced code by default", async () => {
  await withSearchWorkspace(async (workspace) => {
    const filePath = path.join(workspace, "content", "01-note.md");
    await fs.writeFile(
      filePath,
      [
        "node before code.",
        "",
        "```c",
        "node stays code.",
        "```",
        "",
        "node after code.",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = spawnSync("node", [CLI, "replace", workspace, "node", "節點", "--apply", "--json"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);

    const report = JSON.parse(result.stdout);
    assert.equal(report.applied, true);
    assert.equal(report.matchCount, 2);
    assert.equal(await fs.readFile(filePath, "utf8"), [
      "節點 before code.",
      "",
      "```c",
      "node stays code.",
      "```",
      "",
      "節點 after code.",
      "",
    ].join("\n"));
  });
});
