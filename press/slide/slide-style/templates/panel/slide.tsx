import { Frame, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "panel",
  description: "Before/after comparison slide with two large visual placeholders.",
  keypoints: ["Replace both status labels", "Drop before and after media or content into each panel"],
} satisfies SlideMeta;

export const notes = "Use this for before/after states, screenshots, or paired visual evidence.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide id="__SLIDE_ID__" className="op-slide-page op-source-deck-slide op-template-panel">
      <Frame
        frameKey="canvas"
        chrome={false}
        className="op-source-deck-canvas relative h-full w-full overflow-hidden"
      >
        <Text
          as="p"
          label="Before status label"
          box={{ x: 100, y: 80 }}
          className="op-source-deck-status-label op-source-deck-status-before"
        >
          Before
        </Text>
        <Frame
          frameKey="before-panel"
          box={{ x: 100, y: 170, w: 780, h: 620 }}
          className="op-source-deck-panel-fill"
        />
        <Text
          as="p"
          label="After status label"
          box={{ x: 1060, y: 80 }}
          className="op-source-deck-status-label op-source-deck-status-after"
        >
          After
        </Text>
        <Frame
          frameKey="after-panel"
          box={{ x: 1060, y: 170, w: 780, h: 620 }}
          className="op-source-deck-panel-fill"
        />
      </Frame>
    </Slide>
  );
}
