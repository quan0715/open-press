import { Frame, Line, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "checklist",
  description: "Step 6 reviews the deck in workspace and edits source from feedback.",
  keypoints: [
    "Review content and structure",
    "Use workspace preview",
    "Edit source, not generated output"
  ],
} satisfies SlideMeta;

export const notes = "Make the review loop concrete: preview, inspect, edit source, rebuild.";

export default function StepReviewSlide() {
  return (
    <Slide id="step-review" className="op-slide-page op-source-deck-slide op-template-checklist op-template-section">
      <Frame frameKey="canvas" chrome={false} className="op-source-deck-canvas relative h-full w-full overflow-hidden">
        <Text as="p" label="Review label" box={{ x: 100, y: 80 }} className="op-source-deck-label">
          Step 6 · Review
        </Text>
        <Text as="h1" label="Review title" box={{ x: 100, y: 350, w: 760 }} className="op-source-deck-title">
          Review the deck where it will actually render.
        </Text>
        <Text as="p" label="Review prompt label" box={{ x: 100, y: 610 }} className="op-source-deck-label">
          Example prompt
        </Text>
        <Text as="blockquote" label="Review prompt" box={{ x: 100, y: 670, w: 760 }} className="op-source-deck-prompt-quote">
          Review `/slide` page by page. List content fixes, layout issues, missing evidence, and exact source files to edit.
        </Text>
        <Line label="Review divider" box={{ x: 960, y: 0, w: 3, h: 1080 }} className="op-source-deck-divider" />
        <Frame
          frameKey="review-checklist"
          box={{ x: 1060, y: 330, w: 620 }}
          className="op-source-deck-checklist"
          layout={{ mode: "stack", direction: "vertical", gap: 32, width: "fill", height: "hug" }}
        >
          <Frame frameKey="review-meaning" className="op-source-deck-check-row is-complete">
            <Text as="span" label="Meaning icon" className="op-source-deck-check-icon">&#10003;</Text>
            <Text as="p" label="Meaning text">User checks meaning, tone, and audience fit.</Text>
          </Frame>
          <Frame frameKey="review-agent" className="op-source-deck-check-row is-complete">
            <Text as="span" label="Agent review icon" className="op-source-deck-check-icon">&#10003;</Text>
            <Text as="p" label="Agent review text">Agent edits only source files under `press/slide`.</Text>
          </Frame>
          <Frame frameKey="review-openpress" className="op-source-deck-check-row is-complete">
            <Text as="span" label="OpenPress review icon" className="op-source-deck-check-icon">&#10003;</Text>
            <Text as="p" label="OpenPress review text">OpenPress regenerates preview after source changes.</Text>
          </Frame>
          <Frame frameKey="review-deliverable" className="op-source-deck-check-row is-complete">
            <Text as="span" label="Review deliverable icon" className="op-source-deck-check-icon">&#10003;</Text>
            <Text as="p" label="Review deliverable text">Deliverable: reviewed source diff and issue list.</Text>
          </Frame>
        </Frame>
      </Frame>
    </Slide>
  );
}
