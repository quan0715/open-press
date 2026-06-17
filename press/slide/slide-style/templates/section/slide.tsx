import { Frame, Line, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "section",
  description: "Section slide with title and long description.",
  keypoints: ["Replace the section label", "Replace the title", "Replace the body"],
} satisfies SlideMeta;

export const notes = "Use this for a section opener or text-heavy setup slide.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide id="__SLIDE_ID__" className="op-slide-page op-source-deck-slide op-template-section">
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
          box={{ x: 100, y: 297, w: 840 }}
          className="op-source-deck-title"
        >
          Ratio is the relation which one quantity bears to another of the same kind.
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
        <Frame
          frameKey="right-pane"
          className="op-source-deck-two-col op-source-deck-right-pane"
          box={{ x: 960, y: 0, w: 960, h: 1080 }}
        />
      </Frame>
    </Slide>
  );
}
