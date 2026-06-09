import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function writeSlidesPress(
  pressRoot: string,
  opts: { pressName: string; title: string },
): Promise<void> {
  const { pressName, title } = opts;
  const folder = folderName(pressName);
  const component = componentName(folder);
  const escapedTitle = escapeJsxAttr(title);

  await mkdir(path.join(pressRoot, "slides", "intro"), { recursive: true });
  await mkdir(path.join(pressRoot, "themes"), { recursive: true });

  await writeFile(
    path.join(pressRoot, "press.tsx"),
    `import { Press, Slide } from "@open-press/core";

export default function ${component}Press() {
  return (
    <Press
      slug="${folder}"
      title="${escapedTitle}"
      type="slides"
      page="slide-16-9"
    >
      <Slide id="intro" />
    </Press>
  );
}
`,
    "utf8",
  );

  await writeFile(
    path.join(pressRoot, "slides", "intro", "slide.tsx"),
    `import type { SlideMeta } from "@open-press/core";

export const meta = {
  layout: "default",
  description: "Intro slide",
} satisfies SlideMeta;

export default function Slide() {
  return <div>Start here.</div>;
}
`,
    "utf8",
  );

  await writeFile(path.join(pressRoot, "themes", "default.css"), `/* ${folder} theme */\n`, "utf8");
}

function folderName(name: string): string {
  const base = path.basename(name);
  return (
    base
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "press"
  );
}

function componentName(folder: string): string {
  return (
    folder
      .split(/[-_]+/)
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join("") || "OpenPress"
  );
}

function escapeJsxAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
