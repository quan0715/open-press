import { Frame, Line, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "cover",
  description: "Euclid-style cover with date, large serif title, and red rule.",
  keypoints: ["Replace the date", "Replace the cover title"],
} satisfies SlideMeta;

export const notes =
  "Use this as the opening slide for a sparse source-deck style presentation.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide id="__SLIDE_ID__" className="op-slide-page op-source-deck-slide op-template-cover">
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
          label="title"
          box={{ x: 100, y: 360, w: 1155 }}
          className="op-source-deck-title"
        >
          A line is length without breadth.
        </Text>
        <Line label="red-rule" box={{ x: 100, y: 774, w: 270, h: 4 }} className="op-source-deck-red-rule" />
      </Frame>
    </Slide>
  );
}
