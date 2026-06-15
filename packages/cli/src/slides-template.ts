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
  await mkdir(path.join(pressRoot, "slide-style", "templates", "blank"), { recursive: true });
  await mkdir(path.join(pressRoot, "slide-style", "templates", "title-image"), { recursive: true });
  await mkdir(path.join(pressRoot, "slide-style", "templates", "statement"), { recursive: true });
  await mkdir(path.join(pressRoot, "slide-style", "templates", "split-media"), { recursive: true });
  await mkdir(path.join(pressRoot, "slide-style", "templates", "card-grid"), { recursive: true });
  await mkdir(path.join(pressRoot, "slide-style", "theme"), { recursive: true });
  await mkdir(path.join(pressRoot, "theme"), { recursive: true });
  await mkdir(path.join(pressRoot, "media"), { recursive: true });

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
    path.join(pressRoot, "slide-style", "manifest.json"),
    `${JSON.stringify({
      id: "openpress-default-slide-style",
      version: "1.0.0",
      defaultTemplate: "blank",
      templates: {
        blank: { source: "templates/blank/slide.tsx", description: "Minimal starter slide" },
        "title-image": { source: "templates/title-image/slide.tsx", description: "Title slide with a media object" },
        statement: { source: "templates/statement/slide.tsx", description: "Large editorial statement slide" },
        "split-media": { source: "templates/split-media/slide.tsx", description: "Two-column text and media slide" },
        "card-grid": { source: "templates/card-grid/slide.tsx", description: "Three-card argument or feature grid" },
      },
      theme: { source: "theme/default.css", target: "theme/default.css" },
    }, null, 2)}\n`,
    "utf8",
  );

  await writeFile(path.join(pressRoot, "slide-style", "templates", "blank", "slide.tsx"), BLANK_TEMPLATE_SOURCE, "utf8");
  await writeFile(
    path.join(pressRoot, "slide-style", "templates", "title-image", "slide.tsx"),
    TITLE_IMAGE_TEMPLATE_SOURCE,
    "utf8",
  );
  await writeFile(
    path.join(pressRoot, "slide-style", "templates", "statement", "slide.tsx"),
    STATEMENT_TEMPLATE_SOURCE,
    "utf8",
  );
  await writeFile(
    path.join(pressRoot, "slide-style", "templates", "split-media", "slide.tsx"),
    SPLIT_MEDIA_TEMPLATE_SOURCE,
    "utf8",
  );
  await writeFile(
    path.join(pressRoot, "slide-style", "templates", "card-grid", "slide.tsx"),
    CARD_GRID_TEMPLATE_SOURCE,
    "utf8",
  );
  await writeFile(
    path.join(pressRoot, "slides", "intro", "slide.tsx"),
    renderSlideTemplate(BLANK_TEMPLATE_SOURCE, "intro"),
    "utf8",
  );

  const themeSource = `/* ${folder} slide style source */\n`;
  await writeFile(path.join(pressRoot, "slide-style", "theme", "default.css"), themeSource, "utf8");
  await writeFile(path.join(pressRoot, "theme", "default.css"), themeSource, "utf8");
}

function renderSlideTemplate(source: string, id: string): string {
  return source
    .replaceAll("__SLIDE_ID__", id)
    .replaceAll("__SLIDE_COMPONENT__", `${componentName(id)}Slide`);
}

const BLANK_TEMPLATE_SOURCE = `import { Frame, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "blank",
  description: "Minimal starter slide.",
  keypoints: ["Replace the title", "Replace the body"],
} satisfies SlideMeta;

export const notes = "Replace these notes before presenting.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide
      id="__SLIDE_ID__"
      className="op-slide-page bg-bg text-center text-text [font-family:var(--font-body)]"
      layout={{
        mode: "stack",
        direction: "vertical",
        gap: 24,
        padding: 96,
        width: "fill",
        height: "fill",
        clip: true,
      }}
    >
      <Frame frameKey="copy" role="slide.region.copy" className="m-auto max-w-[920px]">
        <Text as="p" className="op-kicker mb-op-sm">
          New slide
        </Text>
        <Text as="h1" className="op-display">
          __SLIDE_ID__
        </Text>
        <Text as="p" className="op-lead mt-op-sm">
          Replace this starter copy with the slide's message.
        </Text>
      </Frame>
    </Slide>
  );
}
`;

const TITLE_IMAGE_TEMPLATE_SOURCE = `import { Frame, Media, MediaCaption, MediaObject, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "title-image",
  description: "Title slide with a strong media object.",
  keypoints: ["Replace the headline", "Replace the image"],
  visuals: ["openpress-hero-art.png"],
} satisfies SlideMeta;

export const notes = "Open with the main argument, then use the image as visual context.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide
      id="__SLIDE_ID__"
      className="op-slide-page bg-bg text-text [font-family:var(--font-body)]"
      layout={{
        mode: "grid",
        columns: "minmax(0,1fr) 520px",
        gap: 64,
        padding: 96,
        width: "fill",
        height: "fill",
        clip: true,
      }}
    >
      <Frame
        frameKey="copy"
        role="slide.region.copy"
        className="self-center border-l-[6px] border-accent pl-op-md"
        layout={{ mode: "stack", gap: 24, width: "fill", height: "hug" }}
      >
        <Text as="p" className="op-kicker mb-op-sm">
          Template
        </Text>
        <Text as="h1" className="op-display max-w-[920px]">
          Replace this title.
        </Text>
        <Text as="p" className="op-lead mt-op-sm max-w-[820px] text-text-muted">
          Replace this supporting line with one clear promise.
        </Text>
      </Frame>
      <MediaObject className="relative min-h-[660px] overflow-hidden rounded-op-card border border-border bg-surface-muted shadow-op-card">
        <Media src="openpress-hero-art.png" alt="Template media" fit="cover" />
        <MediaCaption className="absolute bottom-op-sm left-op-sm rounded-op-pill bg-surface-inverse px-op-sm py-op-xs text-op-caption text-text-inverse">
          Replace caption
        </MediaCaption>
      </MediaObject>
    </Slide>
  );
}
`;

const STATEMENT_TEMPLATE_SOURCE = `import { Frame, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "statement",
  description: "Large editorial statement slide.",
  keypoints: ["Make one claim", "Support it with two short lines"],
} satisfies SlideMeta;

export const notes = "Use this slide when the deck needs one clear claim.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide
      id="__SLIDE_ID__"
      className="op-slide-page bg-bg text-text [font-family:var(--font-body)]"
      layout={{
        mode: "grid",
        columns: "minmax(0,1fr) 520px",
        gap: 96,
        padding: 96,
        width: "fill",
        height: "fill",
        clip: true,
      }}
    >
      <Frame frameKey="claim" role="slide.region.claim" className="self-center">
        <Text as="p" className="op-kicker mb-op-sm">
          Statement
        </Text>
        <Text as="h2" className="op-section max-w-[880px]">
          Replace this with the one sentence the audience should remember.
        </Text>
      </Frame>
      <Frame
        frameKey="support"
        role="slide.region.support"
        className="op-card-muted self-center"
        layout={{ mode: "stack", gap: 24, width: "fill", height: "hug" }}
      >
        <Text as="p" className="op-body font-bold">
          First supporting point.
        </Text>
        <Text as="p" className="op-body font-bold">
          Second supporting point.
        </Text>
      </Frame>
    </Slide>
  );
}
`;

const SPLIT_MEDIA_TEMPLATE_SOURCE = `import { Frame, Media, MediaCaption, MediaObject, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "split-media",
  description: "Two-column text and media slide.",
  keypoints: ["Explain the point on the left", "Show visual evidence on the right"],
  visuals: ["openpress-hero-art.png"],
} satisfies SlideMeta;

export const notes = "Use the visual as evidence, not decoration.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide
      id="__SLIDE_ID__"
      className="op-slide-page bg-bg text-text [font-family:var(--font-body)]"
      layout={{
        mode: "grid",
        columns: "500px minmax(0,1fr)",
        gap: 96,
        padding: 96,
        width: "fill",
        height: "fill",
        clip: true,
      }}
    >
      <Frame
        frameKey="copy"
        role="slide.region.copy"
        className="min-w-0 self-center"
        layout={{ mode: "stack", gap: 24, width: "fill", height: "hug" }}
      >
        <Text as="p" className="op-kicker mb-op-sm">
          Split media
        </Text>
        <Text as="h2" className="op-section">
          Replace this section title.
        </Text>
        <Text as="p" className="op-body mt-op-sm text-text-muted">
          Replace this paragraph with a concise explanation of what the visual proves.
        </Text>
      </Frame>
      <MediaObject className="relative h-[680px] overflow-hidden rounded-op-panel border border-border bg-surface-muted shadow-op-card">
        <Media src="openpress-hero-art.png" alt="Template media" fit="cover" />
        <MediaCaption className="absolute bottom-op-sm left-op-sm rounded-op-pill bg-surface-inverse px-op-sm py-op-xs text-op-caption text-text-inverse">
          Replace caption
        </MediaCaption>
      </MediaObject>
    </Slide>
  );
}
`;

const CARD_GRID_TEMPLATE_SOURCE = `import { Frame, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "card-grid",
  description: "Three-card argument or feature grid.",
  keypoints: ["Replace the heading", "Replace all three cards"],
} satisfies SlideMeta;

export const notes = "Use this slide for three parallel points with comparable weight.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide
      id="__SLIDE_ID__"
      className="op-slide-page bg-bg text-text [font-family:var(--font-body)]"
      layout={{
        mode: "stack",
        direction: "vertical",
        gap: 64,
        padding: 96,
        width: "fill",
        height: "fill",
        clip: true,
      }}
    >
      <Frame frameKey="heading" role="slide.region.heading" className="max-w-[1120px]">
        <Text as="p" className="op-kicker mb-op-sm">
          Card grid
        </Text>
        <Text as="h2" className="op-section">
          Replace this heading with the grouping idea.
        </Text>
      </Frame>
      <Frame
        frameKey="cards"
        role="slide.region.cards"
        className="mt-op-lg"
        layout={{ mode: "grid", columns: 3, gap: 24, width: "fill", height: "hug" }}
      >
        <Frame frameKey="card-1" role="slide.card" className="op-card-muted min-h-[230px] border-t-4 border-t-text">
          <Text as="span" className="op-kicker mb-op-sm block">
            01
          </Text>
          <Text as="h3" className="op-lead font-bold text-text">
            First card
          </Text>
          <Text as="p" className="op-body mt-op-xs">
            Replace this card body.
          </Text>
        </Frame>
        <Frame frameKey="card-2" role="slide.card" className="op-card-muted min-h-[230px] border-t-4 border-t-text">
          <Text as="span" className="op-kicker mb-op-sm block">
            02
          </Text>
          <Text as="h3" className="op-lead font-bold text-text">
            Second card
          </Text>
          <Text as="p" className="op-body mt-op-xs">
            Replace this card body.
          </Text>
        </Frame>
        <Frame frameKey="card-3" role="slide.card" className="op-card-muted min-h-[230px] border-t-4 border-t-text">
          <Text as="span" className="op-kicker mb-op-sm block">
            03
          </Text>
          <Text as="h3" className="op-lead font-bold text-text">
            Third card
          </Text>
          <Text as="p" className="op-body mt-op-xs">
            Replace this card body.
          </Text>
        </Frame>
      </Frame>
    </Slide>
  );
}
`;

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
