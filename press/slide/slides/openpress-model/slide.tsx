import { Frame, Line, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "metrics",
  description: "Introduces OpenPress as a source-backed presentation model.",
  keypoints: [
    "Press is the ordered deck",
    "Slide folders own source",
    "Templates and render output keep work consistent"
  ],
} satisfies SlideMeta;

export const notes = "Use this to teach the three nouns agents need to understand before editing the deck.";

export default function OpenPressModelSlide() {
  return (
    <Slide id="openpress-model" className="op-slide-page op-source-deck-slide op-template-metrics op-template-section">
      <Frame frameKey="canvas" chrome={false} className="op-source-deck-canvas relative h-full w-full overflow-hidden">
        <Text as="p" label="Model label" box={{ x: 100, y: 80 }} className="op-source-deck-label">
          OpenPress model
        </Text>
        <Text as="h1" label="Model title" box={{ x: 100, y: 350, w: 760 }} className="op-source-deck-title">
          A deck is source code with a render contract.
        </Text>
        <Text as="p" label="Model body" box={{ x: 100, y: 650, w: 760 }} className="op-source-deck-body">
          Agents edit TypeScript slide source. OpenPress owns discovery, validation, preview, and export.
        </Text>
        <Line label="Model divider" box={{ x: 960, y: 0, w: 3, h: 1080 }} className="op-source-deck-divider" />
        <Frame
          frameKey="model-metrics"
          box={{ x: 1060, y: 290, w: 650 }}
          className="op-source-deck-metric-list"
          layout={{ mode: "stack", direction: "vertical", gap: 60, width: "fill", height: "hug" }}
        >
          <Frame frameKey="model-press" className="op-source-deck-metric">
            <Text as="p" label="Press value" className="op-source-deck-metric-value">Press</Text>
            <Text as="p" label="Press label" className="op-source-deck-metric-label">The ordered deck index in `press/slide/press.tsx`.</Text>
          </Frame>
          <Frame frameKey="model-slide" className="op-source-deck-metric">
            <Text as="p" label="Slide value" className="op-source-deck-metric-value">Slide</Text>
            <Text as="p" label="Slide label" className="op-source-deck-metric-label">A folder with JSX, metadata, notes, and local assets.</Text>
          </Frame>
          <Frame frameKey="model-output" className="op-source-deck-metric">
            <Text as="p" label="Output value" className="op-source-deck-metric-value">Render</Text>
            <Text as="p" label="Output label" className="op-source-deck-metric-label">Validated HTML, thumbnails, image/PDF export, and deployable files.</Text>
          </Frame>
        </Frame>
      </Frame>
    </Slide>
  );
}
