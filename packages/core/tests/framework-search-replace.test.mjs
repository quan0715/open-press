import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "engine", "cli.mjs");

async function withReactSearchWorkspace(fn) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "openpress-react-search-test-"));
  try {
    await fs.writeFile(
      path.join(workspace, "openpress.config.mjs"),
      `export default {
  title: "React Search Fixture",
  documentDir: "document",
  sourceDir: "content",
  mediaDir: "media",
  themeDir: "theme",
  designDoc: "design.md",
  componentsDir: "components",
  publicDir: "public/openpress",
  outputDir: "dist"
};
`,
      "utf8",
    );
    for (const directory of ["document/media", "document/theme", "document/components"]) {
      await fs.mkdir(path.join(workspace, directory), { recursive: true });
    }
    await fs.writeFile(path.join(workspace, "document/design.md"), "# Design\n", "utf8");
    await fs.writeFile(
      path.join(workspace, "document/index.tsx"),
      `export const config = {
  title: "React Search Fixture",
  sourceDir: "chapters",
};
`,
      "utf8",
    );
    await fs.mkdir(path.join(workspace, "document/chapters/01-intro/content"), { recursive: true });
    await fn(workspace);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

test("search emits source match JSON with file, line, column and preview", async () => {
  await withReactSearchWorkspace(async (workspace) => {
    await fs.writeFile(
      path.join(workspace, "document/chapters/01-intro/content/01-note.mdx"),
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
      { path: "document/chapters/01-intro/content/01-note.mdx", line: 1, column: 4, text: "Linked List" },
      { path: "document/chapters/01-intro/content/01-note.mdx", line: 3, column: 3, text: "linked list" },
    ]);
    assert.match(report.matches[0].preview, /Linked List/);
  });
});

test("replace preview reports changes without writing files", async () => {
  await withReactSearchWorkspace(async (workspace) => {
    const filePath = path.join(workspace, "document/chapters/01-intro/content/01-note.mdx");
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
  await withReactSearchWorkspace(async (workspace) => {
    const filePath = path.join(workspace, "document/chapters/01-intro/content/01-note.mdx");
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

test("search reads React MDX chapter content when document/index.tsx is present", async () => {
  await withReactSearchWorkspace(async (workspace) => {
    await fs.writeFile(
      path.join(workspace, "document/chapters/01-intro/content/01-start.mdx"),
      "## React Search\n\nNeedle appears in MDX content.\n",
      "utf8",
    );

    const result = spawnSync("node", [CLI, "search", workspace, "Needle", "--json"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);

    const report = JSON.parse(result.stdout);
    assert.equal(report.kind, "search");
    assert.equal(report.matchCount, 1);
    assert.deepEqual(report.matches.map((match) => ({
      scope: match.scope,
      path: match.path,
      line: match.line,
      column: match.column,
      text: match.text,
    })), [
      {
        scope: "content",
        path: "document/chapters/01-intro/content/01-start.mdx",
        line: 3,
        column: 1,
        text: "Needle",
      },
    ]);
  });
});

test("search reads MDX files from registered file-list sources", async () => {
  await withReactSearchWorkspace(async (workspace) => {
    await fs.writeFile(
      path.join(workspace, "document/index.tsx"),
      `import { mdxSource } from "@open-press/core/mdx";

export const config = {
  title: "Source Descriptor Fixture",
  sourceDir: "unused-legacy-source-dir",
};

export const sources = {
  story: mdxSource({
    preset: "file-list",
    files: ["notes/intro.mdx", "appendix/faq.mdx"],
  }),
};
`,
      "utf8",
    );
    await fs.mkdir(path.join(workspace, "document/notes"), { recursive: true });
    await fs.mkdir(path.join(workspace, "document/appendix"), { recursive: true });
    await fs.writeFile(path.join(workspace, "document/notes/intro.mdx"), "Needle in explicit note.\n", "utf8");
    await fs.writeFile(path.join(workspace, "document/appendix/faq.mdx"), "Needle in explicit appendix.\n", "utf8");

    const result = spawnSync("node", [CLI, "search", workspace, "Needle", "--json"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);

    const report = JSON.parse(result.stdout);
    assert.deepEqual(report.matches.map((match) => match.path), [
      "document/appendix/faq.mdx",
      "document/notes/intro.mdx",
    ]);
  });
});

test("replace applies to React MDX chapter content when document/index.tsx is present", async () => {
  await withReactSearchWorkspace(async (workspace) => {
    const filePath = path.join(workspace, "document/chapters/01-intro/content/01-start.mdx");
    await fs.writeFile(filePath, "node in prose.\n", "utf8");

    const result = spawnSync("node", [CLI, "replace", workspace, "node", "節點", "--apply", "--json"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);

    const report = JSON.parse(result.stdout);
    assert.equal(report.applied, true);
    assert.equal(report.matchCount, 1);
    assert.equal(report.fileCount, 1);
    assert.equal(report.changes[0].path, "document/chapters/01-intro/content/01-start.mdx");
    assert.equal(await fs.readFile(filePath, "utf8"), "節點 in prose.\n");
  });
});

test("search all includes React document entry and chapter implementation sources", async () => {
  await withReactSearchWorkspace(async (workspace) => {
    await fs.writeFile(
      path.join(workspace, "document/index.tsx"),
      `export const config = {
  title: "EntryScopeMarker",
  sourceDir: "chapters",
};
`,
      "utf8",
    );
    await fs.writeFile(
      path.join(workspace, "document/components/Opener.tsx"),
      `export const meta = { title: "OpenerScopeMarker" };\n`,
      "utf8",
    );

    const result = spawnSync("node", [CLI, "search", workspace, "ScopeMarker", "--scope", "all", "--json"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);

    const report = JSON.parse(result.stdout);
    assert.deepEqual(report.matches.map((match) => match.path), [
      "document/components/Opener.tsx",
      "document/index.tsx",
    ]);
  });
});
