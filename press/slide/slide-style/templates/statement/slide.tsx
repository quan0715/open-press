import { Frame, Slide, Text, type SlideMeta } from "@open-press/core";

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
