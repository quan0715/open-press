import { Frame, Slide, Text, type SlideMeta } from "@open-press/core";

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
