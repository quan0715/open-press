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
  await mkdir(path.join(pressRoot, "theme"), { recursive: true });
  await mkdir(path.join(pressRoot, "media"), { recursive: true });

  await writeFile(
    path.join(pressRoot, "press.tsx"),
    [
      'import { Press, Slide } from "@open-press/core";',
      "",
      "export default function " + component + "Press() {",
      "  return (",
      "    <Press",
      '      slug="' + folder + '"',
      '      title="' + escapedTitle + '"',
      '      type="slides"',
      '      page="slide-16-9"',
      "    >",
      '      <Slide id="intro" />',
      "    </Press>",
      "  );",
      "}",
      "",
    ].join("\n"),
    "utf8",
  );
  await writeFile(path.join(pressRoot, "slides", "intro", "slide.tsx"), INTRO_SLIDE_SOURCE, "utf8");
  await writeFile(path.join(pressRoot, "theme", "default.css"), "/* " + folder + " slide theme */\n", "utf8");
}

const SLIDE_STARTER_CLASS = [
  "op-slide-page bg-bg text-text [font-family:var(--font-body)]",
  "[--font-heading:var(--openpress-font-serif)] [--font-body:var(--openpress-font-body)]",
  "[--color-bg:var(--openpress-color-document)] [--color-surface:var(--openpress-color-document)]",
  "[--color-surface-muted:var(--openpress-color-soft-line)] [--color-surface-inverse:var(--openpress-color-ink)]",
  "[--color-text:var(--openpress-color-ink)] [--color-text-muted:var(--openpress-color-muted)]",
  "[--color-text-subtle:var(--openpress-color-muted)] [--color-text-inverse:var(--openpress-color-document)]",
  "[--color-accent:var(--openpress-chart-coral-deep)] [--color-accent-muted:var(--openpress-chart-gold-bg)]",
  "[--color-border:var(--openpress-color-line)] [--color-border-strong:var(--openpress-color-ink)]",
].join(" ");

const INTRO_SLIDE_SOURCE = [
  'import { Frame, Slide, Text, type SlideMeta } from "@open-press/core";',
  "",
  "export const meta = {",
  '  layout: "blank",',
  '  description: "Minimal starter slide.",',
  '  keypoints: ["Replace the title", "Replace the body"],',
  "} satisfies SlideMeta;",
  "",
  'export const notes = "Replace these notes before presenting.";',
  "",
  "export default function IntroSlide() {",
  "  return (",
  "    <Slide",
  '      id="intro"',
  '      className="' + SLIDE_STARTER_CLASS + ' text-center"',
  "    >",
  "      <Frame",
  '        frameKey="canvas"',
  '        className="flex h-full w-full flex-col overflow-hidden p-[96px]"',
  "        layout={{",
  '          mode: "stack",',
  '          direction: "vertical",',
  "          gap: 24,",
  "          padding: 96,",
  '          width: "fill",',
  '          height: "fill",',
  "          clip: true,",
  "        }}",
  "      >",
  '        <Frame frameKey="copy" className="m-auto max-w-[920px]">',
  '          <Text as="p" className="op-kicker mb-op-sm">',
  "            New slide",
  "          </Text>",
  '          <Text as="h1" className="op-display">',
  "            intro",
  "          </Text>",
  '          <Text as="p" className="op-lead mt-op-sm">',
  "            Replace this starter copy with the slide's message.",
  "          </Text>",
  "        </Frame>",
  "      </Frame>",
  "    </Slide>",
  "  );",
  "}",
  "",
].join("\n");

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
      .map((word) => word[0].toUpperCase() + word.slice(1))
      .join("") || "OpenPress"
  );
}

function escapeJsxAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
