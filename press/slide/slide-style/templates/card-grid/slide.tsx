import { Frame, Slide, Text, type SlideMeta } from "@open-press/core";

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
