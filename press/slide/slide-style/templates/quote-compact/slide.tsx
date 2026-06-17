import { Frame, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "quote-compact",
  description: "Small compact quote block.",
  keypoints: ["Replace the quote", "Replace the attribution"],
} satisfies SlideMeta;

export const notes = "Use this as a quieter quote slide or as a transitional proof point.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide id="__SLIDE_ID__" className="op-slide-page op-source-deck-slide op-template-quote-compact">
      <Frame
        frameKey="canvas"
        chrome={false}
        className="op-source-deck-canvas relative h-full w-full overflow-hidden"
      >
        <Text
          as="p"
          label="label"
          box={{ x: 100, y: 80 }}
          className="op-source-deck-label"
        >
          Section name
        </Text>
        <Text
          as="span"
          label="quote-mark"
          box={{ x: 100, y: 360 }}
          className="op-source-deck-quote-mark"
        >
          &ldquo;
        </Text>
        <Text
          as="p"
          label="quote"
          box={{ x: 100, y: 428, w: 640 }}
          className="op-source-deck-quote"
        >
          A quote from a customer, user, or stakeholder that helps back up the point you are trying to make on this slide.
        </Text>
        <Text
          as="p"
          label="attribution"
          box={{ x: 100, y: 650 }}
          className="op-source-deck-attribution"
        >
          &mdash; Jane Doe
        </Text>
      </Frame>
    </Slide>
  );
}
