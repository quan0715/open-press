import { Frame, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "statement",
  description: "Centered red serif statement.",
  keypoints: ["Replace the one-line statement"],
} satisfies SlideMeta;

export const notes = "Use this as a pause slide for one decisive statement.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide id="__SLIDE_ID__" className="op-slide-page op-source-deck-slide op-template-statement">
      <Frame
        frameKey="canvas"
        chrome={false}
        className="op-source-deck-canvas relative h-full w-full overflow-hidden"
      >
        <Text
          as="h1"
          label="statement"
          box={{ x: 0, y: 506, w: 1920 }}
          className="op-source-deck-statement"
        >
          The extremities of a surface are lines.
        </Text>
      </Frame>
    </Slide>
  );
}
