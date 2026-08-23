import { Frame, Line, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "metrics",
  description: "Step 4 drafts slide source one directly editable composition at a time.",
  keypoints: [
    "Write JSX in slide folders",
    "Use semantic classes and Press-local UI",
    "Keep content inspectable"
  ],
} satisfies SlideMeta;

export const notes = "This is where the Agent writes the first real version of the deck.";

export default function StepDraftSlide() {
  return (
    <Slide id="step-draft" className="op-slide-page op-source-deck-slide op-template-metrics op-template-section">
      <Frame frameKey="canvas" chrome={false} className="op-source-deck-canvas relative h-full w-full overflow-hidden">
        <Text as="p" label="Draft label" box={{ x: 100, y: 80 }} className="op-source-deck-label">
          Step 4 · Draft
        </Text>
        <Text as="h1" label="Draft title" box={{ x: 100, y: 350, w: 760 }} className="op-source-deck-title">
          Draft slides in source, one folder at a time.
        </Text>
        <Text as="p" label="Draft prompt label" box={{ x: 100, y: 610 }} className="op-source-deck-label">
          Example prompt
        </Text>
        <Text as="blockquote" label="Draft prompt" box={{ x: 100, y: 670, w: 760 }} className="op-source-deck-prompt-quote">
          Implement the approved outline directly in `press/slide/slides/*/slide.tsx`. Keep one-off composition in the slide source.
        </Text>
        <Line label="Draft divider" box={{ x: 960, y: 0, w: 3, h: 1080 }} className="op-source-deck-divider" />
        <Frame
          frameKey="draft-metrics"
          box={{ x: 1060, y: 300, w: 650 }}
          className="op-source-deck-metric-list"
          layout={{ mode: "stack", direction: "vertical", gap: 58, width: "fill", height: "hug" }}
        >
          <Frame frameKey="draft-user" className="op-source-deck-metric">
            <Text as="p" label="Draft user value" className="op-source-deck-metric-value">input</Text>
            <Text as="p" label="Draft user label" className="op-source-deck-metric-label">Approved outline, source material, and constraints.</Text>
          </Frame>
          <Frame frameKey="draft-agent" className="op-source-deck-metric">
            <Text as="p" label="Draft agent value" className="op-source-deck-metric-value">source</Text>
            <Text as="p" label="Draft agent label" className="op-source-deck-metric-label">Agent writes JSX, metadata, notes, and editable text regions.</Text>
          </Frame>
          <Frame frameKey="draft-check" className="op-source-deck-metric">
            <Text as="p" label="Draft check value" className="op-source-deck-metric-value">check</Text>
            <Text as="p" label="Draft check label" className="op-source-deck-metric-label">Every slide root uses a clear, Press-local layout class.</Text>
          </Frame>
        </Frame>
      </Frame>
    </Slide>
  );
}
