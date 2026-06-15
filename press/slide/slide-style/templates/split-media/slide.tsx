import { Frame, Media, MediaCaption, MediaObject, Slide, Text, type SlideMeta } from "@open-press/core";

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
