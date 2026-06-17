import { Frame, Line, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "checklist",
  description: "Section copy with a checklist rail.",
  keypoints: ["Replace the section copy", "Replace checklist items"],
} satisfies SlideMeta;

export const notes = "Use this for review, readiness, or implementation status slides.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide id="__SLIDE_ID__" className="op-slide-page op-source-deck-slide op-template-checklist op-template-section">
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
          box={{ x: 100, y: 360, w: 760 }}
          className="op-source-deck-title"
        >
          A triangle whose three sides are equal, is said to be equilateral.
        </Text>
        <Text
          as="p"
          label="body"
          box={{ x: 100, y: 640, w: 760 }}
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
          frameKey="checklist"
          box={{ x: 1060, y: 420, w: 520 }}
          className="op-source-deck-checklist"
          layout={{ mode: "stack", direction: "vertical", gap: 24, width: "fill", height: "hug" }}
        >
          <Frame frameKey="check-1" className="op-source-deck-check-row is-complete">
            <Text as="span" label="check-1-icon" className="op-source-deck-check-icon">&#10003;</Text>
            <Text as="p" label="check-1-label">Check list item 1</Text>
          </Frame>
          <Frame frameKey="check-2" className="op-source-deck-check-row is-complete">
            <Text as="span" label="check-2-icon" className="op-source-deck-check-icon">&#10003;</Text>
            <Text as="p" label="check-2-label">Check list item 2</Text>
          </Frame>
          <Frame frameKey="check-3" className="op-source-deck-check-row">
            <Text as="span" label="check-3-icon" className="op-source-deck-check-icon"></Text>
            <Text as="p" label="check-3-label">Check list item 3</Text>
          </Frame>
          <Frame frameKey="check-4" className="op-source-deck-check-row">
            <Text as="span" label="check-4-icon" className="op-source-deck-check-icon"></Text>
            <Text as="p" label="check-4-label">Check list item 4</Text>
          </Frame>
          <Frame frameKey="check-5" className="op-source-deck-check-row">
            <Text as="span" label="check-5-icon" className="op-source-deck-check-icon"></Text>
            <Text as="p" label="check-5-label">Check list item 5</Text>
          </Frame>
        </Frame>
      </Frame>
    </Slide>
  );
}
