import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function writePagesPress(
  pressRoot: string,
  opts: { pressName: string; title: string },
): Promise<void> {
  const folder = folderName(opts.pressName);
  const component = componentName(folder);
  const escapedTitle = escapeJsxAttr(opts.title);

  await mkdir(path.join(pressRoot, "chapters"), { recursive: true });
  await mkdir(path.join(pressRoot, "theme"), { recursive: true });
  await mkdir(path.join(pressRoot, "media"), { recursive: true });

  await writeFile(
    path.join(pressRoot, "press.tsx"),
    documentSource(folder, component, escapedTitle),
    "utf8",
  );
  await writeFile(
    path.join(pressRoot, "chapters", "01-introduction.mdx"),
    "# Introduction\n\nStart writing your document here.\n",
    "utf8",
  );
  await writeFile(path.join(pressRoot, "theme", "default.css"), `/* ${folder} document theme */\n`, "utf8");
}

function documentSource(folder: string, component: string, title: string): string {
  return [
    'import { Frame, MdxArea, Press } from "@open-press/core";',
    'import { mdxSource } from "@open-press/core/mdx";',
    'import { Sections, type SectionsPageProps } from "@open-press/core/manuscript";',
    "",
    "function DocumentPage({ frameKey, chainId }: SectionsPageProps) {",
    "  return (",
    '    <Frame frameKey={frameKey} role="manuscript.content">',
    '      <MdxArea chainId={chainId} className="openpress-prose h-full min-h-0 px-[18mm] py-[16mm]" />',
    "    </Frame>",
    "  );",
    "}",
    "",
    `export default function ${component}Press() {`,
    "  return (",
    "    <Press",
    `      slug="${folder}"`,
    `      title="${title}"`,
    '      type="pages"',
    '      page="a4"',
    `      sources={[mdxSource({ id: "document", preset: "section-files", root: "${folder}/chapters" })]}`,
    "    >",
    '      <Sections source="document" page={DocumentPage} />',
    "    </Press>",
    "  );",
    "}",
    "",
  ].join("\n");
}

function folderName(name: string): string {
  const base = path.basename(name);
  return base.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "press";
}

function componentName(folder: string): string {
  return folder.split(/[-_]+/).filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join("") || "OpenPress";
}

function escapeJsxAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
