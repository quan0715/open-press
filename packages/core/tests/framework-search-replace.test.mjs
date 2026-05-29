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
      path.join(workspace, "package.json"),
      JSON.stringify({ name: "search-fixture", private: true, openpress: {} }, null, 2),
      "utf8",
    );
    for (const directory of ["press/media", "press/theme", "press/components"]) {
      await fs.mkdir(path.join(workspace, directory), { recursive: true });
    }
    await fs.writeFile(path.join(workspace, "press/design.md"), "# Design\n", "utf8");
    await fs.writeFile(
      path.join(workspace, "press/index.tsx"),
      `import { Workspace, Press, Frame } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";

export default function Doc() {
  return (
    <Workspace>
      <Press
        title="React Search Fixture"
        sources={[mdxSource({ id: "story", preset: "section-folders", root: "chapters" })]}
      >
        <Frame frameKey="cover" role="manuscript.cover">Cover</Frame>
      </Press>
    </Workspace>
  );
}
`,
      "utf8",
    );
    await fs.mkdir(path.join(workspace, "press/chapters/01-intro/content"), { recursive: true });
    await fn(workspace);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

test("search emits source match JSON with file, line, column and preview", async () => {
  await withReactSearchWorkspace(async (workspace) => {
    await fs.writeFile(
      path.join(workspace, "press/chapters/01-intro/content/01-note.mdx"),
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
      { path: "press/chapters/01-intro/content/01-note.mdx", line: 1, column: 4, text: "Linked List" },
      { path: "press/chapters/01-intro/content/01-note.mdx", line: 3, column: 3, text: "linked list" },
    ]);
    assert.match(report.matches[0].preview, /Linked List/);
  });
});

test("replace preview reports changes without writing files", async () => {
  await withReactSearchWorkspace(async (workspace) => {
    const filePath = path.join(workspace, "press/chapters/01-intro/content/01-note.mdx");
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
    const filePath = path.join(workspace, "press/chapters/01-intro/content/01-note.mdx");
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

test("search reads React MDX chapter content when press/index.tsx is present", async () => {
  await withReactSearchWorkspace(async (workspace) => {
    await fs.writeFile(
      path.join(workspace, "press/chapters/01-intro/content/01-start.mdx"),
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
        path: "press/chapters/01-intro/content/01-start.mdx",
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
      path.join(workspace, "press/index.tsx"),
      `import { Workspace, Press, Frame } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";

export default function Doc() {
  return (
    <Workspace>
      <Press
        title="Source Descriptor Fixture"
        sources={[mdxSource({ id: "story", preset: "file-list", files: ["notes/intro.mdx", "appendix/faq.mdx"] })]}
      >
        <Frame frameKey="cover" role="manuscript.cover">Cover</Frame>
      </Press>
    </Workspace>
  );
}
`,
      "utf8",
    );
    await fs.mkdir(path.join(workspace, "press/notes"), { recursive: true });
    await fs.mkdir(path.join(workspace, "press/appendix"), { recursive: true });
    await fs.writeFile(path.join(workspace, "press/notes/intro.mdx"), "Needle in explicit note.\n", "utf8");
    await fs.writeFile(path.join(workspace, "press/appendix/faq.mdx"), "Needle in explicit appendix.\n", "utf8");

    const result = spawnSync("node", [CLI, "search", workspace, "Needle", "--json"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);

    const report = JSON.parse(result.stdout);
    assert.deepEqual(report.matches.map((match) => match.path), [
      "press/appendix/faq.mdx",
      "press/notes/intro.mdx",
    ]);
  });
});

test("replace applies to React MDX chapter content when press/index.tsx is present", async () => {
  await withReactSearchWorkspace(async (workspace) => {
    const filePath = path.join(workspace, "press/chapters/01-intro/content/01-start.mdx");
    await fs.writeFile(filePath, "node in prose.\n", "utf8");

    const result = spawnSync("node", [CLI, "replace", workspace, "node", "節點", "--apply", "--json"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);

    const report = JSON.parse(result.stdout);
    assert.equal(report.applied, true);
    assert.equal(report.matchCount, 1);
    assert.equal(report.fileCount, 1);
    assert.equal(report.changes[0].path, "press/chapters/01-intro/content/01-start.mdx");
    assert.equal(await fs.readFile(filePath, "utf8"), "節點 in prose.\n");
  });
});

test("search all includes React document entry and chapter implementation sources", async () => {
  await withReactSearchWorkspace(async (workspace) => {
    await fs.writeFile(
      path.join(workspace, "press/index.tsx"),
      `import { Workspace, Press, Frame } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";

export default function Doc() {
  return (
    <Workspace>
      <Press title="EntryScopeMarker" sources={[mdxSource({ id: "story", preset: "section-folders", root: "chapters" })]}>
        <Frame frameKey="cover" role="manuscript.cover">Cover</Frame>
      </Press>
    </Workspace>
  );
}
`,
      "utf8",
    );
    await fs.writeFile(
      path.join(workspace, "press/components/Opener.tsx"),
      `export const meta = { title: "OpenerScopeMarker" };\n`,
      "utf8",
    );

    const result = spawnSync("node", [CLI, "search", workspace, "ScopeMarker", "--scope", "all", "--json"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);

    const report = JSON.parse(result.stdout);
    assert.deepEqual(report.matches.map((match) => match.path), [
      "press/components/Opener.tsx",
      "press/index.tsx",
    ]);
  });
});
