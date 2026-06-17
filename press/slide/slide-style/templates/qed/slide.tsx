import { Frame, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "qed",
  description: "Sparse closing slide with date and centered Q.E.D.",
  keypoints: ["Replace the date", "Replace the closing mark"],
} satisfies SlideMeta;

export const notes = "Use this as a quiet final slide.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide id="__SLIDE_ID__" className="op-slide-page op-source-deck-slide op-template-qed">
      <Frame
        frameKey="canvas"
        chrome={false}
        className="op-source-deck-canvas relative h-full w-full overflow-hidden"
      >
        <Text
          as="p"
          label="date"
          box={{ x: 100, y: 80 }}
          className="op-source-deck-date"
        >
          26 JUNE 2024
        </Text>
        <Text
          as="h1"
          label="mark"
          box={{ x: 0, y: 492, w: 1920 }}
          className="op-source-deck-mark"
        >
          Q. E. D.
        </Text>
      </Frame>
    </Slide>
  );
}
