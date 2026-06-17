import { Frame, Line, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "pros-cons",
  description: "Two-column pros and cons list.",
  keypoints: ["Replace the pros", "Replace the cons"],
} satisfies SlideMeta;

export const notes = "Use this for tradeoff, comparison, or decision framing slides.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide id="__SLIDE_ID__" className="op-slide-page op-source-deck-slide op-template-pros-cons">
      <Frame
        frameKey="canvas"
        chrome={false}
        className="op-source-deck-canvas relative h-full w-full overflow-hidden"
      >
        <Frame frameKey="pros" box={{ x: 100, y: 80, w: 760, h: 900 }} className="op-source-deck-list-pane">
          <Text as="p" label="pros-label" box={{ x: 0, y: 0 }} className="op-source-deck-status-label op-source-deck-status-pros">
            Pros
          </Text>
          <Frame
            frameKey="pros-list"
            box={{ x: 0, y: 350, w: 520 }}
            className="op-source-deck-number-list"
            layout={{ mode: "stack", direction: "vertical", gap: 36, width: "fill", height: "hug" }}
          >
            <Text as="p" label="pros-1">1. First point</Text>
            <Text as="p" label="pros-2">2. Second point</Text>
            <Text as="p" label="pros-3">3. Third point</Text>
            <Text as="p" label="pros-4">4. Fourth point</Text>
          </Frame>
        </Frame>
        <Line
          label="divider"
          box={{ x: 960, y: 0, w: 3, h: 1080 }}
          className="op-source-deck-divider"
        />
        <Frame frameKey="cons" box={{ x: 1060, y: 80, w: 760, h: 900 }} className="op-source-deck-list-pane">
          <Text as="p" label="cons-label" box={{ x: 0, y: 0 }} className="op-source-deck-status-label op-source-deck-status-cons">
            Cons
          </Text>
          <Frame
            frameKey="cons-list"
            box={{ x: 0, y: 350, w: 520 }}
            className="op-source-deck-number-list"
            layout={{ mode: "stack", direction: "vertical", gap: 36, width: "fill", height: "hug" }}
          >
            <Text as="p" label="cons-1">1. First point</Text>
            <Text as="p" label="cons-2">2. Second point</Text>
            <Text as="p" label="cons-3">3. Third point</Text>
            <Text as="p" label="cons-4">4. Fourth point</Text>
          </Frame>
        </Frame>
      </Frame>
    </Slide>
  );
}
