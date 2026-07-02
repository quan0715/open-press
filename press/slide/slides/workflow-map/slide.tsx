import { Frame, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "timeline",
  description: "Maps the end-to-end workflow from user brief to final delivery.",
  keypoints: [
    "Brief first",
    "Then scaffold, outline, draft, review, validate",
    "Delivery is source plus rendered output"
  ],
} satisfies SlideMeta;

export const notes = "Preview the steps covered in the rest of the deck.";

export default function WorkflowMapSlide() {
  return (
    <Slide id="workflow-map" className="op-slide-page op-source-deck-slide op-template-timeline">
      <Frame frameKey="canvas" chrome={false} className="op-source-deck-canvas relative h-full w-full overflow-hidden">
        <Text as="p" label="Workflow label" box={{ x: 100, y: 80 }} className="op-source-deck-label">
          Workflow map
        </Text>
        <Text as="p" label="Workflow body" box={{ x: 100, y: 170, w: 1180 }} className="op-source-deck-body">
          The loop starts with user intent and ends with verified deliverables. Each step has a prompt, expected output, and quality checkpoint.
        </Text>
        <Frame frameKey="timeline" box={{ x: 100, y: 390, w: 1720, h: 470 }} className="op-source-deck-timeline">
          <Text as="p" label="Stage one label" box={{ x: 0, y: 0 }} className="op-source-deck-month">
            Intent
          </Text>
          <Text as="p" label="Stage two label" box={{ x: 1110, y: 0 }} className="op-source-deck-month">
            Delivery
          </Text>
          <Frame frameKey="bar-brief" box={{ x: 0, y: 86, w: 360, h: 58 }} className="op-source-deck-bar op-source-deck-bar-blue">
            <Text as="p" label="Brief bar">Brief</Text>
          </Frame>
          <Frame frameKey="bar-scaffold" box={{ x: 380, y: 86, w: 360, h: 58 }} className="op-source-deck-bar op-source-deck-bar-blue">
            <Text as="p" label="Scaffold bar">Scaffold</Text>
          </Frame>
          <Frame frameKey="bar-outline" box={{ x: 760, y: 86, w: 360, h: 58 }} className="op-source-deck-bar op-source-deck-bar-blue">
            <Text as="p" label="Outline bar">Outline</Text>
          </Frame>
          <Frame frameKey="bar-draft" box={{ x: 1140, y: 86, w: 580, h: 58 }} className="op-source-deck-bar op-source-deck-bar-blue">
            <Text as="p" label="Draft bar">Draft slides</Text>
          </Frame>
          <Frame frameKey="bar-assets" box={{ x: 380, y: 176, w: 420, h: 58 }} className="op-source-deck-bar op-source-deck-bar-gold">
            <Text as="p" label="Assets bar">Assets</Text>
          </Frame>
          <Frame frameKey="bar-review" box={{ x: 820, y: 176, w: 420, h: 58 }} className="op-source-deck-bar op-source-deck-bar-gold">
            <Text as="p" label="Review bar">Review</Text>
          </Frame>
          <Frame frameKey="bar-validate" box={{ x: 1260, y: 176, w: 460, h: 58 }} className="op-source-deck-bar op-source-deck-bar-gold">
            <Text as="p" label="Validate bar">Validate</Text>
          </Frame>
          <Frame frameKey="bar-deliver" box={{ x: 820, y: 266, w: 900, h: 58 }} className="op-source-deck-bar op-source-deck-bar-red">
            <Text as="p" label="Deliver bar">Source + preview + export</Text>
          </Frame>
        </Frame>
      </Frame>
    </Slide>
  );
}
