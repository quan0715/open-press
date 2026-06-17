import { Frame, Line, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "section",
  description: "Step 3 creates a slide-by-slide outline before drafting JSX.",
  keypoints: [
    "Plan slide IDs and narrative order",
    "Assign templates intentionally",
    "Confirm before writing the deck"
  ],
} satisfies SlideMeta;

export const notes = "Keep this step as planning, not implementation. It prevents wasted slide edits.";

export default function StepOutlineSlide() {
  return (
    <Slide id="step-outline" className="op-slide-page op-source-deck-slide op-template-section">
      <Frame frameKey="canvas" chrome={false} className="op-source-deck-canvas relative h-full w-full overflow-hidden">
        <Text as="p" label="Outline label" box={{ x: 100, y: 80 }} className="op-source-deck-label">
          Step 3 · Outline
        </Text>
        <Text as="h1" label="Outline title" box={{ x: 100, y: 300, w: 820 }} className="op-source-deck-title">
          Generate the slide plan before writing slides.
        </Text>
        <Text as="p" label="Outline prompt label" box={{ x: 100, y: 585 }} className="op-source-deck-label">
          Example prompt
        </Text>
        <Text as="blockquote" label="Outline prompt" box={{ x: 100, y: 645, w: 820 }} className="op-source-deck-prompt-quote">
          Produce a slide-by-slide outline with IDs, template choices, slide goal, user input required, and expected deliverable.
        </Text>
        <Line label="Outline divider" box={{ x: 960, y: 0, w: 3, h: 1080 }} className="op-source-deck-divider" />
        <Frame frameKey="outline-right-pane" className="op-source-deck-two-col op-source-deck-right-pane" box={{ x: 960, y: 0, w: 960, h: 1080 }}>
          <Frame frameKey="outline-panel" box={{ x: 100, y: 300, w: 660, h: 420 }} className="op-source-deck-panel-fill p-[36px]">
            <Text as="p" label="Outline panel label" className="op-source-deck-label">
              Expected output
            </Text>
            <Text as="p" label="Outline panel body" className="op-source-deck-body mt-[46px] text-[var(--op-slide-color-ink)]">
              Deliverable: an approved outline with slide IDs, order, template family, content intent, and review criteria.
            </Text>
            <Text as="p" label="Outline checkpoint" className="op-source-deck-body mt-[40px] text-[var(--op-slide-color-muted)]">
              Checkpoint: no JSX changes until the outline is accepted.
            </Text>
          </Frame>
        </Frame>
      </Frame>
    </Slide>
  );
}
