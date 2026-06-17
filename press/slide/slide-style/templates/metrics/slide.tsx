import { Frame, Line, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "metrics",
  description: "Section copy with three large numeric callouts.",
  keypoints: ["Replace the section copy", "Replace metric values and labels"],
} satisfies SlideMeta;

export const notes = "Use this when a narrative point needs a compact metric rail.";

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide id="__SLIDE_ID__" className="op-slide-page op-source-deck-slide op-template-metrics op-template-section">
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
          box={{ x: 100, y: 402, w: 760 }}
          className="op-source-deck-title"
        >
          The extremities of a surface are lines.
        </Text>
        <Text
          as="p"
          label="body"
          box={{ x: 100, y: 625, w: 760 }}
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
          frameKey="metrics"
          box={{ x: 1060, y: 315, w: 640 }}
          className="op-source-deck-metric-list"
          layout={{ mode: "stack", direction: "vertical", gap: 66, width: "fill", height: "hug" }}
        >
          <Frame frameKey="metric-a" className="op-source-deck-metric">
            <Text as="p" label="metric-a-value" className="op-source-deck-metric-value">+330K</Text>
            <Text as="p" label="metric-a-label" className="op-source-deck-metric-label">Metric details and caveats</Text>
          </Frame>
          <Frame frameKey="metric-b" className="op-source-deck-metric">
            <Text as="p" label="metric-b-value" className="op-source-deck-metric-value">+103%</Text>
            <Text as="p" label="metric-b-label" className="op-source-deck-metric-label">Metric details and caveats</Text>
          </Frame>
          <Frame frameKey="metric-c" className="op-source-deck-metric">
            <Text as="p" label="metric-c-value" className="op-source-deck-metric-value">-18%</Text>
            <Text as="p" label="metric-c-label" className="op-source-deck-metric-label">Metric details and caveats</Text>
          </Frame>
        </Frame>
      </Frame>
    </Slide>
  );
}
