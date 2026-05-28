import { test } from "node:test";
import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { discoverSectionStyles } from "../engine/react/style-discovery.mjs";

async function createDiscoveryFixture() {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "openpress-react-discovery-"));
  const writeFile = async (relativePath, contents = "") => {
    const filePath = path.join(root, relativePath);
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.writeFile(filePath, contents, "utf8");
  };

  await writeFile("press/components/Cover.tsx", "export default function Cover() { return null; }\n");
  await writeFile("press/components/NodeDiagram/index.tsx", "export default function NodeDiagram() { return null; }\n");
  await writeFile("press/components/NodeDiagram/NodeShape.tsx", "export function NodeShape() { return null; }\n");
  await writeFile("press/components/LinkedListVisual.tsx", "export default function GlobalLinkedListVisual() { return null; }\n");

  await writeFile("press/chapters/04-linked-list/content/01-list-and-node.mdx", "# List and node\n");
  await writeFile("press/chapters/04-linked-list/styles/chapter.css", "h2 { color: red; }\n");
  await writeFile("press/chapters/04-linked-list/styles/print.css", ".print-note { display: none; }\n");

  await writeFile("press/chapters/05-tree/content/01-tree.mdx", "# Tree\n");

  return root;
}

test("discovers React document sections, global components, and scoped CSS from filesystem structure", async () => {
  const root = await createDiscoveryFixture();

  const workspace = await discoverSectionStyles(root);

  assert.equal(workspace.root, root);
  assert.equal(workspace.documentRoot, path.join(root, "document"));

  assert.deepEqual(
    workspace.globalComponents.map((component) => component.name),
    ["Cover", "LinkedListVisual", "NodeDiagram"],
  );
  assert.equal(
    workspace.globalComponents.find((component) => component.name === "Cover")?.absolutePath,
    path.join(root, "press/components/Cover.tsx"),
  );
  assert.equal(
    workspace.globalComponents.find((component) => component.name === "Cover")?.documentPath,
    "components/Cover.tsx",
  );
  assert.equal(
    workspace.globalComponents.find((component) => component.name === "NodeDiagram")?.absolutePath,
    path.join(root, "press/components/NodeDiagram/index.tsx"),
  );
  assert.equal(
    workspace.globalComponents.some((component) => component.name === "NodeShape"),
    false,
    "subcomponents under a component folder must not be auto-imported",
  );

  assert.deepEqual(
    workspace.chapters.map((chapter) => chapter.directoryName),
    ["04-linked-list", "05-tree"],
  );
  assert.deepEqual(
    workspace.chapters.map((chapter) => chapter.slug),
    ["linked-list", "tree"],
  );

  const linkedList = workspace.chapters[0];
  assert.equal(linkedList.absolutePath, path.join(root, "press/chapters/04-linked-list"));
  assert.equal(linkedList.documentPath, "chapters/04-linked-list");
  assert.deepEqual(linkedList.contentFiles, [
    {
      absolutePath: path.join(root, "press/chapters/04-linked-list/content/01-list-and-node.mdx"),
      documentPath: "chapters/04-linked-list/content/01-list-and-node.mdx",
    },
  ]);
  assert.deepEqual(linkedList.styleFiles, [
    {
      absolutePath: path.join(root, "press/chapters/04-linked-list/styles/chapter.css"),
      documentPath: "chapters/04-linked-list/styles/chapter.css",
    },
    {
      absolutePath: path.join(root, "press/chapters/04-linked-list/styles/print.css"),
      documentPath: "chapters/04-linked-list/styles/print.css",
    },
  ]);
  const tree = workspace.chapters[1];
  assert.deepEqual(tree.contentFiles, [
    {
      absolutePath: path.join(root, "press/chapters/05-tree/content/01-tree.mdx"),
      documentPath: "chapters/05-tree/content/01-tree.mdx",
    },
  ]);
  assert.deepEqual(tree.styleFiles, []);
});

test("discovers React workspace using normalized config path overrides", async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "openpress-react-discovery-paths-"));
  const writeFile = async (relativePath, contents = "") => {
    const filePath = path.join(root, relativePath);
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.writeFile(filePath, contents, "utf8");
  };

  await writeFile("press/ui/Card/index.tsx", "export default function Card() { return null; }\n");
  await writeFile("press/book/01-intro/content/01-start.mdx", "# Start\n");

  const workspace = await discoverSectionStyles(root, {
    paths: {
      documentRoot: path.join(root, "document"),
      componentsDir: path.join(root, "press/ui"),
      sourceDir: path.join(root, "press/book"),
    },
  });

  assert.deepEqual(
    workspace.globalComponents.map((component) => component.name),
    ["Card"],
  );
  assert.deepEqual(
    workspace.chapters.map((chapter) => chapter.slug),
    ["intro"],
  );
  assert.equal(workspace.chapters[0].documentPath, "book/01-intro");
  assert.equal(workspace.chapters[0].contentFiles[0].documentPath, "book/01-intro/content/01-start.mdx");
});
