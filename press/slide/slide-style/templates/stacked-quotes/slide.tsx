import { Frame, Line, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "stacked-quotes",
  description: "Section copy with two stacked supporting quotes.",
  keypoints: ["Replace the section copy", "Replace both quotes"],
} satisfies SlideMeta;

export const notes = "Use this when one slide needs two short pieces of supporting evidence.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide id="__SLIDE_ID__" className="op-slide-page op-source-deck-slide op-template-stacked-quotes op-template-section">
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
          box={{ x: 100, y: 368, w: 760 }}
          className="op-source-deck-title"
        >
          An acute angle is less than a right angle.
        </Text>
        <Text
          as="p"
          label="body"
          box={{ x: 100, y: 642, w: 760 }}
          className="op-source-deck-body"
        >
          Longer description of slide content. Typically used to provide extra context or nuance to slides.
        </Text>
        <Line
          label="divider"
          box={{ x: 960, y: 0, w: 3, h: 1080 }}
          className="op-source-deck-divider"
        />
        <Frame
          frameKey="quote-stack"
          box={{ x: 1060, y: 238, w: 700 }}
          className="op-source-deck-quote-stack"
          layout={{ mode: "stack", direction: "vertical", gap: 68, width: "fill", height: "hug" }}
        >
          <Frame frameKey="quote-a" className="op-source-deck-stacked-quote op-source-deck-quote-blue">
            <Text as="span" label="quote-mark-a" className="op-source-deck-quote-mark">
              &ldquo;
            </Text>
            <Text as="p" label="quote-a" className="op-source-deck-quote">
              A quote from a customer, user, or stakeholder that helps back up the point you are trying to make.
            </Text>
            <Text as="p" label="attribution-a" className="op-source-deck-attribution">
              &mdash; Jane Doe
            </Text>
          </Frame>
          <Frame frameKey="quote-b" className="op-source-deck-stacked-quote op-source-deck-quote-red">
            <Text as="span" label="quote-mark-b" className="op-source-deck-quote-mark">
              &ldquo;
            </Text>
            <Text as="p" label="quote-b" className="op-source-deck-quote">
              A quote from a customer, user, or stakeholder that helps back up the point you are trying to make.
            </Text>
            <Text as="p" label="attribution-b" className="op-source-deck-attribution">
              &mdash; Jane Doe
            </Text>
          </Frame>
        </Frame>
      </Frame>
    </Slide>
  );
}
