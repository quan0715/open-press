import { Frame, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "quote-only",
  description: "Standalone centered quote with attribution.",
  keypoints: ["Replace the quote", "Replace the attribution"],
} satisfies SlideMeta;

export const notes = "Use this when the quote is the whole point of the slide.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide id="__SLIDE_ID__" className="op-slide-page op-source-deck-slide op-template-quote-only">
      <Frame
        frameKey="canvas"
        chrome={false}
        className="op-source-deck-canvas relative h-full w-full overflow-hidden"
      >
        <Text
          as="span"
          label="quote-mark"
          box={{ x: 600, y: 362 }}
          className="op-source-deck-quote-mark"
        >
          &ldquo;
        </Text>
        <Text
          as="p"
          label="quote"
          box={{ x: 600, y: 430, w: 760 }}
          className="op-source-deck-quote"
        >
          A quote from a customer, user, or other stakeholder that helps back up the points you are trying to make.
        </Text>
        <Text
          as="p"
          label="attribution"
          box={{ x: 600, y: 690 }}
          className="op-source-deck-attribution"
        >
          &mdash; Jane Doe
        </Text>
      </Frame>
    </Slide>
  );
}
