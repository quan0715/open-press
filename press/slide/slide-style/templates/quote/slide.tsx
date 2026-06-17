import { Frame, Line, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "quote",
  description: "Section slide with supporting quote.",
  keypoints: ["Replace the section copy", "Replace the quote", "Replace attribution"],
} satisfies SlideMeta;

export const notes = "Use this when the main section copy needs a supporting pull quote.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide id="__SLIDE_ID__" className="op-slide-page op-source-deck-slide op-template-quote">
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
          as="h1"
          label="title"
          box={{ x: 100, y: 315, w: 810 }}
          className="op-source-deck-title"
        >
          An obtuse angle is an angle greater than a right angle.
        </Text>
        <Text
          as="p"
          label="body"
          box={{ x: 100, y: 620, w: 840 }}
          className="op-source-deck-body"
        >
          Longer description of slide content. Typically used to provide extra context or nuance to slides. A good
          description ensures slides can be consumed async without a live presentation.
        </Text>
        <Line
          label="divider"
          box={{ x: 960, y: 0, w: 3, h: 1080 }}
          className="op-source-deck-divider"
        />
        <Text
          as="span"
          label="quote-mark"
          box={{ x: 1060, y: 345 }}
          className="op-source-deck-quote-mark"
        >
          &ldquo;
        </Text>
        <Text
          as="p"
          label="quote"
          box={{ x: 1060, y: 424, w: 820 }}
          className="op-source-deck-quote"
        >
          A quote from a customer, user, or other stakeholder that helps back up the point you're trying to make on this
          slide.
        </Text>
        <Text
          as="p"
          label="attribution"
          box={{ x: 1060, y: 730 }}
          className="op-source-deck-attribution"
        >
          &mdash; Jane Doe
        </Text>
      </Frame>
    </Slide>
  );
}
