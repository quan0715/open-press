import { Frame, Media, MediaCaption, MediaObject, Slide, Text, type SlideMeta } from "@open-press/core";

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
